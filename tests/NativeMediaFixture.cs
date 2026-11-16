using System;
using System.IO;
using System.Linq;
using System.Text;
public static class NativeMediaFixture {
  public static int Main(string[] args) {
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
      Console.WriteLine("BARAN_PROGRESS:999|999|1024|0");
      Console.WriteLine("BARAN_FILE:" + path); return 0;
    }
    return 1;
  }
}
