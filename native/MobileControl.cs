using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Baran {
  // A small, separately scoped LAN API. No desktop RPC forwarding, cookies or file access.
  public sealed class MobileControl : IDisposable {
    readonly Core core;
    readonly string page;
    TcpListener listener;
    CancellationTokenSource stop;
    string token = "", host = "";
    readonly SemaphoreSlim clients = new SemaphoreSlim(8, 8);
    public MobileControl(Core app, string root) { core = app; page = Path.Combine(root, "mobile.html"); }
    public static bool Private(IPAddress ip) {
      byte[] b = ip.GetAddressBytes(); return b.Length == 4 && (b[0] == 10 || (b[0] == 172 && b[1] >= 16 && b[1] <= 31) || (b[0] == 192 && b[1] == 168));
    }
    public static object[] Addresses() { return NetworkInterface.GetAllNetworkInterfaces().Where(n => n.OperationalStatus == OperationalStatus.Up).SelectMany(n => n.GetIPProperties().UnicastAddresses).Select(a => a.Address).Where(Private).Distinct().Select(a => (object)a.ToString()).ToArray(); }
    public object Status(bool pairing = false) { return J.Obj("running", listener != null, "url", host.Length > 0 ? "http://" + host + "/" : "", "token", pairing ? token : "", "addresses", Addresses()); }
    public object Start(string address, bool testing) {
      IPAddress ip; if (!IPAddress.TryParse(address, out ip) || !(Private(ip) || (testing && IPAddress.IsLoopback(ip)))) throw new Exception("Choose a private IPv4 address on this computer");
      if (!testing && !Addresses().Select(Convert.ToString).Contains(address)) throw new Exception("Address is not assigned to a connected private interface");
      Dispose();
      var secret = new byte[32]; using (var rng = RandomNumberGenerator.Create()) rng.GetBytes(secret); token = Convert.ToBase64String(secret);
      listener = new TcpListener(ip, 0); listener.Start(16); host = ip + ":" + ((IPEndPoint)listener.LocalEndpoint).Port;
      stop = new CancellationTokenSource(); var server = listener; var cancellation = stop.Token;
      Task.Run(async () => {
        while (!cancellation.IsCancellationRequested) try {
          var client = await server.AcceptTcpClientAsync().ConfigureAwait(false);
          if (!clients.Wait(0)) { client.Close(); continue; }
          Serve(client, cancellation);
        } catch { if (cancellation.IsCancellationRequested) break; }
      });
      return Status(true);
    }
    async void Serve(TcpClient client, CancellationToken cancellation) {
      try {
      using (client)
      using (var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellation)) {
        deadline.CancelAfter(10000);
        using (deadline.Token.Register(client.Close)) try {
          if (!Private(((IPEndPoint)client.Client.RemoteEndPoint).Address) && !IPAddress.IsLoopback(((IPEndPoint)client.Client.RemoteEndPoint).Address)) return;
          var stream = client.GetStream(); var bytes = new List<byte>(); var one = new byte[1];
          while (bytes.Count < 8192) {
            if (await stream.ReadAsync(one, 0, 1, deadline.Token).ConfigureAwait(false) == 0) return;
            bytes.Add(one[0]); int n = bytes.Count; if (n >= 4 && bytes[n-4] == 13 && bytes[n-3] == 10 && bytes[n-2] == 13 && bytes[n-1] == 10) break;
          }
          string[] lines = Encoding.ASCII.GetString(bytes.ToArray()).Split(new [] { "\r\n" }, StringSplitOptions.None);
          string[] first = lines[0].Split(' '); if (first.Length != 3) return;
          var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
          foreach (string line in lines.Skip(1).Where(line => line.Length > 0)) { int split = line.IndexOf(':'); if (split <= 0 || headers.ContainsKey(line.Substring(0, split))) return; headers[line.Substring(0, split)] = line.Substring(split+1).Trim(); }
          string value;
          if (!headers.TryGetValue("Host", out value) || value != host || headers.ContainsKey("Transfer-Encoding")) { await Reply(stream, 403, "application/json", "{}"); return; }
          if (headers.TryGetValue("Origin", out value) && value != "http://" + host) { await Reply(stream, 403, "application/json", "{}"); return; }
          if (first[0] == "GET" && first[1] == "/") { await Reply(stream, 200, "text/html; charset=utf-8", File.ReadAllText(page)); return; }
          if (!headers.TryGetValue("Authorization", out value) || !Equal(value, "Bearer " + token)) { await Reply(stream, 401, "application/json", "{\"error\":\"Pair with the token shown in Baran\"}"); return; }
          object result;
          if (first[0] == "GET" && first[1] == "/api/status") result = core.MobileSnapshot();
          else if (first[0] == "POST" && first[1] == "/api/command") {
            int length; if (!headers.TryGetValue("Content-Length", out value) || !Int32.TryParse(value, out length) || length < 1 || length > 16384 || !headers.TryGetValue("Content-Type", out value) || !value.StartsWith("application/json", StringComparison.OrdinalIgnoreCase)) { await Reply(stream, 400, "application/json", "{}"); return; }
            byte[] body = new byte[length]; int offset = 0; while (offset < length) { int count = await stream.ReadAsync(body, offset, length-offset, deadline.Token).ConfigureAwait(false); if (count == 0) return; offset += count; }
            var command = J.Decode(Encoding.UTF8.GetString(body)); string action = J.Str(command, "action");
            if (action == "collect") { string url = J.Url(J.Str(command, "url")).AbsoluteUri; core.Inbox.Add(new [] { url }, "Mobile"); result = J.Obj("ok", true); }
            else if (action == "pause") { await core.Pause(J.Str(command, "id")).ConfigureAwait(false); result = J.Obj("ok", true); }
            else if (action == "resume") { core.Resume(J.Str(command, "id")); result = J.Obj("ok", true); }
            else { await Reply(stream, 400, "application/json", "{\"error\":\"Unsupported command\"}"); return; }
          } else { await Reply(stream, 404, "application/json", "{}"); return; }
          await Reply(stream, 200, "application/json; charset=utf-8", J.Encode(result));
        } catch { try { Reply(client.GetStream(), 400, "application/json", "{\"error\":\"Command failed. Check Baran on the computer.\"}").GetAwaiter().GetResult(); } catch { } }
      }
      } catch { /* A revoked pairing session may close a client during setup. */ } finally { clients.Release(); }
    }
    static bool Equal(string left, string right) { int value = left.Length ^ right.Length; for (int i = 0; i < right.Length; i++) value |= (i < left.Length ? left[i] : 0) ^ right[i]; return value == 0; }
    static async Task Reply(Stream stream, int status, string type, string text) {
      byte[] body = Encoding.UTF8.GetBytes(text);
      byte[] header = Encoding.ASCII.GetBytes("HTTP/1.1 " + status + " Response\r\nContent-Type: " + type + "\r\nContent-Length: " + body.Length + "\r\nConnection: close\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nReferrer-Policy: no-referrer\r\nContent-Security-Policy: default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'\r\n\r\n");
      await stream.WriteAsync(header, 0, header.Length).ConfigureAwait(false); await stream.WriteAsync(body, 0, body.Length).ConfigureAwait(false);
    }
    public void Dispose() { if (stop != null) { stop.Cancel(); stop.Dispose(); stop = null; } if (listener != null) listener.Stop(); listener = null; token = ""; host = ""; }
  }
}
