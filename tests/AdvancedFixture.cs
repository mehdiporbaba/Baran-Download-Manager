using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Net.NetworkInformation;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Baran;

class AdvancedFixture {
  static void Assert(bool value, string label) { if (!value) throw new Exception(label); }
  static int Main(string[] args) { try { Run(args[0]).GetAwaiter().GetResult(); return 0; } catch (Exception e) { Console.Error.WriteLine(e); return 1; } }
  sealed class Exchange { public string Path, Body, Reply; public Exchange(string path, string body, string reply) { Path = path; Body = body; Reply = reply; } }
  static async Task Serve(TcpListener listener, string token, params Exchange[] exchanges) {
    foreach (var exchange in exchanges) using (var client = await listener.AcceptTcpClientAsync()) {
      var stream = client.GetStream(); byte[] one = new byte[1]; var text = new StringBuilder();
      while (!text.ToString().EndsWith("\r\n\r\n")) { Assert(text.Length < 16000 && await stream.ReadAsync(one, 0, 1) == 1, "Provider request header"); text.Append((char)one[0]); }
      string header = text.ToString(); Assert(header.StartsWith(exchange.Path), "Provider route: " + exchange.Path);
      Assert(header.Contains("Authorization: Bearer " + token), "Provider bearer token");
      int length = 0; var line = header.Split(new [] { "\r\n" }, StringSplitOptions.None).FirstOrDefault(row => row.StartsWith("Content-Length:", StringComparison.OrdinalIgnoreCase)); if (line != null) length = Int32.Parse(line.Split(':')[1]);
      byte[] body = new byte[length]; int offset = 0; while (offset < length) { int n = await stream.ReadAsync(body, offset, length-offset); Assert(n > 0, "Provider body"); offset += n; }
      if (exchange.Body != null) Assert(Encoding.UTF8.GetString(body) == exchange.Body, "Provider form preserves signed URL");
      byte[] bytes = Encoding.UTF8.GetBytes(exchange.Reply); byte[] response = Encoding.ASCII.GetBytes("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: " + bytes.Length + "\r\nConnection: close\r\n\r\n"); await stream.WriteAsync(response, 0, response.Length); await stream.WriteAsync(bytes, 0, bytes.Length);
    }
  }
  static async Task Run(string root) {
    var origins = BrowserRegistration.Origins(new string('a',32), new object[] { "chrome-extension://" + new string('b',32) + "/", "chrome-extension://" + new string('a',32) + "/", "https://untrusted.invalid/" });
    Assert(origins.Length == 2 && origins[1].Contains(new string('b',32)), "Repair preserves valid prior extension origins, removes duplicates and rejects web origins");
    Directory.CreateDirectory(root); var store = new StateStore(root);
    var server = new TcpListener(IPAddress.Loopback, 0); server.Start(); string endpoint = "http://127.0.0.1:" + ((IPEndPoint)server.LocalEndpoint).Port + "/";
    string token = "private-fixture-token", source = "https://example.com/a?sig=a%2Bb";
    var routes = DebridProviders.Ids.ToDictionary(id => id, id => endpoint);
    using (var network = new NativeNetwork(store)) try {
      var hub = new DebridProviders(root, network, routes);
      foreach (string id in DebridProviders.Ids) hub.Save(id, token);
      var work = Serve(server, token,
        new Exchange("POST /link/unlock ", "link=" + Uri.EscapeDataString(source), "{\"status\":\"success\",\"data\":{\"delayed\":42}}"),
        new Exchange("POST /link/delayed ", "id=42", "{\"status\":\"success\",\"data\":{\"status\":2,\"link\":\"https://cdn.example/a.zip\"}}"),
        new Exchange("POST /transfer/directdl ", "src=" + Uri.EscapeDataString(source), "{\"status\":\"success\",\"content\":[{\"link\":\"https://cdn.example/b.zip\",\"path\":\"folder/b.zip\",\"size\":99},{\"link\":\"https://cdn.example/c.zip\",\"path\":\"c.zip\",\"size\":100}]}"),
        new Exchange("POST /webdl/createwebdownload ", "link=" + Uri.EscapeDataString(source), "{\"success\":true,\"data\":{\"webdownload_id\":7}}"),
        new Exchange("GET /webdl/mylist?id=7 ", null, "{\"success\":true,\"data\":[{\"id\":7,\"download_finished\":false}]}"),
        new Exchange("GET /webdl/mylist?id=7 ", null, "{\"success\":true,\"data\":{\"id\":7,\"download_finished\":true,\"files\":[{\"id\":2,\"short_name\":\"d.zip\",\"size\":101}]}}"),
        new Exchange("GET /webdl/requestdl?token=" + token + "&web_id=7&file_id=2&redirect=false ", null, "{\"success\":true,\"data\":\"https://cdn.example/d.zip\"}")
      );
      Assert(J.Bool(await hub.Resolve("alldebrid", source), "pending"), "AllDebrid delayed status");
      hub = new DebridProviders(root, network, routes); Assert(J.Get(hub.Status().First(item => J.Str(item, "id") == "alldebrid"), "pending") != null, "Delayed job survives restart");
      Assert(J.List(J.Get(await hub.Resolve("alldebrid", "", true), "links")).Length == 1, "AllDebrid delayed ready");
      var files = J.List(J.Get(await hub.Resolve("premiumize", source), "links")); Assert(files.Length == 2 && J.Str(files[0], "fileName") == "b.zip", "Premiumize all files and safe names");
      Assert(J.Bool(await hub.Resolve("torbox", source), "pending"), "TorBox pending");
      hub = new DebridProviders(root, network, routes);
      Assert(J.List(J.Get(await hub.Resolve("torbox", "", true), "links")).Length == 1, "TorBox polls existing job without creating another");
      await work;
      Assert(!J.Encode(hub.Status()).Contains(token) && !File.ReadAllText(Path.Combine(root, "debrid-jobs.json")).Contains(token), "No token in status/jobs");
      bool rejected = false; try { DebridProviders.Link("https://cdn.example/?key=" + token, "a", 1, token); } catch { rejected = true; } Assert(rejected, "Reject provider credential in returned URL");
      foreach (string id in DebridProviders.Ids) { hub.Save(id, ""); Assert(!J.Bool(hub.Status().First(item => J.Str(item, "id") == id), "configured"), "Independent credential removal"); }
      Console.WriteLine("PASS advanced: AllDebrid delayed restart, Premiumize multi-file, TorBox persistent jobs, bearer contracts and secret redaction");
      var nic = NetworkInterface.GetAllNetworkInterfaces().First(n => n.OperationalStatus == OperationalStatus.Up && n.NetworkInterfaceType != NetworkInterfaceType.Loopback && n.GetIPProperties().UnicastAddresses.Any(a => a.Address.AddressFamily == AddressFamily.InterNetwork));
      var address = nic.GetIPProperties().UnicastAddresses.First(a => a.Address.AddressFamily == AddressFamily.InterNetwork).Address;
      store.Settings["vpnInterfaceId"] = nic.Id;
      var origin = new TcpListener(address, 0); origin.Start();
      var responseWork = Task.Run(async () => { using (var peer = await origin.AcceptTcpClientAsync()) {
        Assert(((IPEndPoint)peer.Client.RemoteEndPoint).Address.Equals(address), "Media source uses selected interface address");
        var stream = peer.GetStream(); var head = new StringBuilder(); var one = new byte[1];
        while (!head.ToString().EndsWith("\r\n\r\n")) { Assert(await stream.ReadAsync(one, 0, 1) == 1, "Media header"); head.Append((char)one[0]); }
        Assert(!head.ToString().Contains("Proxy-Authorization"), "Local proxy credentials stripped before origin");
        byte[] reply = Encoding.ASCII.GetBytes("HTTP/1.1 200 OK\r\nContent-Length: 11\r\nConnection: close\r\n\r\nbound-media"); await stream.WriteAsync(reply, 0, reply.Length);
      } });
      try {
        var media = new Media(store, network, root);
        await media.Probe("http://" + address + ":" + ((IPEndPoint)origin.LocalEndpoint).Port + "/baran-vpn-proxy-test"); await responseWork;
        var running = media.Run(media.Binary("yt-dlp"), new [] { "--vpn-wait-fixture" }, 15000, System.Threading.CancellationToken.None);
        await Task.Delay(300); store.Settings["vpnInterfaceId"] = "missing-interface";
        var started = DateTime.UtcNow; bool stopped = false; try { await running; } catch (OperationCanceledException) { stopped = true; }
        Assert(stopped && (DateTime.UtcNow-started).TotalSeconds < 3, "Interface loss stops media child promptly");
        Console.WriteLine("PASS advanced: media process uses authenticated bound proxy, source-IP verification and child cancellation on interface loss");
      } finally { origin.Stop(); store.Settings["vpnInterfaceId"] = ""; }
    } finally { server.Stop(); }
    string stage = Path.Combine(root, "stage"); Directory.CreateDirectory(stage); string archive = Path.Combine(root, "tools.zip");
    using (var zip = ZipFile.Open(archive, ZipArchiveMode.Create)) using (var writer = new StreamWriter(zip.CreateEntry("../../ffmpeg.exe").Open())) writer.Write("MZ-fixture");
    ToolInstaller.Extract(archive, stage, new [] { "ffmpeg.exe" }); Assert(File.Exists(Path.Combine(stage, "ffmpeg.exe")) && !File.Exists(Path.Combine(root, "ffmpeg.exe")), "Extract fixed destination only");
    string digest; using (var sha = SHA256.Create()) digest = "sha256:" + BitConverter.ToString(sha.ComputeHash(File.ReadAllBytes(archive))).Replace("-", "").ToLowerInvariant();
    ToolInstaller.Verify(archive, digest); bool bad = false; try { ToolInstaller.Verify(archive, "sha256:" + new string('0', 64)); } catch { bad = true; } Assert(bad, "Reject checksum mismatch");
    bad = false; try { ToolInstaller.Verify(archive, ""); } catch { bad = true; } Assert(bad, "Reject missing digest");
    using (var zip = ZipFile.Open(archive, ZipArchiveMode.Update)) zip.CreateEntry("other/ffmpeg.exe");
    bad = false; try { ToolInstaller.Extract(archive, stage, new [] { "ffmpeg.exe" }); } catch { bad = true; } Assert(bad, "Reject duplicate executable entries");
    Console.WriteLine("PASS advanced: digest verification and constrained ZIP extraction, missing/duplicate entry rejection");
  }
}
