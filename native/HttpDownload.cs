using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;

namespace Baran {
  public sealed class DownloadRecord {
    public Dictionary<string, object> Data;
    public CancellationTokenSource Cancel;
    public Task Work;
    public bool Refreshing;
    public long LastEmit;
    public readonly RateLimiter Limiter = new RateLimiter();
    public DownloadRecord(Dictionary<string, object> data) { Data = data; }
  }
  public sealed class RateLimiter {
    readonly object gate = new object(); double available, updated = Clock; long limit;
    static double Clock { get { return 1000.0 * Stopwatch.GetTimestamp() / Stopwatch.Frequency; } }
    public void Set(long bytes) { lock (gate) { if (limit == bytes) return; limit = bytes; available = 0; updated = Clock; } }
    public void Reset(long bytes) { lock (gate) { limit = bytes; available = 0; updated = Clock; } }
    public async Task Consume(int bytes, CancellationToken token) {
      // Spend accrued tokens, never reserve time in the future. A canceled
      // worker therefore leaves no throttle debt for other tasks or resume.
      while (bytes > 0) {
        token.ThrowIfCancellationRequested(); int wait;
        lock (gate) {
          if (limit <= 0) return;
          double now = Clock;
          available = Math.Min(Math.Max(65536.0, limit / 5.0), available + Math.Max(0, now - updated) * limit / 1000.0); updated = now;
          int chunk = Math.Min(65536, bytes);
          if (available >= chunk) { available -= chunk; bytes -= chunk; continue; }
          wait = (int)Math.Min(200, Math.Max(1, Math.Ceiling((chunk - available) * 1000.0 / limit)));
        }
        await Task.Delay(wait, token).ConfigureAwait(false);
      }
    }
  }
  public sealed class HttpDownload {
    static readonly object paths = new object();
    readonly NativeNetwork network; readonly StateStore store; readonly RateLimiter throttle;
    readonly Action<DownloadRecord, Dictionary<string, object>> patch;
    public HttpDownload(NativeNetwork net, StateStore state, RateLimiter limiter, Action<DownloadRecord, Dictionary<string, object>> update) { network = net; store = state; throttle = limiter; patch = update; }
    static long Saved(object meta) { return J.List(J.Get(meta, "segments")).Sum(s => Math.Max(0, J.Num(s, "position") - J.Num(s, "start"))); }
    public async Task Start(DownloadRecord task, CancellationToken token) {
      string final = J.Str(task.Data, "filePath");
      if (String.IsNullOrEmpty(final)) final = Path.Combine(J.Str(task.Data, "dir"), J.SafeName(J.Str(task.Data, "fileName")));
      Directory.CreateDirectory(Path.GetDirectoryName(final));
      string part = final + ".pulse-part", sidecar = final + ".pulse-meta";
      Dictionary<string, object> meta = null;
      if (!String.IsNullOrEmpty(J.Str(task.Data, "filePath")) && File.Exists(part) && File.Exists(sidecar)) meta = J.Map(J.Decode(File.ReadAllText(sidecar)));
      if (meta == null && J.Num(task.Data, "downloaded") > 0) throw new Exception("Partial metadata is missing. Your saved files were kept.");
      if (meta == null) {
        var probe = await network.Probe(J.Str(task.Data, "url"), J.Get(task.Data, "headers")).ConfigureAwait(false);
        token.ThrowIfCancellationRequested();
        string contentType = J.Str(probe, "contentType").Split(';')[0].Trim().ToLowerInvariant();
        string requestedExtension = Path.GetExtension(J.Str(task.Data, "fileName")).ToLowerInvariant();
        if ((contentType == "text/html" || contentType == "application/xhtml+xml") && requestedExtension.Length > 0 && !new [] { ".html", ".htm", ".xhtml", ".txt" }.Contains(requestedExtension))
          throw new InvalidDataException("The link returned an HTML page instead of the requested file. Open its source page and obtain an authorized direct download link; a login or challenge page was not saved as your file.");
        string guessed = J.SafeName(Uri.UnescapeDataString(Path.GetFileName(new Uri(J.Str(task.Data, "url")).AbsolutePath)));
        if (J.Str(task.Data, "fileName") == guessed && J.Str(probe, "fileName").Length > 0) final = Path.Combine(J.Str(task.Data, "dir"), J.SafeName(J.Str(probe, "fileName")));
        lock (paths) {
        if (File.Exists(final) || File.Exists(final + ".pulse-part")) {
          string stem = Path.GetFileNameWithoutExtension(final), extension = Path.GetExtension(final); int n = 1;
          while (File.Exists(final) || File.Exists(final + ".pulse-part")) final = Path.Combine(J.Str(task.Data, "dir"), stem + " (" + n++ + ")" + extension);
          part = final + ".pulse-part"; sidecar = final + ".pulse-meta";
        }
        long size = J.Num(probe, "size"); int connections = (int)J.Num(task.Data, "maxConnections", J.Num(store.Settings, "connections", 8));
        connections = J.Bool(probe, "resumable") && size >= 2 * 1024 * 1024 ? Math.Min(32, Math.Max(1, connections)) : 1;
        var segments = new List<object>();
        for (int i = 0; i < connections; i++) { long start = size * i / connections; segments.Add(J.Obj("start", start, "position", start, "end", size * (i + 1) / connections)); }
        meta = J.Obj("version", 1, "finalUrl", J.Str(probe, "finalUrl"), "size", size, "etag", J.Get(probe, "etag"), "lastModified", J.Get(probe, "lastModified"), "resumable", J.Bool(probe, "resumable"), "segments", segments.ToArray(), "downloaded", 0, "savedAt", J.Now());
        part = final + ".pulse-part"; sidecar = final + ".pulse-meta";
        using (var output = new FileStream(part, FileMode.CreateNew, FileAccess.Write, FileShare.ReadWrite)) { if (size > 0) output.SetLength(size); }
        J.Atomic(sidecar, meta);
        }
      }
      if (J.Num(meta, "version") != 1) throw new Exception("Unsupported partial metadata format");
      if (J.Num(meta, "size") == 0 && Saved(meta) > 0) throw new Exception("This server did not provide a total size. The partial file was kept, but safe continuation cannot be confirmed.");
      var location = J.Obj("filePath", final, "fileName", Path.GetFileName(final), "category", Core.Category(Path.GetFileName(final)), "size", J.Num(meta, "size"), "downloaded", Saved(meta), "resumable", J.Bool(meta, "resumable"), "status", "downloading", "error", null);
      if (J.Str(task.Data, "name") == J.Str(task.Data, "fileName")) location["name"] = Path.GetFileName(final);
      patch(task, location);
      object gate = new object(); long lastSave = 0;
      Action<bool> save = force => { lock (gate) {
        meta["downloaded"] = Saved(meta); meta["savedAt"] = J.Now();
        // UI snapshots must not retain dictionaries that workers mutate while
        // another window serializes them on a different thread.
        patch(task, J.Obj("downloaded", J.Num(meta, "downloaded"), "segments", J.List(J.Get(meta, "segments")).Select(segment => new Dictionary<string, object>(J.Map(segment))).ToArray()));
        if (force || J.Now() - lastSave > 1500) { J.Atomic(sidecar, meta); lastSave = J.Now(); }
      } };
      using (var transfer = CancellationTokenSource.CreateLinkedTokenSource(token)) {
        var segments = J.List(J.Get(meta, "segments"));
        patch(task, J.Obj("connections", segments.Count(s => J.Num(s, "position") < J.Num(s, "end"))));
        Func<object, Task> download = async item => {
          var segment = J.Map(item); int attempt = 0;
          while (J.Num(meta, "size") == 0 || J.Num(segment, "position") < J.Num(segment, "end")) {
            transfer.Token.ThrowIfCancellationRequested();
            long start = J.Num(segment, "position"), end = J.Num(segment, "end");
            bool ranged = J.Num(meta, "size") > 0 && (J.Bool(meta, "resumable") || start > 0 || segments.Length > 1);
            var headers = NativeNetwork.Headers(J.Get(task.Data, "headers"));
            string etag = J.Str(meta, "etag"); if (ranged && etag.StartsWith("\"")) headers["If-Range"] = etag;
            bool retry = false;
            try {
              using (var response = await network.Open(J.Str(meta, "finalUrl"), headers, transfer.Token, ranged ? (long?)start : null, ranged ? (long?)(end - 1) : null).ConfigureAwait(false))
              using (transfer.Token.Register(response.Close)) {
                int status = (int)response.StatusCode;
                if (status == 401 || status == 403) throw new InvalidDataException("The link expired or access was refused (HTTP 401/403). The partial file was kept. Use Replace expired link.");
                if (status < 200 || status >= 300) throw new IOException("HTTP " + status);
                if ((ranged && (status != 206 || response.Headers["Content-Range"] != "bytes " + start + "-" + (end-1) + "/" + J.Num(meta, "size"))) || (!String.IsNullOrEmpty(etag) && !String.IsNullOrEmpty(response.Headers["ETag"]) && etag != response.Headers["ETag"])) throw new InvalidDataException("The server changed the file or rejected its range. The partial file was kept.");
                using (var output = new FileStream(part, FileMode.Open, FileAccess.Write, FileShare.ReadWrite, 65536, true))
                using (var input = response.GetResponseStream()) {
                  output.Position = start; var buffer = new byte[65536];
                  while (true) {
                    int count = await input.ReadAsync(buffer, 0, buffer.Length, transfer.Token).ConfigureAwait(false);
                    if (count == 0) break;
                    if (J.Num(meta, "size") > 0 && J.Num(segment, "position") + count > end) throw new InvalidDataException("The server sent bytes outside the requested range");
                    await task.Limiter.Consume(count, transfer.Token).ConfigureAwait(false);
                    await throttle.Consume(count, transfer.Token).ConfigureAwait(false);
                    await output.WriteAsync(buffer, 0, count, transfer.Token).ConfigureAwait(false);
                    lock (gate) segment["position"] = J.Num(segment, "position") + count;
                    save(false);
                  }
                  await output.FlushAsync(transfer.Token).ConfigureAwait(false);
                }
                if (J.Num(meta, "size") == 0) { lock (gate) { meta["size"] = J.Num(segment, "position"); segment["end"] = J.Num(segment, "position"); } break; }
                if (J.Num(segment, "position") < end) throw new IOException("Incomplete range response");
              }
              attempt = 0;
            } catch (InvalidDataException) { throw; }
            catch (Exception) { transfer.Token.ThrowIfCancellationRequested(); if (++attempt > 5) throw; retry = true; }
            if (retry) await Task.Delay(Math.Min(5000, 350 * (1 << attempt)), transfer.Token).ConfigureAwait(false);
          }
        };
        Exception failure = null;
        var workers = segments.Select(segment => Task.Run(async () => { try { await download(segment).ConfigureAwait(false); } catch (Exception error) { Interlocked.CompareExchange(ref failure, error, null); transfer.Cancel(); throw; } })).ToArray();
        try { await Task.WhenAll(workers).ConfigureAwait(false); }
        catch { if (token.IsCancellationRequested) throw new OperationCanceledException(token); throw failure ?? new IOException("Download failed"); }
        finally { save(true); }
      }
      token.ThrowIfCancellationRequested();
      if (new FileInfo(part).Length != J.Num(meta, "size") || Saved(meta) != J.Num(meta, "size")) throw new IOException("Downloaded file length does not match its source");
      string expected = J.Str(task.Data, "expectedSha256");
      if (expected.Length > 0) {
        patch(task, J.Obj("status", "verifying", "speed", 0, "eta", 0, "connections", 0));
        using (var sha = SHA256.Create()) using (var file = new FileStream(part, FileMode.Open, FileAccess.Read, FileShare.Read, 65536, true)) {
          var bytes = new byte[65536]; int count;
          while ((count = await file.ReadAsync(bytes, 0, bytes.Length, token).ConfigureAwait(false)) > 0) { token.ThrowIfCancellationRequested(); sha.TransformBlock(bytes, 0, count, bytes, 0); }
          sha.TransformFinalBlock(new byte[0], 0, 0);
          string actual = BitConverter.ToString(sha.Hash).Replace("-", "").ToLowerInvariant();
          patch(task, J.Obj("checksum", actual));
          if (!String.Equals(actual, expected, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("SHA-256 mismatch. The partial file was preserved and was not published as a completed download.");
        }
      }
      token.ThrowIfCancellationRequested();
      if (File.Exists(final)) throw new IOException("A file with this destination already exists; the partial download was preserved");
      File.Move(part, final); File.Delete(sidecar);
      patch(task, J.Obj("status", "completed", "downloaded", J.Num(meta, "size"), "size", J.Num(meta, "size"), "speed", 0, "eta", 0, "connections", 0, "completedAt", J.Now()));
    }
    public async Task<Dictionary<string, object>> Replace(DownloadRecord task, string input) {
      string url = J.Url(input).AbsoluteUri, path = J.Str(task.Data, "filePath");
      string sidecar = path + ".pulse-meta", part = path + ".pulse-part";
      var meta = J.Map(J.Decode(File.ReadAllText(sidecar))); string etag = J.Str(meta, "etag");
      if (!J.Bool(meta, "resumable") || Saved(meta) <= 0 || !System.Text.RegularExpressions.Regex.IsMatch(etag, "^\"[^\"\\r\\n]*\"$")) throw new Exception("Safe replacement requires a saved partial file and the original server's strong ETag");
      bool crossOrigin = new Uri(J.Str(task.Data, "url")).GetLeftPart(UriPartial.Authority) != new Uri(url).GetLeftPart(UriPartial.Authority);
      var headers = NativeNetwork.Headers(J.Get(task.Data, "headers"));
      foreach (string key in headers.Keys.ToArray()) if (System.Text.RegularExpressions.Regex.IsMatch(key, "^(range|if-range|host)$", System.Text.RegularExpressions.RegexOptions.IgnoreCase) || (crossOrigin && System.Text.RegularExpressions.Regex.IsMatch(key, "^(authorization|cookie|proxy-authorization|referer)$", System.Text.RegularExpressions.RegexOptions.IgnoreCase))) headers.Remove(key);
      var probe = await network.Probe(url, headers.ToDictionary(p => p.Key, p => (object)p.Value)).ConfigureAwait(false);
      if (J.Num(probe, "size") != J.Num(meta, "size") || J.Str(probe, "etag") != etag || !J.Bool(probe, "resumable")) throw new Exception("The new URL is not the same resumable file. The old partial file was kept.");
      using (var file = File.OpenRead(part))
      using (var cancel = new CancellationTokenSource(45000)) {
        foreach (object segment in J.List(J.Get(meta, "segments"))) {
          long start = J.Num(segment, "start"), position = J.Num(segment, "position"), end = J.Num(segment, "end");
          if (start < 0 || position < start || position > end || end > J.Num(meta, "size")) throw new Exception("Invalid saved segment");
          int count = (int)Math.Min(8192, position - start); if (count == 0) continue;
          foreach (long offset in new [] { start, position - count }.Distinct()) {
            using (var response = await network.Open(J.Str(probe, "finalUrl"), headers, cancel.Token, offset, offset + count - 1).ConfigureAwait(false))
            using (cancel.Token.Register(response.Close)) {
              if ((int)response.StatusCode != 206 || response.Headers["ETag"] != etag || response.Headers["Content-Range"] != "bytes " + offset + "-" + (offset + count - 1) + "/" + J.Num(meta, "size")) throw new Exception("The server did not confirm the requested range");
              byte[] remote = await NativeNetwork.Read(response.GetResponseStream(), count, cancel.Token).ConfigureAwait(false);
              var local = new byte[count]; file.Position = offset; int read = 0;
              while (read < count) { int n = file.Read(local, read, count - read); if (n == 0) break; read += n; }
              if (read != count || remote.Length != count || !local.SequenceEqual(remote)) throw new Exception("Replacement file contents differ; the original partial download was kept");
            }
          }
        }
      }
      meta["finalUrl"] = J.Str(probe, "finalUrl"); meta["savedAt"] = J.Now(); J.Atomic(sidecar, meta);
      return J.Obj("url", url, "headers", headers);
    }
  }
}
