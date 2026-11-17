using System;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;

namespace Baran {
  public static class ToolInstaller {
    static readonly SemaphoreSlim gate = new SemaphoreSlim(1, 1);
    public static void Verify(string path, string digest) {
      if (!System.Text.RegularExpressions.Regex.IsMatch(digest, "^sha256:[a-fA-F0-9]{64}$")) throw new Exception("Official release has no SHA-256 digest; automatic installation was stopped");
      using (var sha = SHA256.Create()) using (var input = File.OpenRead(path))
        if (!String.Equals(BitConverter.ToString(sha.ComputeHash(input)).Replace("-", ""), digest.Substring(7), StringComparison.OrdinalIgnoreCase)) throw new Exception("Tool checksum did not match");
    }
    public static void Extract(string archive, string stage, string[] names) {
      using (var zip = ZipFile.OpenRead(archive)) foreach (string name in names) {
        var entries = zip.Entries.Where(entry => Path.GetFileName(entry.FullName) == name).ToArray();
        if (entries.Length != 1 || entries[0].Length <= 0 || entries[0].Length > 300L * 1024 * 1024) throw new Exception("Invalid or oversized tool archive entry: " + name);
        // Only fixed filenames are extracted; archive paths can never select a destination.
        using (var input = entries[0].Open()) using (var output = File.Create(Path.Combine(stage, name))) {
          var buffer = new byte[65536]; long total = 0; int count;
          while ((count = input.Read(buffer, 0, buffer.Length)) > 0) { total += count; if (total > entries[0].Length || total > 300L * 1024 * 1024) throw new Exception("Tool entry exceeds its declared size"); output.Write(buffer, 0, count); }
          if (total != entries[0].Length) throw new Exception("Tool entry is truncated");
        }
      }
    }
    public static async Task Install(string tool, StateStore store, NativeNetwork network) {
      string repo, assetName; string[] names;
      switch (tool) {
        case "yt-dlp": repo = "yt-dlp/yt-dlp"; assetName = "yt-dlp.exe"; names = new [] { assetName }; break;
        case "gallery-dl": repo = "gdl-org/builds"; assetName = "gallery-dl_windows.exe"; names = new [] { "gallery-dl.exe" }; break;
        case "ffmpeg": repo = "FFmpeg-Builds/FFmpeg-Builds"; assetName = "ffmpeg-master-latest-win64-gpl.zip"; names = new [] { "ffmpeg.exe", "ffprobe.exe" }; break;
        case "deno": repo = "denoland/deno"; assetName = "deno-x86_64-pc-windows-msvc.zip"; names = new [] { "deno.exe" }; break;
        default: throw new Exception("Unsupported managed tool");
      }
      await gate.WaitAsync().ConfigureAwait(false);
      string stage = Path.Combine(store.Root, "tool-stage-" + Guid.NewGuid().ToString("N"));
      try {
        Directory.CreateDirectory(stage);
        var release = J.Decode(await network.Text("https://api.github.com/repos/" + repo + "/releases/latest", 4 * 1024 * 1024).ConfigureAwait(false));
        var asset = J.List(J.Get(release, "assets")).FirstOrDefault(item => J.Str(item, "name") == assetName);
        string url = J.Str(asset, "browser_download_url"), digest = J.Str(asset, "digest");
        if (!url.StartsWith("https://github.com/" + repo + "/releases/", StringComparison.Ordinal) || J.Num(asset, "size") <= 0 || J.Num(asset, "size") > 300L * 1024 * 1024) throw new Exception("The official tool asset is missing or exceeds 300 MB");
        if (!System.Text.RegularExpressions.Regex.IsMatch(digest, "^sha256:[a-fA-F0-9]{64}$")) throw new Exception("Official release has no SHA-256 digest; use a verified manual installation");
        string download = Path.Combine(stage, "package.download"); long total = 0;
        using (var cancel = new CancellationTokenSource(600000))
        using (var response = await network.Open(url, null, cancel.Token).ConfigureAwait(false))
        using (cancel.Token.Register(response.Close)) {
          if ((int)response.StatusCode != 200) throw new Exception("Tool download failed: HTTP " + (int)response.StatusCode);
          using (var output = File.Create(download)) {
            var bytes = new byte[65536]; int n;
            while ((n = await response.GetResponseStream().ReadAsync(bytes, 0, bytes.Length, cancel.Token).ConfigureAwait(false)) > 0) {
              total += n; if (total > 300L * 1024 * 1024) throw new Exception("Tool download exceeds 300 MB");
              await output.WriteAsync(bytes, 0, n, cancel.Token).ConfigureAwait(false);
            }
          }
        }
        if (total != J.Num(asset, "size")) throw new Exception("Tool asset length did not match");
        Verify(download, digest);
        if (assetName.EndsWith(".zip")) Extract(download, stage, names); else File.Move(download, Path.Combine(stage, names[0]));
        foreach (string name in names) using (var input = File.OpenRead(Path.Combine(stage, name))) if (input.ReadByte() != 'M' || input.ReadByte() != 'Z') throw new Exception("Tool is not a Windows executable");
        string bin = Path.Combine(store.Root, "bin"); Directory.CreateDirectory(bin);
        foreach (string name in names) {
          string target = Path.Combine(bin, name), source = Path.Combine(stage, name);
          if (File.Exists(target)) File.Replace(source, target, null); else File.Move(source, target);
        }
        J.Atomic(Path.Combine(bin, tool + ".source.json"), J.Obj("repository", repo, "version", J.Str(release, "tag_name"), "sha256", digest, "installedAt", J.Now()));
      } finally { try { if (Directory.Exists(stage)) Directory.Delete(stage, true); } finally { gate.Release(); } }
    }
  }
}
