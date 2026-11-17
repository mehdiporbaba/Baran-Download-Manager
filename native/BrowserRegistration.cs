using System;
using System.IO;
using System.Linq;
using System.Text;
using Microsoft.Win32;

namespace Baran {
  public static class BrowserRegistration {
    public static string[] Origins(string extension, object previous) {
      if (!System.Text.RegularExpressions.Regex.IsMatch(extension ?? "", "^[a-p]{32}$")) throw new Exception("Invalid Chromium extension ID");
      return new [] { "chrome-extension://" + extension + "/" }.Concat(J.List(previous).Select(Convert.ToString).Where(value => System.Text.RegularExpressions.Regex.IsMatch(value, "^chrome-extension://[a-p]{32}/$"))).Distinct().Take(16).ToArray();
    }
    public static void Register(string root, string profile, string executable, string browser, string extension) {
      if (!new [] { "chrome", "edge", "firefox" }.Contains(browser)) throw new Exception("Unknown browser");
      if (browser == "firefox") extension = "baran-download-manager@mehdiporbaba";
      else if (!System.Text.RegularExpressions.Regex.IsMatch(extension ?? "", "^[a-p]{32}$")) throw new Exception("Enter the extension's ID");
      string folder = Path.Combine(profile, "native-host"); Directory.CreateDirectory(folder);
      string host = Path.Combine(folder, "BaranNativeHost.exe"), manifest = Path.Combine(folder, "com.baran.downloadmanager." + browser + ".json");
      File.Copy(Path.Combine(root, "native-host", "BaranNativeHost.exe"), host, true);
      File.WriteAllText(Path.Combine(folder, "baran-app-path.txt"), Path.GetFullPath(executable), new UTF8Encoding(false));
      var config = J.Obj("name", "com.baran.downloadmanager", "description", "Baran browser bridge", "path", host, "type", "stdio");
      string key = browser == "firefox" ? "allowed_extensions" : "allowed_origins";
      string origin = browser == "firefox" ? extension : "chrome-extension://" + extension + "/";
      string[] origins = new [] { origin };
      if (browser != "firefox" && File.Exists(manifest)) {
        try { origins = Origins(extension, J.Get(J.Decode(File.ReadAllText(manifest)), key)); } catch { }
      }
      config[key] = origins.ToArray(); J.Atomic(manifest, config);
      string vendor = browser == "firefox" ? "Mozilla" : browser == "edge" ? "Microsoft\\Edge" : "Google\\Chrome";
      using (var entry = Registry.CurrentUser.CreateSubKey("Software\\" + vendor + "\\NativeMessagingHosts\\com.baran.downloadmanager")) entry.SetValue("", manifest);
    }
    public static void RepairInstalled(string root, string profile, string executable) {
      Register(root, profile, executable, "firefox", "");
      foreach (string browser in new [] { "chrome", "edge" }) {
        string file = Path.Combine(profile, "native-host", "com.baran.downloadmanager." + browser + ".json");
        if (!File.Exists(file)) continue;
        var origins = J.List(J.Get(J.Decode(File.ReadAllText(file)), "allowed_origins"));
        string origin = origins.Select(Convert.ToString).FirstOrDefault(value => System.Text.RegularExpressions.Regex.IsMatch(value, "^chrome-extension://[a-p]{32}/$"));
        if (origin != null) Register(root, profile, executable, browser, origin.Substring(19, 32));
      }
    }
  }
}
