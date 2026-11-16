using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using Microsoft.Win32;

namespace Baran {
  public static class BrowserInstallation {
    public const string FileName = "Baran-Firefox-Extension-1.0.2-signed.xpi";
    public const string Sha256 = "884b395779a9af2a90b12eb2ce81b54c275c45c664c4d5be7af18359bb897120";
    public static string Package(string root) {
      string path = Path.Combine(root, "extensions", FileName);
      if (!File.Exists(path)) throw new Exception("The bundled signed Firefox extension is missing. Reinstall the current Baran package.");
      if (new FileInfo(path).Length > 1024 * 1024) throw new Exception("Invalid Firefox extension package");
      string hash; using (var sha = SHA256.Create()) using (var input = File.OpenRead(path)) hash = BitConverter.ToString(sha.ComputeHash(input)).Replace("-", "").ToLowerInvariant();
      if (hash != Sha256) throw new Exception("The Firefox extension checksum does not match. Installation was stopped.");
      return path;
    }
    static string Executable(string path) {
      path = (path ?? "").Trim().Trim('"');
      return Path.IsPathRooted(path) && Path.GetFileName(path).Equals("firefox.exe", StringComparison.OrdinalIgnoreCase) && File.Exists(path) ? path : "";
    }
    public static string FindFirefox() {
      foreach (var hive in new [] { RegistryHive.CurrentUser, RegistryHive.LocalMachine }) foreach (var view in new [] { RegistryView.Registry64, RegistryView.Registry32 }) {
        try { using (var root = RegistryKey.OpenBaseKey(hive, view)) using (var key = root.OpenSubKey("Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\firefox.exe")) { string file = Executable(key == null ? "" : Convert.ToString(key.GetValue(""))); if (file.Length > 0) return file; } } catch { }
      }
      foreach (var folder in new [] { Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData) }) {
        foreach (string sub in new [] { "Mozilla Firefox", "Programs\\Mozilla Firefox" }) { string file = Executable(Path.Combine(folder, sub, "firefox.exe")); if (file.Length > 0) return file; }
      }
      throw new Exception("Firefox was not found. Install Firefox, then try again. Portable/custom installations can install the signed XPI manually and use Repair connection.");
    }
    public static string Arguments(string package) { return "-new-tab " + J.Quote(new Uri(Path.GetFullPath(package)).AbsoluteUri); }
    public static void Open(string firefox, string package) {
      // Firefox owns the Add/permission prompt. Never edit browser profiles or disable signature checks.
      Process.Start(new ProcessStartInfo(firefox, Arguments(package)) { UseShellExecute = false, CreateNoWindow = true });
    }
  }
}
