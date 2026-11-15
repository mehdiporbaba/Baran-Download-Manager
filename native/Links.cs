using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using HtmlAgilityPack;

namespace Baran {
  public sealed class Links : IDisposable {
    readonly NativeNetwork network; readonly Action changed;
    readonly object gate = new object();
    readonly List<Dictionary<string, object>> inbox = new List<Dictionary<string, object>>();
    CancellationTokenSource scan;
    readonly string file; readonly Timer persistTimer;
    public Links(NativeNetwork net, Action notify, string profile) {
      network = net; changed = notify; file = Path.Combine(profile, "baran-inbox.json");
      persistTimer = new Timer(state => { lock (gate) { try { Save(); } catch { } } }, null, Timeout.Infinite, Timeout.Infinite);
      if (!File.Exists(file)) return;
      var saved = J.Decode(File.ReadAllText(file));
      var urls = new HashSet<string>();
      foreach (object value in J.List(J.Get(saved, "links")).Take(5000)) {
        try {
          var item = new Dictionary<string, object>(J.Map(value)); string url = J.Url(J.Str(item, "url")).AbsoluteUri;
          if (!urls.Add(url)) continue;
          item["url"] = url; if (J.Str(item, "id").Length == 0) item["id"] = Guid.NewGuid().ToString("N");
          if (J.Str(item, "status") == "checking") item["status"] = "new";
          inbox.Add(item);
        } catch { }
      }
    }
    void Save() { persistTimer.Change(Timeout.Infinite, Timeout.Infinite); J.Atomic(file, J.Obj("version", 1, "links", inbox.ToArray())); }
    public object[] List() { lock (gate) return inbox.Select(link => (object)new Dictionary<string, object>(link)).ToArray(); }
    public Dictionary<string, object> Find(string id) { lock (gate) { var item = inbox.FirstOrDefault(row => J.Str(row, "id") == id); if (item == null) throw new Exception("Link is no longer in the inbox"); return item; } }
    public int Add(IEnumerable<string> values, string source = "paste") {
      string[] input = values.ToArray(); if (input.Length > 2000) throw new Exception("Maximum 2000 links per import");
      var valid = new HashSet<string>();
      foreach (string value in input) { try { valid.Add(J.Url(value).AbsoluteUri); } catch { } }
      int count = 0;
      lock (gate) {
        var known = new HashSet<string>(inbox.Select(row => J.Str(row, "url")));
        string[] fresh = valid.Where(url => !known.Contains(url)).ToArray();
        if (inbox.Count + fresh.Length > 5000) throw new Exception("The review inbox is full (5000 links)");
        foreach (string url in fresh) { inbox.Add(J.Obj("id", Guid.NewGuid().ToString("N"), "url", url, "fileName", J.SafeName(Uri.UnescapeDataString(Path.GetFileName(new Uri(url).AbsolutePath))), "source", source, "status", "new")); count++; }
        Save();
      }
      changed(); return count;
    }
    public int Import(string text) {
      if (text == null || text.Length > 2000000) throw new Exception("Input text is too large");
      return Add(Regex.Matches(text, "https?://[^\\s<>\"']+", RegexOptions.IgnoreCase).Cast<Match>().Select(match => match.Value.TrimEnd(',', ')', ']', ';')));
    }
    public void Remove(object[] ids) { if (ids.Length > 2000) throw new Exception("Maximum 2000 selected links"); var selection = new HashSet<string>(ids.Select(Convert.ToString)); lock (gate) { inbox.RemoveAll(row => selection.Contains(J.Str(row, "id"))); Save(); } changed(); }
    public void Patch(string id, Dictionary<string, object> patch) { lock (gate) { var item = Find(id); foreach (var entry in patch) item[entry.Key] = entry.Value; persistTimer.Change(700, Timeout.Infinite); } changed(); }
    public async Task Probe(object[] ids) {
      if (ids.Length > 2000) throw new Exception("Maximum 2000 selected links");
      using (var slots = new SemaphoreSlim(4)) await Task.WhenAll(ids.Select(async id => {
        await slots.WaitAsync().ConfigureAwait(false);
        try {
          var item = Find(Convert.ToString(id)); Patch(J.Str(item, "id"), J.Obj("status", "checking", "error", null));
          Dictionary<string, object> result = null; string error = null;
          try { result = await network.Probe(J.Str(item, "url"), J.Get(item, "headers")).ConfigureAwait(false); } catch (Exception failure) { error = failure.Message; }
          if (error != null) Patch(J.Str(item, "id"), J.Obj("status", "error", "error", error));
          else { result["status"] = "ready"; Patch(J.Str(item, "id"), result); }
        } finally { slots.Release(); }
      })).ConfigureAwait(false);
    }
    public void CancelScan() { lock (gate) if (scan != null) scan.Cancel(); }
    public async Task<object> Scan(object input) {
      var seed = J.Url(J.Str(input, "url")); int depth = (int)J.Num(input, "depth", 2), maximum = (int)J.Num(input, "maxPages", 30);
      if (depth < 0 || depth > 5 || maximum < 1 || maximum > 100) throw new Exception("Scan limits: depth 0–5 and 1–100 pages");
      string folder = seed.AbsolutePath.EndsWith("/") ? seed.AbsolutePath : seed.AbsolutePath.Substring(0, seed.AbsolutePath.LastIndexOf('/') + 1);
      Func<Uri, bool> inside = url => url.GetLeftPart(UriPartial.Authority) == seed.GetLeftPart(UriPartial.Authority) && url.AbsolutePath.StartsWith(folder, StringComparison.Ordinal);
      var cancel = new CancellationTokenSource(90000);
      lock (gate) { if (scan != null) { cancel.Dispose(); throw new Exception("A scan is already running"); } scan = cancel; }
      var queue = new Queue<Tuple<Uri, int>>(); var visited = new HashSet<string>(); var files = new HashSet<string>(); var errors = new List<string>(); int pages = 0; bool limited = false, canceled = false;
      queue.Enqueue(Tuple.Create(seed, 0));
      try {
        while (queue.Count > 0) {
          cancel.Token.ThrowIfCancellationRequested();
          if (pages >= maximum || files.Count >= 2000) { limited = true; break; }
          var next = queue.Dequeue(); if (!visited.Add(next.Item1.AbsoluteUri)) continue; pages++;
          try {
            Uri url = next.Item1; string html = null;
            for (int redirects = 0; redirects < 9; redirects++) {
              if (!inside(url)) throw new Exception("Redirect outside the selected origin/folder was blocked");
              using (var response = await network.Open(url.AbsoluteUri, null, cancel.Token, redirects: false).ConfigureAwait(false))
              using (cancel.Token.Register(response.Close)) {
                int status = (int)response.StatusCode;
                if (status >= 300 && status < 400) { url = new Uri(url, response.Headers["Location"]); continue; }
                if (status != 200) throw new Exception("HTTP " + status);
                if (!(response.ContentType ?? "").ToLowerInvariant().Contains("html")) { if (files.Add(url.AbsoluteUri)) Add(new [] { url.AbsoluteUri }, seed.AbsoluteUri); break; }
                if (response.ContentLength > 2 * 1024 * 1024) throw new Exception("HTML exceeds 2 MB");
                html = Encoding.UTF8.GetString(await NativeNetwork.Read(response.GetResponseStream(), 2 * 1024 * 1024, cancel.Token).ConfigureAwait(false)); break;
              }
            }
            if (html == null) continue;
            var document = new HtmlDocument(); document.LoadHtml(html); var pageFiles = new List<string>();
            foreach (var node in document.DocumentNode.SelectNodes("//a[@href]|//area[@href]|//video[@src]|//audio[@src]|//source[@src]") ?? new HtmlNodeCollection(null)) {
              string raw = HtmlEntity.DeEntitize(node.GetAttributeValue("href", node.GetAttributeValue("src", "")));
              Uri candidate; if (!Uri.TryCreate(url, raw, out candidate) || !inside(candidate)) continue;
              try { candidate = J.Url(candidate.AbsoluteUri); } catch { continue; }
              bool file = node.Attributes["download"] != null || Regex.IsMatch(candidate.AbsolutePath, "\\.(zip|rar|7z|exe|msi|pdf|mp4|mkv|mp3|m4a|jpg|jpeg|png|webp|iso|torrent|txt|csv|docx|xlsx|tar|gz)$", RegexOptions.IgnoreCase);
              if (file) { if (files.Count >= 2000) { limited = true; break; } if (files.Add(candidate.AbsoluteUri)) pageFiles.Add(candidate.AbsoluteUri); }
              else if (next.Item2 < depth && !visited.Contains(candidate.AbsoluteUri) && queue.Count < 1000) queue.Enqueue(Tuple.Create(candidate, next.Item2 + 1));
            }
            if (pageFiles.Count > 0) Add(pageFiles, seed.AbsoluteUri);
          } catch (OperationCanceledException) { throw; }
          catch (Exception error) { if (cancel.IsCancellationRequested) throw new OperationCanceledException(); errors.Add(error.Message); }
        }
      } catch (OperationCanceledException) { canceled = true; }
      finally { lock (gate) scan = null; cancel.Dispose(); }
      return J.Obj("pages", pages, "found", files.Count, "limited", limited, "canceled", canceled, "errors", errors.Take(100).ToArray());
    }
    public void Dispose() { CancelScan(); lock (gate) { Save(); persistTimer.Dispose(); } }
  }
}
