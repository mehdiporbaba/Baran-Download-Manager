using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Runtime.InteropServices;

namespace Baran {
  public sealed class StateStore {
    public readonly string Root;
    public readonly object Gate = new object();
    public Dictionary<string, object> Settings;
    public List<Dictionary<string, object>> Tasks = new List<Dictionary<string, object>>();
    public StateStore(string root) {
      Root = root; Directory.CreateDirectory(root);
      Settings = Defaults();
      string file = Path.Combine(root, "pulse-state.json");
      if (!File.Exists(file)) return;
      // Preserve a one-time copy before a different runtime writes this profile.
      string backup = Path.Combine(root, "pulse-state.before-native.json");
      if (!File.Exists(backup)) File.Copy(file, backup);
      var data = J.Map(J.Decode(File.ReadAllText(file)));
      foreach (var item in J.Map(J.Get(data, "settings"))) Settings[item.Key] = item.Value;
      Tasks = J.List(J.Get(data, "tasks")).Select(J.Map).ToList();
    }
    public static Dictionary<string, object> Defaults() {
      string downloads = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads");
      return J.Obj("downloadDir", downloads, "maxConcurrent", 3, "connections", 8, "globalSpeedLimit", 0,
        "torrentDownloadLimit", 0, "torrentUploadLimit", 0, "proxyMode", "direct", "minimizeToTray", true,
        "sidebarAlwaysOpen", false, "showProgressWindow", true, "language", "en", "theme", "dark", "clipboardWatch", true,
        "notifyOnComplete", true, "ytDlpPath", "", "ffmpegPath", "", "torrentPort", 51413,
        "seedAfterComplete", false, "proxy", "", "userAgent", "Baran Download Manager/2.0",
        "autoResume", true, "launchAtStartup", true, "cookiesBrowser", "", "cookiesFile", "", "githubToken", "", "vpnInterfaceId", "", "wakeToRun", false);
    }
    public void Save() { lock (Gate) J.Atomic(Path.Combine(Root, "pulse-state.json"), J.Obj("version", 1, "settings", Settings, "tasks", Tasks)); }
    public void Patch(Dictionary<string, object> patch) {
      lock (Gate) {
        foreach (var key in patch.Keys) if (!Settings.ContainsKey(key)) throw new Exception("Unknown setting: " + key);
        var proposed = new Dictionary<string, object>(Settings);
        foreach (var entry in patch) proposed[entry.Key] = entry.Value;
        if (J.Num(proposed, "connections") < 1 || J.Num(proposed, "connections") > 32 || J.Num(proposed, "maxConcurrent") < 1 || J.Num(proposed, "maxConcurrent") > 10) throw new Exception("Invalid connection or queue limit");
        foreach (var key in new [] { "globalSpeedLimit", "torrentDownloadLimit", "torrentUploadLimit" }) if (J.Num(proposed, key) < 0) throw new Exception("Speed limits cannot be negative");
        if (!new [] { "direct", "system", "manual" }.Contains(J.Str(proposed, "proxyMode"))) throw new Exception("Invalid proxy mode");
        if (J.Str(proposed, "vpnInterfaceId").Length > 0 && J.Str(proposed, "proxyMode") != "direct") throw new Exception("VPN interface binding requires Direct mode; proxy chaining is not supported");
        if (J.Str(proposed, "proxyMode") == "manual") {
          var proxy = new Uri(J.Str(proposed, "proxy"));
          if (!new [] { "http", "https", "socks5", "socks5h" }.Contains(proxy.Scheme) || !String.IsNullOrEmpty(proxy.UserInfo)) throw new Exception("Use an HTTP(S) or SOCKS5 proxy without embedded credentials");
        }
        Settings = proposed; Save();
      }
    }
    public string Proxy(string url) {
      string mode = J.Str(Settings, "proxyMode");
      if (mode == "manual") return J.Str(Settings, "proxy");
      if (mode != "system") return "";
      var target = J.Url(url); var proxy = WebRequest.GetSystemWebProxy();
      var resolved = proxy.GetProxy(target);
      return resolved == null || resolved == target || proxy.IsBypassed(target) ? "" : resolved.AbsoluteUri;
    }
  }
}
