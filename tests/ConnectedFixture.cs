using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Xml.Linq;
using System.Security.Principal;
using Baran;

class ConnectedFixture {
  static void Assert(bool value, string message) { if (!value) throw new Exception(message); }
  static int Main(string[] args) { try { Run(args[0]).GetAwaiter().GetResult(); return 0; } catch (Exception error) { Console.Error.WriteLine(error); return 1; } }
  static async Task Run(string root) {
    var store = new StateStore(root); var vault = new UserSecrets(root); string token = "native-fixture-secret-123";
    vault.Write(token); Assert(vault.Read() == token, "DPAPI round trip");
    Assert(!Encoding.UTF8.GetString(File.ReadAllBytes(Path.Combine(root, "connected-secrets.bin"))).Contains(token), "Token must be encrypted");
    store.Save(); Assert(!File.ReadAllText(Path.Combine(root, "pulse-state.json")).Contains(token), "No token in state");
    var uri = RealDebrid.Result(J.Obj("download", "https://example.com/file?sig=abc", "filename", "../x.zip", "filesize", 12)); Assert(J.Str(uri, "fileName") == ".._x.zip", "Safe debrid filename");
    bool rejected = false; try { RealDebrid.Result(J.Obj("download", "file:///C:/secret")); } catch { rejected = true; } Assert(rejected, "Reject non HTTP provider output");
    var xml = XDocument.Parse(WakeScheduler.Xml("C:\\Baran & Test\\Baran Download Manager.exe", DateTimeOffset.UtcNow.AddMinutes(5).ToUnixTimeMilliseconds(), "S-1-5-21-123"));
    XNamespace ns = "http://schemas.microsoft.com/windows/2004/02/mit/task";
    Assert(xml.Descendants(ns + "WakeToRun").Single().Value == "true", "Wake task enabled");
    Assert(xml.Descendants(ns + "Command").Single().Value.Contains("& Test"), "XML path escaping");
    Assert(xml.Descendants(ns + "LogonType").Single().Value == "InteractiveToken", "No stored Windows password");
    Console.WriteLine("PASS connected: DPAPI secret storage, provider output validation and least-privilege wake-task XML");
    string taskName = "Baran-Integration-Test-" + Guid.NewGuid().ToString("N");
    dynamic scheduler = Activator.CreateInstance(Type.GetTypeFromProgID("Schedule.Service")); scheduler.Connect(); dynamic folder = scheduler.GetFolder("\\");
    bool created = false;
    try {
      string sid = WindowsIdentity.GetCurrent().User.Value;
      var taskXml = WakeScheduler.Xml(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Baran Download Manager.exe"), DateTimeOffset.UtcNow.AddDays(1).ToUnixTimeMilliseconds(), sid);
      dynamic registered = folder.RegisterTask(taskName, taskXml, 6, sid, null, 3, null);
      created = true;
      Assert((bool)registered.Definition.Settings.WakeToRun, "Windows accepted WakeToRun");
      Assert((int)registered.Definition.Principal.LogonType == 3, "Interactive user registration");
    } finally { if (created) folder.DeleteTask(taskName, 0); }
    Console.WriteLine("PASS connected: Windows Task Scheduler accepts the wake definition; isolated future test task removed without running it");
    using (var network = new NativeNetwork(store)) {
      store.Settings["vpnInterfaceId"] = "missing-interface";
      rejected = false; try { await network.Probe("http://127.0.0.1:9/blocked"); } catch { rejected = true; } Assert(rejected, "Disconnected VPN must fail closed before opening a request");
      store.Settings["vpnInterfaceId"] = "";
      var listener = new TcpListener(IPAddress.Loopback, 0); listener.Start(); int port = ((IPEndPoint)listener.LocalEndpoint).Port;
      var handle = Task.Run(async () => {
        using (var client = await listener.AcceptTcpClientAsync()) {
          var stream = client.GetStream(); var buffer = new byte[1]; var header = new StringBuilder();
          while (!header.ToString().EndsWith("\r\n\r\n")) { Assert(await stream.ReadAsync(buffer, 0, 1) == 1, "HTTP request header"); header.Append((char)buffer[0]); }
          Assert(header.ToString().Contains("Authorization: Bearer " + token), "Provider authentication header");
          Assert(header.ToString().StartsWith("POST /unrestrict/link "), "Provider route and verb");
          int length = Int32.Parse(header.ToString().Split(new [] { "\r\n" }, StringSplitOptions.None).First(line => line.StartsWith("Content-Length:", StringComparison.OrdinalIgnoreCase)).Split(':')[1]);
          byte[] body = new byte[length]; int offset = 0; while (offset < length) offset += await stream.ReadAsync(body, offset, length-offset);
          Assert(Encoding.UTF8.GetString(body).Contains("link=https%3A%2F%2Fexample.com%2Ffile%3Fsig%3Da%252Bb"), "Form escaping preserves signed link bytes");
          string json = "{\"download\":\"https://example.com/direct\",\"filename\":\"test.zip\",\"filesize\":123}";
          byte[] response = Encoding.UTF8.GetBytes("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: " + json.Length + "\r\nConnection: close\r\n\r\n" + json); await stream.WriteAsync(response, 0, response.Length);
        }
      });
      var provider = new RealDebrid(vault, network, "http://127.0.0.1:" + port + "/");
      var result = await provider.Request("unrestrict/link", "https://example.com/file?sig=a%2Bb"); Assert(J.Str(result, "url") == "https://example.com/direct", "Provider result mapping"); await handle; listener.Stop();
      Console.WriteLine("PASS connected: Real-Debrid HTTP contract against a local fixture; no live provider account used");
      var nic = NetworkInterface.GetAllNetworkInterfaces().FirstOrDefault(n => n.OperationalStatus == OperationalStatus.Up && n.NetworkInterfaceType != NetworkInterfaceType.Loopback && n.GetIPProperties().UnicastAddresses.Any(a => a.Address.AddressFamily == AddressFamily.InterNetwork));
      if (nic == null) throw new Exception("An IPv4 test interface is required");
      IPAddress address = nic.GetIPProperties().UnicastAddresses.First(a => a.Address.AddressFamily == AddressFamily.InterNetwork).Address;
      store.Settings["vpnInterfaceId"] = nic.Id;
      var server = new TcpListener(address, 0); server.Start();
      using (var bound = await network.Vpn.Connect(address.ToString(), ((IPEndPoint)server.LocalEndpoint).Port, CancellationToken.None))
      using (var peer = await server.AcceptTcpClientAsync()) {
        Assert(((IPEndPoint)bound.Client.LocalEndPoint).Address.Equals(address), "Bound socket source address");
        store.Settings["vpnInterfaceId"] = "missing-interface";
        var wait = peer.GetStream().ReadAsync(new byte[1], 0, 1);
        Assert(await Task.WhenAny(wait, Task.Delay(3000)) == wait && await wait == 0, "Interface loss closes existing sockets");
        network.Vpn.Release(bound);
      }
      server.Stop();
      Console.WriteLine("PASS connected: selected IPv4 interface binds a real socket and simulated loss closes it without fallback");
    }
    vault.Write(""); Assert(vault.Read() == "", "Token removal");
  }
}
