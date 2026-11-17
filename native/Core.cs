using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Baran {
  public sealed class Core : IDisposable {
    public readonly StateStore Store;
    public readonly NativeNetwork Network;
    public readonly Links Inbox;
    public readonly Media Media;
    public readonly Torrents Torrent;
    public readonly MobileControl Mobile;
    readonly DebridProviders debrid;
    readonly WakeScheduler wake;
    readonly bool testing;
    readonly HttpDownload http;
    readonly RateLimiter throttle = new RateLimiter();
    readonly Dictionary<string, DownloadRecord> records = new Dictionary<string, DownloadRecord>();
    readonly object gate = new object();
    readonly Action<object> emit;
    readonly Timer timer;
    readonly Dictionary<string, long> previous = new Dictionary<string, long>();
    readonly List<object> history = new List<object>();
    bool dirty; long saved; int ticking; bool closed;
    public Func<string, object[], Task<object>> Ui;
    public Action RevealBrowserImport;
    public string Runtime = "WebView2", Version = "2.1.2";
    public Core(string profile, string root, Action<object> notify, bool testing = false) {
      this.testing = testing;
      emit = notify; Store = new StateStore(profile); Network = new NativeNetwork(Store);
      debrid = new DebridProviders(profile, Network);
      wake = new WakeScheduler(Path.Combine(root, "Baran Download Manager.exe"), testing);
      Mobile = new MobileControl(this, root);
      Inbox = new Links(Network, () => Emit(J.Obj("type", "links:changed")), profile);
      Media = new Media(Store, Network, root); Torrent = new Torrents(Store, root, testing);
      http = new HttpDownload(Network, Store, throttle, Patch); throttle.Set(J.Num(Store.Settings, "globalSpeedLimit"));
      foreach (var value in Store.Tasks) {
        var data = new Dictionary<string, object>(value);
        data["speed"] = 0; data["eta"] = 0; data["connections"] = 0;
        string status = J.Str(data, "status");
        if (new [] { "downloading", "connecting", "verifying" }.Contains(status)) data["status"] = J.Bool(Store.Settings, "autoResume") ? "queued" : "paused";
        if (J.Str(data, "kind") == "torrent") { var meta = new Dictionary<string, object>(J.Map(J.Get(data, "torrent"))); meta["seeding"] = false; meta["uploadSpeed"] = 0; data["torrent"] = meta; data.Remove("nativeGid"); }
        records[J.Str(data, "id")] = new DownloadRecord(data);
      }
      timer = new Timer(state => { if (Interlocked.Exchange(ref ticking, 1) == 0) Task.Run(async () => { try { await Tick().ConfigureAwait(false); } catch (Exception error) { Toast("error", error.Message); } finally { Interlocked.Exchange(ref ticking, 0); } }); }, null, 1000, 1000);
      SyncWake();
    }
    void Emit(object value) { if (!closed) emit(value); }
    public void Toast(string level, string message) { Emit(J.Obj("type", "toast", "level", level, "message", message)); }
    public DownloadRecord Find(string id) { lock (gate) { DownloadRecord value; if (!records.TryGetValue(id, out value)) throw new Exception("Download no longer exists"); return value; } }
    public string[] ActiveTaskIds() { lock (gate) return records.Values.Where(row => new [] { "connecting", "downloading", "verifying" }.Contains(J.Str(row.Data, "status"))).Select(row => J.Str(row.Data, "id")).ToArray(); }
    public void Patch(DownloadRecord record, Dictionary<string, object> values) {
      Dictionary<string, object> data;
      lock (gate) { data = new Dictionary<string, object>(record.Data); foreach (var item in values) data[item.Key] = item.Value; data["updatedAt"] = J.Now(); record.Data = data; dirty = true; }
      if (values.ContainsKey("status") || values.ContainsKey("error") || J.Now() - record.LastEmit >= 120) { record.LastEmit = J.Now(); Emit(J.Obj("type", "task:update", "task", data)); }
    }
    void Save() { lock (gate) { Store.Tasks = records.Values.Select(row => row.Data).ToList(); Store.Save(); dirty = false; saved = J.Now(); SyncWake(); } }
    long NextWake() { lock (gate) return records.Values.Where(row => J.Str(row.Data, "status") == "queued" && J.Num(row.Data, "startAt") > J.Now()).Select(row => J.Num(row.Data, "startAt")).DefaultIfEmpty(0).Min(); }
    long wakeAttempt; string wakeError = "";
    void SyncWake() {
      if (wakeError.Length > 0 && J.Now() - wakeAttempt < 30000) return;
      wakeAttempt = J.Now();
      try { wake.Sync(J.Bool(Store.Settings, "wakeToRun"), NextWake()); wakeError = ""; }
      catch (Exception error) { if (wakeError != error.Message) Toast("error", error.Message); wakeError = error.Message; }
    }
    static long? StartAt(object input) {
      object raw = J.Get(input, "startAt"); if (raw == null) return null;
      long value = Convert.ToInt64(raw); if (value <= 0 || value > 8640000000000000L) throw new Exception("Invalid scheduled start time"); return value;
    }
    static bool MediaUrl(string url) { var value = new Uri(url); return new [] { "youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com", "vimeo.com", "www.vimeo.com" }.Contains(value.Host); }
    static string ExpectedHash(object input) {
      string hash = J.Str(input, "expectedSha256").Trim().ToLowerInvariant();
      if (hash.Length > 0 && !System.Text.RegularExpressions.Regex.IsMatch(hash, "^[a-f0-9]{64}$")) throw new Exception("Enter a complete 64-character SHA-256 digest");
      return hash;
    }
    public Dictionary<string, object> Add(object input, bool torrent = false) {
      if (Network.Vpn.Enabled && (torrent || new [] { "youtube" }.Contains(J.Str(input, "kind")) || MediaUrlSafe(J.Str(input, "url")))) throw new Exception("Only HTTP downloads are available while VPN interface binding is enabled");
      long? start = StartAt(input); string url = J.Str(input, torrent ? "uri" : "url").Trim();
      string kind = torrent ? "torrent" : J.Str(input, "kind", "auto");
      if (!torrent) { url = J.Url(url).AbsoluteUri; if (kind == "auto") kind = MediaUrl(url) ? "youtube" : "http"; if (!new [] { "http", "youtube" }.Contains(kind)) throw new Exception("Unsupported download kind"); }
      else if (!url.StartsWith("magnet:?", StringComparison.OrdinalIgnoreCase) && String.IsNullOrEmpty(J.Str(input, "data")) && !(Path.IsPathRooted(url) && File.Exists(url) && Path.GetExtension(url).Equals(".torrent", StringComparison.OrdinalIgnoreCase))) J.Url(url);
      string directory = J.Str(input, "dir", J.Str(Store.Settings, "downloadDir")); directory = Path.GetFullPath(directory); Directory.CreateDirectory(directory);
      string name = J.Str(input, "fileName", J.Str(input, "name", ""));
      if (name.Length == 0) name = torrent ? "Torrent" : J.SafeName(Uri.UnescapeDataString(Path.GetFileName(new Uri(url).AbsolutePath)));
      name = J.SafeName(name); string id = Guid.NewGuid().ToString("N");
      string expectedHash = ExpectedHash(input); long speedLimit = J.Num(input, "speedLimit");
      if (speedLimit < 0 || speedLimit > 1099511627776L) throw new Exception("Invalid download speed limit");
      if (kind != "http" && (expectedHash.Length > 0 || speedLimit > 0)) throw new Exception("Per-download speed limits and SHA-256 checks currently support direct downloads");
      var data = J.Obj("id", id, "kind", kind, "url", url, "name", J.Str(input, "title", name), "fileName", name, "dir", directory,
        "status", "queued", "size", 0, "downloaded", 0, "speed", 0, "eta", 0, "connections", 0, "createdAt", J.Now(), "updatedAt", J.Now(),
        "category", Category(name), "headers", J.Get(input, "headers"), "maxConnections", J.Num(input, "connections", J.Num(Store.Settings, "connections")), "thumbnail", J.Get(input, "thumbnail"), "startAt", start, "speedLimit", speedLimit, "expectedSha256", expectedHash);
      if (kind == "youtube") { var youtube = new Dictionary<string, object>(J.Map(J.Get(input, "youtube"))); youtube["formatId"] = J.Get(youtube, "selector"); youtube["embedThumbnail"] = J.Bool(youtube, "thumbnail"); data["youtube"] = youtube; }
      if (torrent) {
        var meta = J.Obj("infoHash", "", "peers", 0, "seeds", 0, "uploadSpeed", 0, "uploaded", 0, "ratio", 0, "files", new object[0], "sequential", J.Bool(input, "sequential", true), "seeding", false);
        string source = J.Str(input, "data");
        if (source.Length > 48 * 1024 * 1024) throw new Exception("Torrent file exceeds 32 MB");
        if (source.Length > 0) { string folder = Path.Combine(Store.Root, "torrent-inputs"); Directory.CreateDirectory(folder); string file = Path.Combine(folder, id + ".torrent"); File.WriteAllBytes(file, Convert.FromBase64String(source)); meta["torrentFile"] = file; if (url.Length == 0) data["url"] = "file:" + file; }
        else if (File.Exists(url)) { if (new FileInfo(url).Length > 32 * 1024 * 1024) throw new Exception("Torrent file exceeds 32 MB"); string folder = Path.Combine(Store.Root, "torrent-inputs"); Directory.CreateDirectory(folder); string file = Path.Combine(folder, id + ".torrent"); File.Copy(url, file); meta["torrentFile"] = file; }
        data["torrent"] = meta; data["fileIndices"] = J.Get(input, "fileIndices");
      }
      lock (gate) { data["order"] = records.Count == 0 ? 1 : records.Values.Max(row => J.Num(row.Data, "order")) + 1; records[id] = new DownloadRecord(data); dirty = true; }
      Emit(J.Obj("type", "task:add", "task", data)); Save(); Schedule(); return data;
    }
    static bool MediaUrlSafe(string url) { try { return MediaUrl(url); } catch { return false; } }
    internal static string Category(string name) {
      string extension = Path.GetExtension(name).ToLowerInvariant();
      if (new [] { ".mp4", ".mkv", ".webm", ".avi", ".mov" }.Contains(extension)) return "video";
      if (new [] { ".mp3", ".m4a", ".wav", ".flac", ".ogg" }.Contains(extension)) return "audio";
      if (new [] { ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg" }.Contains(extension)) return "image";
      if (new [] { ".zip", ".rar", ".7z", ".tar", ".gz", ".iso" }.Contains(extension)) return "archive";
      if (new [] { ".exe", ".msi" }.Contains(extension)) return "app";
      if (new [] { ".pdf", ".txt", ".docx", ".xlsx", ".csv" }.Contains(extension)) return "document";
      return "other";
    }
    void Schedule() {
      lock (gate) {
        if (closed) return;
        int slots = (int)J.Num(Store.Settings, "maxConcurrent", 3) - records.Values.Count(row => new [] { "connecting", "downloading", "verifying" }.Contains(J.Str(row.Data, "status")));
        foreach (var row in records.Values.OrderBy(value => J.Num(value.Data, "order"))) {
          if (slots <= 0) break;
          if (J.Str(row.Data, "status") != "queued" || J.Num(row.Data, "startAt") > J.Now() || row.Refreshing || (row.Work != null && !row.Work.IsCompleted)) continue;
          row.Cancel = new CancellationTokenSource(); Patch(row, J.Obj("status", "connecting", "error", null)); slots--;
          var record = row; row.Work = Task.Run(() => Execute(record));
        }
      }
    }
    async Task Execute(DownloadRecord row) {
      try {
        string kind = J.Str(row.Data, "kind");
        if (kind == "http") { row.Limiter.Reset(J.Num(row.Data, "speedLimit")); await http.Start(row, row.Cancel.Token).ConfigureAwait(false); }
        else if (kind == "youtube") await Media.Download(row, row.Cancel.Token, Patch).ConfigureAwait(false);
        else await DownloadTorrent(row).ConfigureAwait(false);
      } catch (OperationCanceledException) { MarkPaused(row); }
      catch (Exception error) { if (row.Cancel.IsCancellationRequested) MarkPaused(row); else Patch(row, J.Obj("status", "error", "error", error.Message, "speed", 0, "eta", 0, "connections", 0)); }
      finally { Save(); }
      if (J.Str(row.Data, "status") == "completed") Emit(J.Obj("type", "toast", "level", "success", "message", "Completed: " + J.Str(row.Data, "name")));
    }
    void MarkPaused(DownloadRecord row) {
      var update = J.Obj("status", J.Get(row.Data, "completedAt") != null && J.Num(row.Data, "size") > 0 && J.Num(row.Data, "downloaded") >= J.Num(row.Data, "size") ? "completed" : "paused", "speed", 0, "eta", 0, "connections", 0);
      if (J.Str(row.Data, "kind") == "torrent") { var meta = new Dictionary<string, object>(J.Map(J.Get(row.Data, "torrent"))); meta["seeding"] = false; meta["uploadSpeed"] = 0; update["torrent"] = meta; }
      Patch(row, update);
    }
    async Task DownloadTorrent(DownloadRecord row) {
      string gid = J.Str(row.Data, "nativeGid");
      string source = J.Str(row.Data, "url");
      if (String.IsNullOrEmpty(gid) && (source.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || source.StartsWith("https://", StringComparison.OrdinalIgnoreCase)) && !File.Exists(J.Str(J.Get(row.Data, "torrent"), "torrentFile"))) {
        using (var response = await Network.Open(source, null, row.Cancel.Token).ConfigureAwait(false))
        using (row.Cancel.Token.Register(response.Close)) {
          if ((int)response.StatusCode != 200) throw new Exception("Torrent metadata download failed: HTTP " + (int)response.StatusCode);
          byte[] data = await NativeNetwork.Read(response.GetResponseStream(), 32 * 1024 * 1024, row.Cancel.Token).ConfigureAwait(false);
          string directory = Path.Combine(Store.Root, "torrent-inputs"); Directory.CreateDirectory(directory);
          string file = Path.Combine(directory, J.Str(row.Data, "id") + ".torrent"); File.WriteAllBytes(file, data);
          var meta = new Dictionary<string, object>(J.Map(J.Get(row.Data, "torrent"))); meta["torrentFile"] = file; Patch(row, J.Obj("torrent", meta));
        }
      }
      if (String.IsNullOrEmpty(gid)) { gid = await Torrent.Add(row).ConfigureAwait(false); Patch(row, J.Obj("nativeGid", gid)); }
      else await Torrent.Resume(gid).ConfigureAwait(false);
      using (row.Cancel.Token.Register(() => { Task.Run(() => Torrent.Pause(gid)); })) {
        while (true) {
          row.Cancel.Token.ThrowIfCancellationRequested();
          var status = await Torrent.Status(gid).ConfigureAwait(false); string state = J.Str(status, "status");
          if (state == "error" || state == "removed") throw new Exception(J.Str(status, "errorMessage", "Torrent transfer failed"));
          string follow = J.List(J.Get(status, "followedBy")).Select(Convert.ToString).FirstOrDefault();
          if (!String.IsNullOrEmpty(follow)) { gid = follow; Patch(row, J.Obj("nativeGid", gid)); continue; }
          long total = J.Num(status, "totalLength"), downloaded = J.Num(status, "completedLength"); bool complete = total > 0 && downloaded >= total;
          var files = J.List(J.Get(status, "files"));
          var torrent = new Dictionary<string, object>(J.Map(J.Get(row.Data, "torrent")));
          torrent["infoHash"] = J.Str(status, "infoHash"); torrent["peers"] = J.Num(status, "connections"); torrent["seeds"] = J.Num(status, "numSeeders");
          torrent["uploadSpeed"] = J.Num(status, "uploadSpeed"); torrent["uploaded"] = J.Num(status, "uploadLength"); torrent["ratio"] = downloaded > 0 ? J.Num(status, "uploadLength") / (double)downloaded : 0;
          torrent["seeding"] = complete && state == "active";
          torrent["files"] = files.Select(file => J.Obj("name", Path.GetFileName(J.Str(file, "path")), "path", J.Str(file, "path"), "length", J.Num(file, "length"), "downloaded", J.Num(file, "completedLength"), "selected", J.Str(file, "selected") == "true")).ToArray();
          string name = J.Str(J.Get(J.Get(status, "bittorrent"), "info"), "name", J.Str(row.Data, "name"));
          var update = J.Obj("status", complete ? "completed" : state == "paused" ? "paused" : "downloading", "size", total, "downloaded", downloaded, "speed", J.Num(status, "downloadSpeed"), "connections", J.Num(status, "connections"), "torrent", torrent, "name", name);
          if (files.Length == 1) { update["filePath"] = J.Str(files[0], "path"); update["fileName"] = Path.GetFileName(J.Str(files[0], "path")); }
          if (complete && J.Get(row.Data, "completedAt") == null) update["completedAt"] = J.Now();
          Patch(row, update);
          if (state == "complete" || state == "paused") break;
          await Task.Delay(1000, row.Cancel.Token).ConfigureAwait(false);
        }
      }
    }
    public async Task Pause(string id) {
      var row = Find(id); if (row.Refreshing) throw new Exception("Wait for link verification to finish");
      Patch(row, J.Obj("status", "paused", "speed", 0, "eta", 0, "connections", 0));
      if (row.Cancel != null) row.Cancel.Cancel();
      if (row.Work != null) await row.Work.ConfigureAwait(false);
      if (J.Str(row.Data, "kind") == "torrent") await Torrent.Pause(J.Str(row.Data, "nativeGid")).ConfigureAwait(false);
      Save();
    }
    public void Resume(string id) {
      var row = Find(id); if (row.Refreshing || (row.Work != null && !row.Work.IsCompleted)) throw new Exception("Wait for the current operation to stop");
      if (!new [] { "paused", "error", "canceled" }.Contains(J.Str(row.Data, "status"))) return;
      Patch(row, J.Obj("status", "queued", "error", null)); Save(); Schedule();
    }
    public async Task Replace(string id, string url) {
      var row = Find(id);
      lock (gate) { if (J.Str(row.Data, "kind") != "http" || !new [] { "paused", "error" }.Contains(J.Str(row.Data, "status")) || row.Refreshing || (row.Work != null && !row.Work.IsCompleted)) throw new Exception("Pause the direct download first"); row.Refreshing = true; }
      try { var result = await http.Replace(row, url).ConfigureAwait(false); result["status"] = "paused"; result["error"] = null; Patch(row, result); Save(); }
      finally { row.Refreshing = false; }
    }
    public async Task Remove(string id, bool delete) {
      var row = Find(id); await Pause(id).ConfigureAwait(false);
      if (J.Str(row.Data, "kind") == "torrent") await Torrent.Remove(J.Str(row.Data, "nativeGid")).ConfigureAwait(false);
      if (delete) {
        string directory = Path.GetFullPath(J.Str(row.Data, "dir")).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        string file = J.Str(row.Data, "filePath");
        foreach (string target in new [] { file, file + ".pulse-part", file + ".pulse-meta" }) {
          if (String.IsNullOrEmpty(file) || !Path.GetFullPath(target).StartsWith(directory, StringComparison.OrdinalIgnoreCase)) continue;
          if (File.Exists(target)) File.Delete(target);
        }
      }
      lock (gate) records.Remove(id); Emit(J.Obj("type", "task:remove", "id", id)); Save();
    }
    async Task Tick() {
      if (closed) return; Schedule();
      long down = 0, up = 0; DownloadRecord[] tasks; lock (gate) tasks = records.Values.ToArray();
      foreach (var row in tasks) {
        string id = J.Str(row.Data, "id"); long downloaded = J.Num(row.Data, "downloaded"), last;
        if (!previous.TryGetValue(id, out last)) last = downloaded;
        previous[id] = downloaded;
        long speed = J.Str(row.Data, "status") == "downloading" ? Math.Max(0, downloaded - last) : 0;
        if (J.Str(row.Data, "kind") == "http" && (J.Str(row.Data, "status") == "downloading" || J.Num(row.Data, "speed") > 0)) Patch(row, J.Obj("speed", speed, "eta", speed > 0 ? Math.Max(0, J.Num(row.Data, "size") - downloaded) / speed : 0));
        down += J.Num(row.Data, "speed"); up += J.Num(J.Get(row.Data, "torrent"), "uploadSpeed");
      }
      lock (gate) { history.Add(J.Obj("t", J.Now(), "down", down, "up", up)); if (history.Count > 90) history.RemoveAt(0); }
      Emit(J.Obj("type", "stats", "stats", Stats()));
      if (dirty && J.Now() - saved > 1500) Save();
      await Task.FromResult(0);
    }
    public object Stats() { lock (gate) {
      var values = records.Values.Select(row => row.Data).ToArray();
      return J.Obj("downSpeed", values.Sum(row => J.Num(row, "speed")), "upSpeed", values.Sum(row => J.Num(J.Get(row, "torrent"), "uploadSpeed")),
        "activeCount", values.Count(row => new [] { "connecting", "downloading", "verifying" }.Contains(J.Str(row, "status"))), "queuedCount", values.Count(row => J.Str(row, "status") == "queued"),
        "completedCount", values.Count(row => J.Str(row, "status") == "completed"), "totalDownloaded", values.Sum(row => J.Num(row, "downloaded")), "history", history.ToArray(), "torrentEngine", Torrent.Ready ? "ready" : "idle", "ytdlp", Media.Status("yt-dlp"), "ffmpeg", Media.Status("ffmpeg"));
    } }
    public object Snapshot() { lock (gate) {
      string directory = J.Str(Store.Settings, "downloadDir"); long free = 0; try { free = new DriveInfo(Path.GetPathRoot(Path.GetFullPath(directory))).AvailableFreeSpace; } catch { }
      return J.Obj("tasks", records.Values.Select(row => row.Data).ToArray(), "settings", Store.Settings, "stats", Stats(), "system", J.Obj("platform", "win32", "version", Environment.OSVersion.VersionString, "appVersion", Version, "freeDisk", free, "downloadDir", directory, "defaultDir", directory, "runtime", J.Obj("electron", "", "chrome", Runtime, "node", ""), "maximized", false, "autoStartSupported", true));
    } }
    public void BrowserImported() { Emit(J.Obj("type", "navigate", "view", "links")); if (RevealBrowserImport != null) RevealBrowserImport(); Toast("info", "Browser links received. Review them in Link Grabber."); }
    bool browserReady; string pendingBrowserUrl;
    public void BrowserDownloadRequested(string url) {
      lock (gate) { if (browserReady) Emit(J.Obj("type", "open-add", "url", url)); else pendingBrowserUrl = url; }
      if (RevealBrowserImport != null) RevealBrowserImport();
    }
    public async Task<object> Invoke(string method, object[] args) {
      Func<int, object> arg = index => index < args.Length ? args[index] : null;
      Func<int, string> str = index => Convert.ToString(arg(index)) ?? "";
      switch (method) {
        case "browserReady": {
          lock (gate) { browserReady = true; if (pendingBrowserUrl != null) { Emit(J.Obj("type", "open-add", "url", pendingBrowserUrl)); pendingBrowserUrl = null; } } return null;
        }
        case "connected": return await Connected(str(0), arg(1)).ConfigureAwait(false);
        case "snapshot": return Snapshot();
        case "addDownload": return Add(arg(0));
        case "addTorrent": return Add(arg(0), true);
        case "probe": return await Network.Probe(str(0), arg(1)).ConfigureAwait(false);
        case "probeYoutube": return await Media.Probe(str(0)).ConfigureAwait(false);
        case "pauseTask": case "cancelTask": await Pause(str(0)).ConfigureAwait(false); return null;
        case "resumeTask": case "retryTask": Resume(str(0)); return null;
        case "replaceUrl": await Replace(str(0), str(1)).ConfigureAwait(false); return null;
        case "removeTask": await Remove(str(0), Convert.ToBoolean(arg(1))).ConfigureAwait(false); return null;
        case "scheduleTask": {
          var row = Find(str(0)); if (row.Refreshing || (row.Work != null && !row.Work.IsCompleted) || !new [] { "paused", "queued", "error" }.Contains(J.Str(row.Data, "status"))) throw new Exception("Pause the download before scheduling");
          Patch(row, J.Obj("startAt", StartAt(J.Obj("startAt", arg(1))), "status", "queued", "error", null)); Save(); Schedule(); return null;
        }
        case "clearCompleted": { string[] ids; lock (gate) ids = records.Values.Where(row => J.Str(row.Data, "status") == "completed").Select(row => J.Str(row.Data, "id")).ToArray(); foreach (string id in ids) await Remove(id, false).ConfigureAwait(false); return null; }
        case "updateSettings": {
          var patch = J.Map(arg(0));
          if (patch.ContainsKey("vpnInterfaceId") || patch.ContainsKey("wakeToRun")) throw new Exception("Use Connected services to configure VPN binding and wake tasks");
          Store.Patch(patch); throttle.Set(J.Num(Store.Settings, "globalSpeedLimit")); await Torrent.Limits().ConfigureAwait(false); Emit(J.Obj("type", "settings", "settings", Store.Settings)); if (Ui != null) await Ui("applySettings", new object[0]).ConfigureAwait(false); Schedule(); return Store.Settings;
        }
        case "setSpeedLimit": return await Invoke("updateSettings", new object[] { J.Obj("globalSpeedLimit", Convert.ToInt64(arg(0))) }).ConfigureAwait(false);
        case "setTaskSpeedLimit": {
          var row = Find(str(0)); long limit = Convert.ToInt64(arg(1));
          if (J.Str(row.Data, "kind") != "http") throw new Exception("Per-download speed limits currently support direct downloads");
          if (limit < 0 || limit > 1099511627776L) throw new Exception("Invalid download speed limit");
          row.Limiter.Set(limit); Patch(row, J.Obj("speedLimit", limit)); Save(); return null;
        }
        case "setTaskChecksum": {
          var row = Find(str(0)); string hash = ExpectedHash(J.Obj("expectedSha256", str(1)));
          lock (gate) {
            if (J.Str(row.Data, "kind") != "http" || !new [] { "paused", "error" }.Contains(J.Str(row.Data, "status")) || (row.Work != null && !row.Work.IsCompleted)) throw new Exception("Pause the direct download before changing its expected checksum");
            Patch(row, J.Obj("expectedSha256", hash, "checksum", null)); Save();
          } return null;
        }
        case "setTaskCloseOnComplete": {
          var row = Find(str(0)); Patch(row, J.Obj("closeProgressOnComplete", Convert.ToBoolean(arg(1)))); Save(); return null;
        }
        case "linksList": return Inbox.List();
        case "linksImport": return Inbox.Import(str(0));
        case "linksRemove": Inbox.Remove(J.List(arg(0))); return null;
        case "linksProbe": await Inbox.Probe(J.List(arg(0))).ConfigureAwait(false); return null;
        case "scanStart": return await Inbox.Scan(arg(0)).ConfigureAwait(false);
        case "scanCancel": Inbox.CancelScan(); return null;
        case "linksDownload": {
          var ids = J.List(arg(0)); if (ids.Length > 2000) throw new Exception("Maximum 2000 selected links"); int added = 0; var errors = new List<string>();
          foreach (object id in ids) try { var link = Inbox.Find(Convert.ToString(id)); Add(J.Obj("url", J.Str(link, "url"), "kind", "http", "dir", str(1), "fileName", J.Str(link, "fileName"), "headers", J.Get(link, "headers"), "startAt", arg(2))); Inbox.Remove(new [] { id }); added++; } catch (Exception error) { errors.Add(error.Message); }
          return J.Obj("added", added, "errors", errors.ToArray());
        }
        case "instagramCollect": {
          var assets = await Media.Instagram(str(0)).ConfigureAwait(false); int count = Inbox.Add(assets.Select(asset => J.Str(asset, "url")), str(0));
          foreach (object link in Inbox.List()) { var asset = assets.FirstOrDefault(item => J.Str(item, "url") == J.Str(link, "url")); if (asset != null) Inbox.Patch(J.Str(link, "id"), J.Obj("fileName", J.Str(asset, "fileName"), "source", str(0), "headers", J.Obj("Referer", "https://www.instagram.com/"))); } return count;
        }
        case "installGallery": await Media.Install(true).ConfigureAwait(false); return null;
        case "installYtDlp": await Media.Install(false).ConfigureAwait(false); Emit(J.Obj("type", "stats", "stats", Stats())); return J.Obj("ok", true, "message", "yt-dlp installed from the official release");
        case "rescanTools": Emit(J.Obj("type", "stats", "stats", Stats())); return null;
        case "githubSearch": case "githubRepo": return await Github(method, str(0), arg(1)).ConfigureAwait(false);
        default: if (Ui != null) return await Ui(method, args).ConfigureAwait(false); throw new Exception("Unsupported desktop action: " + method);
      }
    }
    async Task<object> Github(string method, string query, object page) {
      var headers = J.Obj("Accept", "application/vnd.github+json"); string token = J.Str(Store.Settings, "githubToken"); if (token.Length > 0) headers["Authorization"] = "Bearer " + token;
      string url;
      if (method == "githubSearch") url = "https://api.github.com/search/repositories?q=" + Uri.EscapeDataString(query) + "&per_page=30&page=" + Math.Max(1, page == null ? 1 : Convert.ToInt32(page));
      else { if (!System.Text.RegularExpressions.Regex.IsMatch(query, "^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")) throw new Exception("Invalid repository name"); url = "https://api.github.com/repos/" + query; }
      var response = J.Decode(await Network.GithubText(url, headers).ConfigureAwait(false));
      if (method == "githubSearch") return J.Obj("total", J.Num(response, "total_count"), "items", J.List(J.Get(response, "items")).Select(MapRepo).ToArray());
      var result = MapRepo(response);
      var releases = J.List(J.Decode(await Network.GithubText(url + "/releases?per_page=30", headers).ConfigureAwait(false)));
      result["releases"] = releases.Where(release => !J.Bool(release, "draft")).Select(release => J.Obj("id", J.Get(release, "id"), "tagName", J.Str(release, "tag_name"), "name", J.Str(release, "name", J.Str(release, "tag_name")), "publishedAt", J.Get(release, "published_at"), "prerelease", J.Bool(release, "prerelease"), "draft", false, "htmlUrl", J.Get(release, "html_url"), "zipUrl", "https://github.com/" + query + "/archive/refs/tags/" + Uri.EscapeDataString(J.Str(release, "tag_name")) + ".zip", "tarballUrl", J.Get(release, "tarball_url"), "assets", J.List(J.Get(release, "assets")).Select(asset => J.Obj("id", J.Get(asset, "id"), "name", J.Str(asset, "name"), "size", J.Num(asset, "size"), "contentType", J.Str(asset, "content_type"), "downloadCount", J.Num(asset, "download_count"), "url", J.Str(asset, "browser_download_url"), "apiUrl", J.Str(asset, "url"))).ToArray())).ToArray();
      return result;
    }
    public object MobileSnapshot() { lock (gate) return J.Obj("stats", J.Obj("downSpeed", J.Num(Stats(), "downSpeed"), "upSpeed", J.Num(Stats(), "upSpeed")), "tasks", records.Values.OrderByDescending(row => J.Num(row.Data, "createdAt")).Take(500).Select(row => J.Obj("id", J.Str(row.Data, "id"), "name", J.Str(row.Data, "name"), "status", J.Str(row.Data, "status"), "size", J.Num(row.Data, "size"), "downloaded", J.Num(row.Data, "downloaded"))).ToArray()); }
    object ConnectedStatus() { return J.Obj("debridConfigured", debrid.Configured, "providers", debrid.Status(), "mobile", Mobile.Status(true), "interfaces", VpnBinding.Interfaces(), "vpnInterfaceId", J.Str(Store.Settings, "vpnInterfaceId"), "wakeEnabled", J.Bool(Store.Settings, "wakeToRun"), "wakeError", wakeError, "nextWake", NextWake()); }
    async Task<object> Connected(string action, object input) {
      switch (action) {
        case "status": return ConnectedStatus();
        case "installTool": {
          await ToolInstaller.Install(J.Str(input, "name"), Store, Network).ConfigureAwait(false);
          Emit(J.Obj("type", "stats", "stats", Stats())); return J.Obj("ok", true);
        }
        case "openChromiumExtensionFolder": return await Ui("openChromiumExtensionFolder", new object[0]).ConfigureAwait(false);
        case "debridSave": debrid.Save(J.Str(input, "provider", "real-debrid"), J.Str(input, "token").Trim()); return ConnectedStatus();
        case "debridAccount": return await debrid.Account(J.Str(input, "provider", "real-debrid")).ConfigureAwait(false);
        case "debridForget": debrid.Complete(J.Str(input, "provider", "real-debrid")); return ConnectedStatus();
        case "debridCollect": {
          string provider = J.Str(input, "provider", "real-debrid");
          var result = await debrid.Resolve(provider, J.Str(input, "url"), J.Bool(input, "checkPending")).ConfigureAwait(false);
          object[] links = J.List(J.Get(result, "links"));
          int count = Inbox.Add(links.Select(link => J.Str(link, "url")), provider);
          foreach (object link in links) foreach (object item in Inbox.List()) if (J.Str(item, "url") == J.Str(link, "url")) Inbox.Patch(J.Str(item, "id"), J.Obj("fileName", J.Str(link, "fileName"), "size", J.Num(link, "size")));
          if (!J.Bool(result, "pending")) debrid.Complete(provider);
          return J.Obj("added", count, "pending", J.Bool(result, "pending"));
        }
        case "mobileStart": return Mobile.Start(J.Str(input, "address"), testing);
        case "mobileStop": Mobile.Dispose(); return Mobile.Status();
        case "wake": {
          bool enable = J.Bool(input, "enabled"); wake.Sync(enable, NextWake()); Store.Patch(J.Obj("wakeToRun", enable)); wakeError = ""; Save(); return ConnectedStatus();
        }
        case "vpn": {
          string id = J.Str(input, "id");
          if (id.Length > 0 && !VpnBinding.Interfaces().Any(value => J.Str(value, "id") == id)) throw new Exception("Select an installed network interface");
          if (Torrent.Ready) throw new Exception("Restart Baran before changing VPN binding after using torrents");
          string[] ids; lock (gate) ids = records.Values.Where(row => row.Work != null && !row.Work.IsCompleted).Select(row => J.Str(row.Data, "id")).ToArray();
          foreach (string value in ids) await Pause(value).ConfigureAwait(false);
          Inbox.CancelScan(); Media.ConfigureRouting(() => Network.Configure(() => Store.Patch(J.Obj("vpnInterfaceId", id, "proxyMode", "direct"))));
          Emit(J.Obj("type", "settings", "settings", Store.Settings)); return ConnectedStatus();
        }
        default: throw new Exception("Unsupported connected service action");
      }
    }
    static Dictionary<string, object> MapRepo(object repo) {
      string name = J.Str(repo, "full_name"), branch = J.Str(repo, "default_branch", "main");
      return J.Obj("id", J.Get(repo, "id"), "fullName", name, "name", J.Str(repo, "name"), "owner", J.Str(J.Get(repo, "owner"), "login"), "ownerAvatar", J.Get(J.Get(repo, "owner"), "avatar_url"), "description", J.Get(repo, "description"), "htmlUrl", J.Get(repo, "html_url"), "stars", J.Num(repo, "stargazers_count"), "forks", J.Num(repo, "forks_count"), "openIssues", J.Num(repo, "open_issues_count"), "language", J.Get(repo, "language"), "license", J.Get(J.Get(repo, "license"), "spdx_id"), "updatedAt", J.Get(repo, "updated_at"), "defaultBranch", branch, "topics", J.List(J.Get(repo, "topics")).Take(8).ToArray(), "archived", J.Bool(repo, "archived"), "private", J.Bool(repo, "private"), "zipUrl", "https://github.com/" + name + "/archive/refs/heads/" + Uri.EscapeDataString(branch) + ".zip");
    }
    public async Task Stop() {
      if (closed) return; closed = true; timer.Dispose(); Mobile.Dispose(); Inbox.CancelScan();
      DownloadRecord[] values; lock (gate) values = records.Values.ToArray();
      foreach (var row in values) if (row.Cancel != null) row.Cancel.Cancel();
      await Task.WhenAll(values.Where(row => row.Work != null).Select(row => row.Work)).ConfigureAwait(false);
      Save(); Inbox.Dispose(); Torrent.Dispose(); Network.Dispose();
    }
    public void Dispose() { Stop().GetAwaiter().GetResult(); }
  }
}
