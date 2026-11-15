using System;
using System.IO;
using System.Net;
using System.Net.Security;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Baran {
  // .NET Framework's HTTP stack uses HTTP proxies. This private authenticated
  // adapter preserves SOCKS5/HTTPS proxy support without disabling TLS checks.
  public sealed class ProxyTunnel : IDisposable {
    readonly TcpListener listener;
    readonly Uri upstream;
    readonly VpnBinding binding;
    readonly string password = Guid.NewGuid().ToString("N");
    readonly CancellationTokenSource stop = new CancellationTokenSource();
    public readonly IWebProxy Proxy;
    public ProxyTunnel(Uri address, VpnBinding vpn = null) {
      upstream = address; binding = vpn; listener = new TcpListener(IPAddress.Loopback, 0); listener.Start();
      Proxy = new FixedProxy(new Uri("http://127.0.0.1:" + ((IPEndPoint)listener.LocalEndpoint).Port), new NetworkCredential("baran", password));
      Task.Run((Func<Task>)Accept);
    }
    async Task Accept() {
      while (!stop.IsCancellationRequested) {
        try { var client = await listener.AcceptTcpClientAsync().ConfigureAwait(false); StartForward(client); }
        catch { if (stop.IsCancellationRequested) break; }
      }
    }
    void StartForward(TcpClient client) { Task.Run(() => Forward(client)); }
    static async Task<byte[]> Exact(Stream stream, int length, CancellationToken token) {
      var bytes = new byte[length]; int offset = 0;
      while (offset < length) { int n = await stream.ReadAsync(bytes, offset, length - offset, token).ConfigureAwait(false); if (n == 0) throw new IOException("Proxy closed"); offset += n; }
      return bytes;
    }
    async Task Forward(TcpClient browser) {
      using (browser)
      using (var deadline = CancellationTokenSource.CreateLinkedTokenSource(stop.Token)) {
        deadline.CancelAfter(30000); var token = deadline.Token;
        using (token.Register(browser.Close)) try {
          var input = browser.GetStream(); var header = new MemoryStream();
          while (header.Length < 32768) {
            byte value = (await Exact(input, 1, token).ConfigureAwait(false))[0]; header.WriteByte(value);
            byte[] bytes = header.GetBuffer(); int n = (int)header.Length;
            if (n >= 4 && bytes[n-4] == 13 && bytes[n-3] == 10 && bytes[n-2] == 13 && bytes[n-1] == 10) break;
          }
          string text = Encoding.ASCII.GetString(header.ToArray());
          string auth = "Proxy-Authorization: Basic " + Convert.ToBase64String(Encoding.ASCII.GetBytes("baran:" + password));
          if (text.IndexOf(auth, StringComparison.OrdinalIgnoreCase) < 0) {
            byte[] challenge = Encoding.ASCII.GetBytes("HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm=\"Baran\"\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
            await input.WriteAsync(challenge, 0, challenge.Length, token).ConfigureAwait(false); return;
          }
          string[] lines = text.Split(new [] { "\r\n" }, StringSplitOptions.None);
          string[] first = lines[0].Split(' '); bool connect = first[0] == "CONNECT";
          Uri destination = connect ? new Uri("https://" + first[1]) : J.Url(first[1]);
          var connected = binding == null ? new TcpClient() : await binding.Connect(destination.DnsSafeHost, destination.Port, token).ConfigureAwait(false);
          try {
          using (var remote = connected) {
            using (token.Register(remote.Close)) {
              if (binding == null) await remote.ConnectAsync(upstream.Host, upstream.IsDefaultPort ? (upstream.Scheme == "https" ? 443 : 1080) : upstream.Port).ConfigureAwait(false);
              Stream output = remote.GetStream();
              if (binding != null) {
                if (connect) { byte[] ok = Encoding.ASCII.GetBytes("HTTP/1.1 200 Connection Established\r\n\r\n"); await input.WriteAsync(ok, 0, ok.Length, token).ConfigureAwait(false); }
                else {
                  lines[0] = first[0] + " " + destination.PathAndQuery + " " + first[2];
                  string requestText = System.Text.RegularExpressions.Regex.Replace(String.Join("\r\n", lines), "^Proxy-(Authorization|Connection):[^\r\n]*\r\n", "", System.Text.RegularExpressions.RegexOptions.Multiline | System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                  byte[] request = Encoding.ASCII.GetBytes(requestText); await output.WriteAsync(request, 0, request.Length, token).ConfigureAwait(false);
                }
              } else if (upstream.Scheme == "https") {
                var ssl = new SslStream(output, false); await ssl.AuthenticateAsClientAsync(upstream.Host).ConfigureAwait(false); output = ssl;
                // Forward the proxy request through TLS, removing local credentials.
                text = System.Text.RegularExpressions.Regex.Replace(text, "^Proxy-Authorization:[^\r\n]*\r\n", "", System.Text.RegularExpressions.RegexOptions.Multiline | System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                byte[] request = Encoding.ASCII.GetBytes(text); await output.WriteAsync(request, 0, request.Length, token).ConfigureAwait(false);
              } else {
                await output.WriteAsync(new byte[] { 5, 1, 0 }, 0, 3, token).ConfigureAwait(false);
                var hello = await Exact(output, 2, token).ConfigureAwait(false);
                if (hello[0] != 5 || hello[1] != 0) throw new IOException("SOCKS proxy requires unsupported authentication");
                byte[] host;
                if (upstream.Scheme == "socks5") {
                  var addresses = await Dns.GetHostAddressesAsync(destination.Host).ConfigureAwait(false);
                  host = addresses[0].GetAddressBytes();
                } else host = Encoding.UTF8.GetBytes(destination.DnsSafeHost);
                using (var command = new MemoryStream()) {
                  command.Write(new byte[] { 5, 1, 0 }, 0, 3);
                  if (upstream.Scheme == "socks5h") { if (host.Length > 255) throw new IOException("Hostname too long"); command.WriteByte(3); command.WriteByte((byte)host.Length); }
                  else command.WriteByte((byte)(host.Length == 4 ? 1 : 4));
                  command.Write(host, 0, host.Length); command.WriteByte((byte)(destination.Port >> 8)); command.WriteByte((byte)destination.Port);
                  byte[] data = command.ToArray(); await output.WriteAsync(data, 0, data.Length, token).ConfigureAwait(false);
                }
                var reply = await Exact(output, 4, token).ConfigureAwait(false);
                if (reply[0] != 5 || reply[1] != 0) throw new IOException("SOCKS connection refused");
                int count = reply[3] == 1 ? 4 : reply[3] == 4 ? 16 : reply[3] == 3 ? (await Exact(output, 1, token).ConfigureAwait(false))[0] : 0;
                if (count == 0) throw new IOException("Invalid SOCKS reply");
                await Exact(output, count + 2, token).ConfigureAwait(false);
                byte[] request;
                if (connect) request = Encoding.ASCII.GetBytes("HTTP/1.1 200 Connection Established\r\n\r\n");
                else {
                  lines[0] = first[0] + " " + destination.PathAndQuery + " " + first[2];
                  text = String.Join("\r\n", lines);
                  text = System.Text.RegularExpressions.Regex.Replace(text, "^Proxy-(Authorization|Connection):[^\r\n]*\r\n", "", System.Text.RegularExpressions.RegexOptions.Multiline | System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                  request = Encoding.ASCII.GetBytes(text);
                }
                if (connect) await input.WriteAsync(request, 0, request.Length, token).ConfigureAwait(false);
                else await output.WriteAsync(request, 0, request.Length, token).ConfigureAwait(false);
              }
              deadline.CancelAfter(Timeout.Infinite);
              await Task.WhenAny(input.CopyToAsync(output, 32768, token), output.CopyToAsync(input, 32768, token)).ConfigureAwait(false);
              deadline.Cancel();
            }
          }
          } finally { if (binding != null) binding.Release(connected); }
        } catch { /* Request receives a normal proxy connection failure. */ }
      }
    }
    public void Dispose() { stop.Cancel(); listener.Stop(); stop.Dispose(); }
  }
}
