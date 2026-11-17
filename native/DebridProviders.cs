using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Baran {
  // Provider credentials never enter ordinary settings, returned jobs or URLs in the Inbox.
  public sealed class DebridProviders {
    public static readonly string[] Ids = { "real-debrid", "alldebrid", "premiumize", "torbox" };
    readonly Dictionary<string, UserSecrets> vaults = new Dictionary<string, UserSecrets>();
    readonly NativeNetwork network; readonly RealDebrid real;
    readonly SemaphoreSlim gate = new SemaphoreSlim(1, 1);
    readonly Dictionary<string, string> endpoints;
    readonly string jobsPath;
    readonly Dictionary<string, object> jobs;
    public DebridProviders(string root, NativeNetwork net, Dictionary<string, string> api = null) {
      network = net; jobsPath = Path.Combine(root, "debrid-jobs.json");
      jobs = File.Exists(jobsPath) ? J.Map(J.Decode(File.ReadAllText(jobsPath))) : J.Obj();
      foreach (string id in Ids) vaults[id] = new UserSecrets(root, id == "real-debrid" ? "connected-secrets" : "debrid-" + id);
      endpoints = api ?? new Dictionary<string, string> { {"real-debrid", "https://api.real-debrid.com/rest/1.0/"}, {"alldebrid", "https://api.alldebrid.com/v4/"}, {"premiumize", "https://www.premiumize.me/api/"}, {"torbox", "https://api.torbox.app/v1/api/"} };
      real = new RealDebrid(vaults["real-debrid"], net, endpoints["real-debrid"]);
    }
    static string Id(string id) { if (!Ids.Contains(id)) throw new Exception("Unsupported Debrid provider"); return id; }
    public object[] Status() { lock (jobs) return Ids.Select(id => (object)J.Obj("id", id, "configured", vaults[id].Exists, "pending", jobs.ContainsKey(id) ? jobs[id] : null)).ToArray(); }
    public bool Configured { get { return vaults["real-debrid"].Exists; } }
    public void Save(string id, string token) {
      Id(id); gate.Wait(); try { bool changed = vaults[id].Read() != token; vaults[id].Write(token); if (changed || token.Length == 0) Pending(id, null); } finally { gate.Release(); }
    }
    public void Complete(string id) { Pending(Id(id), null); }
    void Pending(string id, object value) { lock (jobs) { if (value == null) jobs.Remove(id); else jobs[id] = value; J.Atomic(jobsPath, jobs); } }
    async Task<object> Call(string id, string route, string form = null) {
      string token = vaults[id].Read(); if (token.Length == 0) throw new Exception("Connect your " + id + " account first");
      var data = J.Decode(await network.Api(endpoints[id] + route, J.Obj("Authorization", "Bearer " + token), form).ConfigureAwait(false));
      bool ok = id == "torbox" ? J.Bool(data, "success") : J.Str(data, "status") == "success";
      if (!ok) {
        // Provider messages may echo submitted URLs or credentials. Return stable codes only.
        string code = id == "alldebrid" ? J.Str(J.Get(data, "error"), "code") : id == "torbox" ? J.Str(data, "error") : J.Str(data, "error", "request_failed");
        code = System.Text.RegularExpressions.Regex.IsMatch(code, "^[A-Za-z0-9_-]{1,80}$") ? code : "request_failed";
        throw new Exception(id + ": " + code + ". Check the account, quota and supported host.");
      }
      return id == "premiumize" ? data : J.Get(data, "data");
    }
    public static object Link(string url, string name, long size, string token = "") {
      var parsed = J.Url(url);
      if (token.Length > 0 && (url.Contains(token) || url.Contains(Uri.EscapeDataString(token)))) throw new Exception("Provider returned a credential-bearing URL; it was not saved");
      return J.Obj("url", parsed.AbsoluteUri, "fileName", J.SafeName(name.Length > 0 ? name : Path.GetFileName(parsed.AbsolutePath)), "size", Math.Max(0, size));
    }
    public async Task<object> Account(string id) {
      Id(id); if (id == "real-debrid") return await real.Request("user", "").ConfigureAwait(false);
      var data = await Call(id, id == "alldebrid" ? "user" : id == "premiumize" ? "account/info" : "user/me").ConfigureAwait(false);
      if (id == "alldebrid") { var user = J.Get(data, "user"); return J.Obj("username", J.Str(user, "username"), "type", J.Bool(user, "isPremium") ? "premium" : "free"); }
      return J.Obj("username", id == "premiumize" ? J.Str(data, "customer_id") : "TorBox", "type", id == "premiumize" ? (J.Num(data, "premium_until") > J.Now()/1000 ? "premium" : "standard") : J.Str(data, "plan"));
    }
    public async Task<object> Resolve(string id, string input, bool checkPending = false) {
      Id(id); await gate.WaitAsync().ConfigureAwait(false);
      try {
        string token = vaults[id].Read(); if (token.Length == 0) throw new Exception("Connect your " + id + " account first");
        string url = checkPending ? "" : J.Url(input).AbsoluteUri;
        object job; lock (jobs) job = jobs.ContainsKey(id) ? jobs[id] : null;
        if (!checkPending && job != null) throw new Exception("Check or forget the existing pending provider job before creating another");
        if (checkPending && job == null) throw new Exception("No pending provider job");
        var links = new List<object>();
        if (id == "real-debrid") links.Add(await real.Request("unrestrict/link", url).ConfigureAwait(false));
        else if (id == "premiumize") {
          var result = await Call(id, "transfer/directdl", "src=" + Uri.EscapeDataString(url)).ConfigureAwait(false);
          foreach (var item in J.List(J.Get(result, "content"))) links.Add(Link(J.Str(item, "link"), Path.GetFileName(J.Str(item, "path")), J.Num(item, "size"), token));
        } else if (id == "alldebrid") {
          var result = await Call(id, checkPending ? "link/delayed" : "link/unlock", checkPending ? "id=" + Uri.EscapeDataString(J.Str(job, "id")) : "link=" + Uri.EscapeDataString(url)).ConfigureAwait(false);
          if (J.Str(result, "link").Length == 0) {
            string delayed = checkPending ? J.Str(job, "id") : J.Str(result, "delayed");
            if (delayed.Length == 0) throw new Exception("AllDebrid requires a stream/quality selection; use its website for this link");
            if (checkPending && J.Num(result, "status") == 3) { Pending(id, null); throw new Exception("AllDebrid delayed job failed"); }
            Pending(id, J.Obj("id", delayed)); return J.Obj("pending", true, "links", new object[0]);
          }
          links.Add(Link(J.Str(result, "link"), J.Str(result, "filename"), J.Num(result, "filesize"), token));
        } else {
          string jobId;
          if (!checkPending) {
            var created = await Call(id, "webdl/createwebdownload", "link=" + Uri.EscapeDataString(url)).ConfigureAwait(false);
            jobId = J.Str(created, "webdownload_id"); if (jobId.Length == 0) throw new Exception("TorBox did not return a web-download ID");
            Pending(id, J.Obj("id", jobId));
          } else jobId = J.Str(job, "id");
          var listing = await Call(id, "webdl/mylist?id=" + Uri.EscapeDataString(jobId)).ConfigureAwait(false);
          var items = listing is Dictionary<string, object> ? new [] { listing } : J.List(listing);
          var ready = items.FirstOrDefault(item => J.Str(item, "id") == jobId && J.Bool(item, "download_finished"));
          if (ready == null) return J.Obj("pending", true, "links", new object[0]);
          foreach (var file in J.List(J.Get(ready, "files"))) {
            var result = await Call(id, "webdl/requestdl?token=" + Uri.EscapeDataString(token) + "&web_id=" + Uri.EscapeDataString(jobId) + "&file_id=" + Uri.EscapeDataString(J.Str(file, "id")) + "&redirect=false").ConfigureAwait(false);
            links.Add(Link(Convert.ToString(result), J.Str(file, "short_name", J.Str(file, "name")), J.Num(file, "size"), token));
            if (links.Count > 1000) throw new Exception("Provider result exceeds 1000 files");
          }
        }
        if (links.Count == 0 || links.Count > 1000) throw new Exception("Provider returned no usable files or too many files");
        var checkedLinks = links.Select(link => Link(J.Str(link, "url"), J.Str(link, "fileName"), J.Num(link, "size"), token)).ToArray();
        return J.Obj("pending", false, "links", checkedLinks);
      } finally { gate.Release(); }
    }
  }
}
