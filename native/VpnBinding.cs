using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Threading;
using System.Threading.Tasks;

namespace Baran {
  // IPv4-only bound HTTP transport, including DNS. Never fall back to system DNS.
  // External media tools and aria2 are refused in this mode until they can use it too.
  public sealed class VpnBinding : IDisposable {
    readonly StateStore store;
    readonly HashSet<TcpClient> sockets = new HashSet<TcpClient>();
    readonly Timer timer;
    string active = "";
    public VpnBinding(StateStore state) { store = state; timer = new Timer(_ => Check(), null, 250, 250); }
    public bool Enabled { get { return J.Str(store.Settings, "vpnInterfaceId").Length > 0; } }
    public static object[] Interfaces() {
      return NetworkInterface.GetAllNetworkInterfaces().Where(n => n.NetworkInterfaceType != NetworkInterfaceType.Loopback).Select(n => J.Obj("id", n.Id, "name", n.Name, "description", n.Description, "up", n.OperationalStatus == OperationalStatus.Up, "addresses", n.GetIPProperties().UnicastAddresses.Where(a => a.Address.AddressFamily == AddressFamily.InterNetwork).Select(a => a.Address.ToString()).ToArray())).Cast<object>().ToArray();
    }
    NetworkInterface Selected() {
      var nic = NetworkInterface.GetAllNetworkInterfaces().FirstOrDefault(n => n.Id == J.Str(store.Settings, "vpnInterfaceId") && n.OperationalStatus == OperationalStatus.Up);
      if (nic == null) throw new IOException("Selected VPN/interface is disconnected. HTTP traffic is blocked."); return nic;
    }
    string Identity() {
      var nic = Selected(); var ip = nic.GetIPProperties().UnicastAddresses.FirstOrDefault(a => a.Address.AddressFamily == AddressFamily.InterNetwork);
      if (ip == null) throw new IOException("Selected interface has no IPv4 address"); return nic.Id + ":" + ip.Address;
    }
    public void Ensure() { if (Enabled) Identity(); }
    void Check() {
      string now; try { now = Enabled ? Identity() : ""; } catch { now = "disconnected"; }
      lock (sockets) { if (active != now) { foreach (var client in sockets.ToArray()) client.Close(); sockets.Clear(); active = now; } }
    }
    void Bind(Socket socket) {
      var nic = Selected(); var properties = nic.GetIPProperties(); var local = properties.UnicastAddresses.First(a => a.Address.AddressFamily == AddressFamily.InterNetwork).Address;
      socket.SetSocketOption(SocketOptionLevel.IP, (SocketOptionName)31, IPAddress.HostToNetworkOrder(properties.GetIPv4Properties().Index));
      socket.Bind(new IPEndPoint(local, 0));
    }
    static int SkipName(byte[] data, int offset) {
      for (int count = 0; count < 128; count++) {
        if (offset >= data.Length) throw new IOException("Truncated DNS name");
        int n = data[offset++]; if (n == 0) return offset;
        if ((n & 192) == 192) { if (offset >= data.Length) throw new IOException("Truncated DNS pointer"); return offset + 1; }
        if (n > 63 || offset + n > data.Length) throw new IOException("Invalid DNS name"); offset += n;
      }
      throw new IOException("Invalid DNS name");
    }
    async Task<IPAddress[]> Resolve(string host, CancellationToken token) {
      IPAddress literal; if (IPAddress.TryParse(host, out literal)) { if (literal.AddressFamily != AddressFamily.InterNetwork) throw new IOException("VPN HTTP binding currently requires IPv4"); return new [] { literal }; }
      var servers = Selected().GetIPProperties().DnsAddresses.Where(a => a.AddressFamily == AddressFamily.InterNetwork).Take(3).ToArray();
      if (servers.Length == 0) throw new IOException("Selected interface has no IPv4 DNS server; no fallback is allowed");
      var id = new byte[2]; using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create()) rng.GetBytes(id);
      var query = new List<byte> { id[0], id[1], 1, 0, 0, 1, 0, 0, 0, 0, 0, 0 };
      foreach (string label in host.TrimEnd('.').Split('.')) { byte[] bytes = System.Text.Encoding.ASCII.GetBytes(label); if (bytes.Length == 0 || bytes.Length > 63) throw new IOException("Invalid DNS hostname"); query.Add((byte)bytes.Length); query.AddRange(bytes); }
      query.AddRange(new byte[] { 0, 0, 1, 0, 1 });
      foreach (var server in servers) {
        using (var udp = new UdpClient(AddressFamily.InterNetwork))
        using (var deadline = CancellationTokenSource.CreateLinkedTokenSource(token)) {
          deadline.CancelAfter(3000); Bind(udp.Client); udp.Connect(server, 53);
          using (deadline.Token.Register(udp.Close)) try {
            await udp.SendAsync(query.ToArray(), query.Count).ConfigureAwait(false);
            var result = await udp.ReceiveAsync().ConfigureAwait(false); byte[] data = result.Buffer;
            if (data.Length < 12 || data[0] != id[0] || data[1] != id[1] || (data[2] & 128) == 0 || (data[2] & 2) != 0 || (data[3] & 15) != 0 || data[4] != 0 || data[5] != 1) throw new IOException("Invalid or truncated DNS response");
            int offset = SkipName(data, 12) + 4;
            if (offset != query.Count || !data.Skip(12).Take(offset-12).SequenceEqual(query.Skip(12))) throw new IOException("DNS response question does not match");
            int count = data[6] * 256 + data[7]; var answers = new List<IPAddress>();
            for (int i = 0; i < count; i++) {
              offset = SkipName(data, offset); if (offset + 10 > data.Length) throw new IOException("Truncated DNS answer");
              int type = data[offset] * 256 + data[offset+1], cls = data[offset+2] * 256 + data[offset+3], length = data[offset+8] * 256 + data[offset+9]; offset += 10;
              if (offset + length > data.Length) throw new IOException("Truncated DNS record");
              if (type == 1 && cls == 1 && length == 4) answers.Add(new IPAddress(data.Skip(offset).Take(4).ToArray())); offset += length;
            }
            if (answers.Count > 0) return answers.ToArray();
          } catch { token.ThrowIfCancellationRequested(); }
        }
      }
      throw new IOException("DNS resolution on the selected interface failed; HTTP traffic remains blocked");
    }
    public async Task<TcpClient> Connect(string host, int port, CancellationToken token) {
      Check(); Ensure(); var addresses = await Resolve(host, token).ConfigureAwait(false);
      foreach (var ip in addresses) {
        var client = new TcpClient(AddressFamily.InterNetwork);
        try {
          Bind(client.Client); lock (sockets) sockets.Add(client);
          using (token.Register(client.Close)) await client.ConnectAsync(ip, port).ConfigureAwait(false);
          Ensure(); return client;
        } catch { Release(client); token.ThrowIfCancellationRequested(); }
      }
      throw new IOException("Connection through the selected interface failed; no fallback is allowed");
    }
    public void Release(TcpClient client) { lock (sockets) sockets.Remove(client); client.Close(); }
    public void Dispose() { timer.Dispose(); lock (sockets) { foreach (var client in sockets) client.Close(); sockets.Clear(); } }
  }
}
