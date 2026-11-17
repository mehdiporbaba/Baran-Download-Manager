using System;
using System.IO;
using System.Linq;
using System.Text;
public static class NativeMediaFixture {
  public static int Main(string[] args) {
    if (args.Contains("--vpn-wait-fixture")) { System.Threading.Thread.Sleep(10000); return 0; }
    string vpnUrl = args.FirstOrDefault(arg => arg.StartsWith("http://") && arg.Contains("baran-vpn-proxy-test"));
    if (vpnUrl != null) {
      int at = Array.IndexOf(args, "--proxy");
      if (at < 0 || !args.Contains("native")) return 2;
      var proxyUrl = new Uri(args[at + 1]); if (proxyUrl.Host != "127.0.0.1" || proxyUrl.UserInfo.Length == 0) return 3;
      var credentials = proxyUrl.UserInfo.Split(':'); var proxy = new System.Net.WebProxy(proxyUrl.GetLeftPart(UriPartial.Authority));
      proxy.Credentials = new System.Net.NetworkCredential(Uri.UnescapeDataString(credentials[0]), Uri.UnescapeDataString(credentials[1]));
      var request = (System.Net.HttpWebRequest)System.Net.WebRequest.Create(vpnUrl); request.Proxy = proxy;
      using (var response = request.GetResponse()) using (var reader = new StreamReader(response.GetResponseStream())) if (reader.ReadToEnd() != "bound-media") return 4;
    }
    if (args.Any(arg => arg.Contains("baran-sign-in-test"))) { Console.Error.WriteLine("ERROR: Sign in to confirm you are not a bot"); return 1; }
    if (args.Any(arg => arg.Contains("baran-private-test"))) { Console.Error.WriteLine("ERROR: Private video"); return 1; }
    if (args.Any(arg => arg.Contains("baran-age-test"))) { Console.Error.WriteLine("ERROR: Confirm your age"); return 1; }
    if (args.Contains("--dump-single-json")) {
      Console.WriteLine("{\"title\":\"Native media fixture\",\"uploader\":\"Baran test\",\"duration\":3,\"formats\":[{\"format_id\":\"22\",\"height\":720,\"ext\":\"mp4\",\"vcodec\":\"h264\",\"acodec\":\"aac\",\"filesize\":26}]}"); return 0;
    }
    if (args.Contains("-j")) {
      Console.WriteLine("[[3,\"https://scontent.cdninstagram.com/baran-native-fixture.jpg\",{\"post_id\":\"fixture\",\"num\":1,\"extension\":\"jpg\"}],[3,\"https://video.cdninstagram.com/baran-native-fixture.mp4\",{\"post_id\":\"fixture\",\"num\":2,\"extension\":\"mp4\"}],[3,\"https://malicious.invalid/ignore.exe\",{}]]"); return 0;
    }
    int output = Array.IndexOf(args, "-o"), directory = Array.IndexOf(args, "-P");
    if (output >= 0 && directory >= 0) {
      string path = Path.Combine(args[directory + 1], args[output + 1].Replace("%(ext)s", "mp4"));
      byte[] data = Encoding.UTF8.GetBytes("Baran native media fixture"); File.WriteAllBytes(path, data);
      Console.Error.WriteLine("BARAN_PROGRESS:999|999|1024|0");
      Console.Error.WriteLine("BARAN_POSTPROCESS:started");
      System.Threading.Thread.Sleep(100);
      Console.WriteLine("BARAN_FILE:" + path); return 0;
    }
    return 1;
  }
}
