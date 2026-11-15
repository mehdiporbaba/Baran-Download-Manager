using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Baran {
  public sealed class Torrents : IDisposable {
    readonly StateStore store; readonly string executable; readonly bool testing;
    readonly SemaphoreSlim startGate = new SemaphoreSlim(1, 1);
    readonly string secret = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
    Process process; int port; bool closed;
    public bool Ready { get { return process != null && !process.HasExited; } }
    public Torrents(StateStore state, string root, bool test) { store = state; executable = Path.Combine(root, "bin", "aria2c.exe"); testing = test; }
    public async Task Start() {
      await startGate.WaitAsync().ConfigureAwait(false);
      try {
        if (Ready) return;
        if (closed) throw new ObjectDisposedException("Torrent engine");
        if (!File.Exists(executable)) throw new Exception("The bundled torrent engine is missing");
        var reserve = new TcpListener(IPAddress.Loopback, 0); reserve.Start(); port = ((IPEndPoint)reserve.LocalEndpoint).Port; reserve.Stop();
        var args = new List<string> { "--enable-rpc=true", "--rpc-listen-all=false", "--rpc-allow-origin-all=false", "--rpc-max-request-size=48M", "--rpc-listen-port=" + port,
          "--rpc-secret=" + secret, "--enable-color=false", "--console-log-level=error", "--summary-interval=0", "--disable-ipv6=false",
          "--continue=true", "--allow-overwrite=false", "--auto-file-renaming=false", "--check-integrity=true", "--follow-torrent=true",
          "--listen-port=" + J.Num(store.Settings, "torrentPort", 51413), "--dht-listen-port=" + J.Num(store.Settings, "torrentPort", 51413),
          "--max-overall-download-limit=" + J.Num(store.Settings, "torrentDownloadLimit"), "--max-overall-upload-limit=" + J.Num(store.Settings, "torrentUploadLimit") };
        if (testing) args.AddRange(new [] { "--enable-dht=false", "--enable-dht6=false", "--enable-peer-exchange=false", "--bt-enable-lpd=false" });
        process = Process.Start(new ProcessStartInfo(executable, String.Join(" ", args.Select(J.Quote))) { UseShellExecute = false, CreateNoWindow = true, WorkingDirectory = store.Root, RedirectStandardOutput = true, RedirectStandardError = true });
        process.BeginOutputReadLine(); process.BeginErrorReadLine();
        Exception last = null;
        for (int i = 0; i < 60; i++) {
          if (process.HasExited) throw new Exception("Torrent engine exited with code " + process.ExitCode);
          try { await Rpc("getVersion").ConfigureAwait(false); return; } catch (Exception error) { last = error; }
          await Task.Delay(100).ConfigureAwait(false);
        }
        throw new Exception("Torrent engine did not become ready", last);
      } finally { startGate.Release(); }
    }
    async Task<object> Rpc(string method, params object[] args) {
      var values = new List<object> { "token:" + secret }; values.AddRange(args);
      byte[] body = Encoding.UTF8.GetBytes(J.Encode(J.Obj("jsonrpc", "2.0", "id", Guid.NewGuid().ToString("N"), "method", "aria2." + method, "params", values.ToArray())));
      var request = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + port + "/jsonrpc");
      request.Proxy = null; request.Method = "POST"; request.ContentType = "application/json"; request.ContentLength = body.Length; request.Timeout = 10000;
      using (var timeout = new CancellationTokenSource(10000))
      using (timeout.Token.Register(request.Abort)) {
      using (var output = await request.GetRequestStreamAsync().ConfigureAwait(false)) await output.WriteAsync(body, 0, body.Length).ConfigureAwait(false);
      using (var response = (HttpWebResponse)await request.GetResponseAsync().ConfigureAwait(false))
      using (var input = new StreamReader(response.GetResponseStream())) {
        var result = J.Map(J.Decode(await input.ReadToEndAsync().ConfigureAwait(false)));
        if (result.ContainsKey("error")) throw new Exception("Torrent engine: " + J.Str(J.Get(result, "error"), "message"));
        return J.Get(result, "result");
      }
      }
    }
    public async Task Limits() { if (Ready) await Rpc("changeGlobalOption", J.Obj("max-overall-download-limit", J.Num(store.Settings, "torrentDownloadLimit").ToString(), "max-overall-upload-limit", J.Num(store.Settings, "torrentUploadLimit").ToString())).ConfigureAwait(false); }
    public async Task<string> Add(DownloadRecord record) {
      await Start().ConfigureAwait(false);
      var options = J.Obj("dir", J.Str(record.Data, "dir"), "seed-time", J.Bool(store.Settings, "seedAfterComplete") ? "2147483647" : "0", "seed-ratio", "0", "bt-save-metadata", "true", "bt-prioritize-piece", J.Bool(J.Get(record.Data, "torrent"), "sequential", true) ? "head=64M,tail=1M" : "");
      object[] indices = J.List(J.Get(record.Data, "fileIndices"));
      if (indices.Length > 0) options["select-file"] = String.Join(",", indices.Select(i => (Convert.ToInt32(i) + 1).ToString()));
      var torrent = J.Get(record.Data, "torrent"); string file = J.Str(torrent, "torrentFile");
      string gid;
      if (!String.IsNullOrEmpty(file) && File.Exists(file)) gid = Convert.ToString(await Rpc("addTorrent", Convert.ToBase64String(File.ReadAllBytes(file)), new object[0], options).ConfigureAwait(false));
      else {
        string uri = J.Str(record.Data, "url");
        if (!uri.StartsWith("magnet:?", StringComparison.OrdinalIgnoreCase)) J.Url(uri);
        gid = Convert.ToString(await Rpc("addUri", new object[] { uri }, options).ConfigureAwait(false));
      }
      return gid;
    }
    public async Task<object> Status(string gid) { return await Rpc("tellStatus", gid).ConfigureAwait(false); }
    public async Task Pause(string gid) { if (Ready && !String.IsNullOrEmpty(gid)) { try { await Rpc("forcePause", gid).ConfigureAwait(false); } catch { } } }
    public async Task Resume(string gid) { await Rpc("unpause", gid).ConfigureAwait(false); }
    public async Task Remove(string gid) { if (Ready && !String.IsNullOrEmpty(gid)) { try { await Rpc("forceRemove", gid).ConfigureAwait(false); } catch { } } }
    public void Dispose() {
      closed = true;
      if (Ready) {
        try { Rpc("shutdown").Wait(1500); } catch { }
        try { if (!process.WaitForExit(1500)) process.Kill(); } catch { }
      }
      if (process != null) process.Dispose();
    }
  }
}
