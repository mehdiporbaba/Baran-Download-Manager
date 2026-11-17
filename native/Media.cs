using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Baran {
  public sealed class Media {
    readonly object routing = new object(); int running;
    public void ConfigureRouting(Action change) { lock (routing) { if (running != 0) throw new Exception("Wait for media inspection or downloads to stop before changing VPN binding"); change(); } }
    readonly StateStore store; readonly NativeNetwork network; readonly string root;
    public Media(StateStore state, NativeNetwork net, string directory) { store = state; network = net; root = directory; }
    public string Binary(string name) {
      string custom = name == "yt-dlp" ? J.Str(store.Settings, "ytDlpPath") : name == "ffmpeg" ? J.Str(store.Settings, "ffmpegPath") : "";
      if (File.Exists(custom)) return Path.GetFullPath(custom);
      foreach (string directory in new [] { Path.Combine(store.Root, "bin"), Path.Combine(root, "bin") }.Concat((Environment.GetEnvironmentVariable("PATH") ?? "").Split(';'))) {
        try { string file = Path.Combine(directory.Trim('"'), name + ".exe"); if (File.Exists(file)) return Path.GetFullPath(file); } catch { }
      }
      return "";
    }
    public Dictionary<string, object> Status(string name) {
      string file = Binary(name), version = "";
      if (file.Length > 0 && Path.GetDirectoryName(file).Equals(Path.Combine(store.Root, "bin"), StringComparison.OrdinalIgnoreCase)) {
        string stamp = Path.Combine(store.Root, "bin", name + ".source.json");
        try { if (File.Exists(stamp)) version = J.Str(J.Decode(File.ReadAllText(stamp)), "version"); } catch { }
      }
      return J.Obj("available", file.Length > 0, "path", file, "version", version);
    }
    static string FriendlyError(string text) {
      if (System.Text.RegularExpressions.Regex.IsMatch(text, "sign in to confirm|not a bot", System.Text.RegularExpressions.RegexOptions.IgnoreCase)) return "YouTube requested a sign-in check. Select your authorized browser session or cookies.txt in Settings → Tools, then retry.";
      if (System.Text.RegularExpressions.Regex.IsMatch(text, "private video|members[- ]only|join this channel", System.Text.RegularExpressions.RegexOptions.IgnoreCase)) return "This video is private or members-only. Select cookies from an account with access in Settings → Tools.";
      if (System.Text.RegularExpressions.Regex.IsMatch(text, "age[- ]restricted|confirm your age", System.Text.RegularExpressions.RegexOptions.IgnoreCase)) return "This video is age-restricted. Select cookies from an authorized signed-in account in Settings → Tools.";
      return String.IsNullOrWhiteSpace(text) ? "The media tool failed without an error message. Update it in Settings → Tools and retry." : text;
    }
    List<string> Common(string url, bool gallery) {
      var args = new List<string> { gallery ? "--config-ignore" : "--ignore-config", "--no-colors", "--proxy", network.MediaProxy(url) };
      // Keep network fetching inside yt-dlp's proxy-aware downloader. FFmpeg is
      // reserved for local merging; arbitrary external downloaders are not used.
      if (network.Vpn.Enabled && !gallery) args.AddRange(new [] { "--downloader", "native", "--hls-prefer-native" });
      string cookies = J.Str(store.Settings, "cookiesFile"), browser = J.Str(store.Settings, "cookiesBrowser");
      if (!String.IsNullOrEmpty(cookies) && File.Exists(cookies)) args.AddRange(new [] { "--cookies", cookies });
      else if (!String.IsNullOrEmpty(browser)) args.AddRange(new [] { "--cookies-from-browser", browser + (gallery ? "/instagram.com" : "") });
      if (!gallery) {
        string deno = Binary("deno"), node = Binary("node");
        if (deno.Length > 0) args.AddRange(new [] { "--js-runtimes", "deno:" + deno });
        else if (node.Length > 0) args.AddRange(new [] { "--js-runtimes", "node:" + node });
      }
      return args;
    }
    public async Task<string> Run(string file, IEnumerable<string> args, int timeout, CancellationToken token, Action<string> line = null) {
      lock (routing) { network.Vpn.Ensure(); running++; }
      try {
      if (String.IsNullOrEmpty(file)) throw new Exception("Install the required media tool in Settings first");
      var info = new ProcessStartInfo(file, String.Join(" ", args.Select(J.Quote))) { UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true, StandardOutputEncoding = Encoding.UTF8, StandardErrorEncoding = Encoding.UTF8 };
      using (var process = new Process { StartInfo = info })
      using (var limit = CancellationTokenSource.CreateLinkedTokenSource(token)) {
        bool bound = network.Vpn.Enabled;
        using (var monitor = new Timer(_ => { if (bound) try { network.Vpn.Ensure(); } catch { try { limit.Cancel(); } catch (ObjectDisposedException) { } } }, null, 250, 250)) {
        var stdout = new StringBuilder(); var stderr = new StringBuilder();
        if (timeout > 0) limit.CancelAfter(timeout);
        var exited = new TaskCompletionSource<int>();
        process.EnableRaisingEvents = true; process.Exited += (sender, e) => exited.TrySetResult(process.ExitCode);
        process.OutputDataReceived += (sender, e) => { if (e.Data == null) return; lock (stdout) { if (stdout.Length > 16 * 1024 * 1024) { limit.Cancel(); return; } stdout.AppendLine(e.Data); } if (line != null) line(e.Data); };
        process.ErrorDataReceived += (sender, e) => {
          if (e.Data == null) return;
          if (line != null && (e.Data.StartsWith("BARAN_PROGRESS:") || e.Data.StartsWith("BARAN_POSTPROCESS:"))) { line(e.Data); return; }
          lock (stderr) { if (stderr.Length > 128 * 1024) stderr.Remove(0, stderr.Length - 64 * 1024); stderr.AppendLine(e.Data); }
        };
        process.Start(); process.BeginOutputReadLine(); process.BeginErrorReadLine();
        using (limit.Token.Register(() => { try { if (!process.HasExited) { using (var kill = Process.Start(new ProcessStartInfo("taskkill.exe", "/pid " + process.Id + " /T /F") { UseShellExecute = false, CreateNoWindow = true })) { } } } catch { try { process.Kill(); } catch { } } })) {
          int code = await exited.Task.ConfigureAwait(false); process.WaitForExit();
          limit.Token.ThrowIfCancellationRequested();
          if (code != 0) throw new Exception(FriendlyError(String.Join(" ", stderr.ToString().Trim().Split('\n').Reverse().Take(3).Reverse())));
          return stdout.ToString();
        }
        }
      }
      } finally { lock (routing) running--; }
    }
    public async Task<Dictionary<string, object>> Probe(string input) {
      string url = J.Url(input).AbsoluteUri;
      var args = Common(url, false); args.AddRange(new [] { "--dump-single-json", "--skip-download", "--flat-playlist", "--playlist-end", "200", "--", url });
      var data = J.Map(J.Decode(await Run(Binary("yt-dlp"), args, 90000, CancellationToken.None).ConfigureAwait(false)));
      object[] entries = J.List(J.Get(data, "entries"));
      if (entries.Length > 0) return J.Obj("url", url, "title", J.Str(data, "title"), "isPlaylist", true, "playlistCount", entries.Length,
        "entries", entries.Select((entry, i) => J.Obj("url", PlaylistUrl(entry), "title", J.Str(entry, "title"), "duration", J.Get(entry, "duration"), "thumbnail", J.Get(entry, "thumbnail"), "index", i + 1)).ToArray(), "formats", new object[0]);
      var formats = new List<object>();
      formats.Add(J.Obj("id", "best", "selector", "bv*+ba/b", "height", 0, "ext", "mp4", "audioOnly", false, "label", "Best available quality"));
      foreach (object format in J.List(J.Get(data, "formats")).Reverse()) {
        string id = J.Str(format, "format_id"), video = J.Str(format, "vcodec"), audio = J.Str(format, "acodec");
        if (id.Length == 0 || J.Str(format, "protocol").StartsWith("mhtml")) continue;
        bool audioOnly = video == "none" && audio != "none";
        if (!audioOnly && J.Num(format, "height") == 0) continue;
        formats.Add(J.Obj("id", id, "selector", id + (!audioOnly && audio == "none" ? "+bestaudio/best" : ""), "height", J.Num(format, "height"), "ext", J.Str(format, "ext"), "fps", J.Get(format, "fps"), "filesize", J.Get(format, "filesize", J.Get(format, "filesize_approx")), "audioOnly", audioOnly, "label", audioOnly ? "Audio · " + J.Str(format, "ext") : J.Num(format, "height") + "p · " + J.Str(format, "ext")));
      }
      return J.Obj("url", url, "title", J.Str(data, "title", "Video"), "uploader", J.Get(data, "uploader"), "duration", J.Get(data, "duration"), "thumbnail", J.Get(data, "thumbnail"), "extractor", J.Get(data, "extractor_key"), "viewCount", J.Get(data, "view_count"), "uploadDate", J.Get(data, "upload_date"), "isPlaylist", false, "formats", formats.ToArray());
    }
    static string PlaylistUrl(object entry) { string url = J.Str(entry, "webpage_url", J.Str(entry, "url")); return url.StartsWith("http") ? url : "https://www.youtube.com/watch?v=" + J.Str(entry, "id", url); }
    public async Task Download(DownloadRecord task, CancellationToken token, Action<DownloadRecord, Dictionary<string, object>> patch) {
      var data = task.Data; string url = J.Str(data, "url"); var meta = J.Get(data, "youtube");
      var args = Common(url, false); string ffmpeg = Binary("ffmpeg");
      args.AddRange(new [] { "--newline", "--progress", "--continue", "--no-overwrites", "--no-playlist", "--progress-template", "download:BARAN_PROGRESS:%(progress.downloaded_bytes)s|%(progress.total_bytes,progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s", "--progress-template", "postprocess:BARAN_POSTPROCESS:%(progress.status)s", "--print", "after_move:BARAN_FILE:%(filepath)s", "-P", J.Str(data, "dir"), "-o", J.SafeName(Path.GetFileNameWithoutExtension(J.Str(data, "fileName"))) + ".%(ext)s" });
      if (ffmpeg.Length > 0) args.AddRange(new [] { "--ffmpeg-location", ffmpeg });
      string selector = J.Str(meta, "selector", J.Str(meta, "formatId", J.Bool(meta, "audioOnly") ? "bestaudio/best" : "bv*+ba/b")); args.AddRange(new [] { "-f", selector });
      if (ffmpeg.Length == 0 && (selector.Contains("+") || (J.Bool(meta, "audioOnly") && J.Str(meta, "audioFormat") == "mp3") || J.Bool(meta, "embedThumbnail"))) throw new Exception("FFmpeg is required for this format or postprocessing. Select it in Settings > Tools, or choose a combined video/audio format.");
      if (J.Bool(meta, "audioOnly") && J.Str(meta, "audioFormat") == "mp3") args.AddRange(new [] { "-x", "--audio-format", "mp3" });
      if (J.Bool(meta, "subtitles")) args.AddRange(new [] { "--write-subs", "--write-auto-subs" });
      if (J.Bool(meta, "embedThumbnail")) args.AddRange(new [] { "--write-thumbnail", "--embed-thumbnail" });
      if (J.Num(store.Settings, "globalSpeedLimit") > 0) args.AddRange(new [] { "--limit-rate", J.Num(store.Settings, "globalSpeedLimit").ToString() });
      args.AddRange(new [] { "--", url });
      patch(task, J.Obj("status", "downloading")); string resultPath = "";
      await Run(Binary("yt-dlp"), args, 0, token, line => {
        if (line.StartsWith("BARAN_FILE:")) resultPath = line.Substring(11).Trim();
        if (line.StartsWith("BARAN_POSTPROCESS:")) patch(task, J.Obj("status", "verifying", "speed", 0, "eta", 0, "connections", 0));
        if (line.StartsWith("BARAN_PROGRESS:")) {
          string[] values = line.Substring(15).Split('|');
          var update = J.Obj("status", "downloading"); var keys = new [] { "downloaded", "size", "speed", "eta" };
          for (int i = 0; i < Math.Min(4, values.Length); i++) { double value; if (Double.TryParse(values[i], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out value)) update[keys[i]] = (long)value; }
          patch(task, update);
        }
      }).ConfigureAwait(false);
      if (String.IsNullOrEmpty(resultPath) || !File.Exists(resultPath)) throw new Exception("The media tool finished without a verified output file");
      long size = new FileInfo(resultPath).Length;
      patch(task, J.Obj("filePath", resultPath, "fileName", Path.GetFileName(resultPath), "size", size, "downloaded", size, "status", "completed", "completedAt", J.Now(), "speed", 0, "eta", 0, "connections", 0));
    }
    public async Task<List<Dictionary<string, object>>> Instagram(string input) {
      var url = J.Url(input);
      if (!(url.Host == "instagram.com" || url.Host == "www.instagram.com") || !System.Text.RegularExpressions.Regex.IsMatch(url.AbsolutePath, "^/(p|reel|reels|tv|stories)/[^/]+")) throw new Exception("Enter a specific Instagram post, reel or story URL");
      var args = Common(url.AbsoluteUri, true); args.AddRange(new [] { "--no-input", "--no-postprocessors", "-j", "--range", "1-100", "--http-timeout", "20", "--retries", "2", "--", url.AbsoluteUri });
      var messages = J.List(J.Decode(await Run(Binary("gallery-dl"), args, 90000, CancellationToken.None).ConfigureAwait(false)));
      var assets = new List<Dictionary<string, object>>();
      foreach (object message in messages) {
        var parts = J.List(message); if (parts.Length < 3 || Convert.ToInt32(parts[0]) != 3) continue;
        var media = J.Url(Convert.ToString(parts[1]));
        if (!(media.Host.EndsWith(".cdninstagram.com") || media.Host.EndsWith(".fbcdn.net") || media.Host == "cdninstagram.com")) continue;
        var info = parts[2]; string extension = J.Str(info, "extension", "jpg");
        assets.Add(J.Obj("url", media.AbsoluteUri, "fileName", J.SafeName("instagram_" + J.Str(info, "post_id", J.Str(info, "id", Guid.NewGuid().ToString("N"))) + "_" + J.Str(info, "num", (assets.Count+1).ToString()) + "." + extension)));
        if (assets.Count == 100) break;
      }
      if (assets.Count == 0) throw new Exception("No accessible Instagram media was returned. Update gallery-dl or select your authorized browser session in Settings.");
      return assets;
    }
    public Task Install(bool gallery) { return ToolInstaller.Install(gallery ? "gallery-dl" : "yt-dlp", store, network); }
  }
}
