using System;
using System.IO;
using System.IO.Pipes;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace Baran {
  public sealed class BrowserPipe : IDisposable {
    readonly CancellationTokenSource stop = new CancellationTokenSource();
    readonly Core core; readonly string pipeName; NamedPipeServerStream pipe;
    public BrowserPipe(Core app, string testName = null) { core = app; pipeName = testName ?? "baran-download-manager-" + Regex.Replace(Environment.UserName, "[^a-zA-Z0-9_-]", "_"); Task.Run((Func<Task>)Run); }
    static async Task<byte[]> Read(Stream stream, int length, CancellationToken token) {
      var bytes = new byte[length]; int offset = 0;
      while (offset < length) { int count = await stream.ReadAsync(bytes, offset, length - offset, token).ConfigureAwait(false); if (count == 0) throw new EndOfStreamException(); offset += count; }
      return bytes;
    }
    async Task Run() {
      while (!stop.IsCancellationRequested) {
        try {
          var security = new PipeSecurity(); security.SetAccessRuleProtection(true, false);
          security.AddAccessRule(new PipeAccessRule(WindowsIdentity.GetCurrent().User, PipeAccessRights.FullControl, AccessControlType.Allow));
          using (var server = new NamedPipeServerStream(pipeName, PipeDirection.InOut, 1, PipeTransmissionMode.Byte, PipeOptions.Asynchronous, 65536, 65536, security)) {
            pipe = server;
            await Task.Factory.FromAsync(server.BeginWaitForConnection, server.EndWaitForConnection, null).ConfigureAwait(false);
            using (var timeout = CancellationTokenSource.CreateLinkedTokenSource(stop.Token)) {
              timeout.CancelAfter(5000);
              using (timeout.Token.Register(server.Dispose)) {
                object result;
                try {
                  int length = BitConverter.ToInt32(await Read(server, 4, timeout.Token).ConfigureAwait(false), 0);
                  if (length < 1 || length > 256 * 1024) throw new Exception("Browser message exceeds 256 KB");
                  var request = J.Decode(Encoding.UTF8.GetString(await Read(server, length, timeout.Token).ConfigureAwait(false)));
                  string action = J.Str(request, "action");
                  if (action == "ping") result = J.Obj("ok", true, "version", core.Version, "downloadPrompt", true);
                  else {
                  if (action != "import") throw new Exception("Unsupported browser command");
                  var values = J.List(J.Get(request, "urls"));
                  foreach (object value in values) if (!(value is string)) throw new Exception("Invalid URL list");
                  bool download = J.Str(request, "intent") == "download";
                  if (download && values.Length != 1) throw new Exception("A download request must contain exactly one URL");
                  if (download) {
                    J.Url(Convert.ToString(values[0]));
                    if (BrowserSessionPolicy.RequiresBrowser(Convert.ToString(values[0]))) throw new Exception("This Google verification file needs your browser session. Continue in the browser. / فایل تأیید گوگل باید در مرورگر واردشده دانلود شود.");
                  }
                  int count = core.Inbox.Add(Array.ConvertAll(values, Convert.ToString), "browser");
                  result = J.Obj("ok", true, "count", count);
                  if (download) { result = J.Obj("ok", true, "count", count, "downloadPrompt", true); core.BrowserDownloadRequested(Convert.ToString(values[0])); }
                  else core.BrowserImported();
                  }
                } catch (Exception error) { result = J.Obj("ok", false, "error", error.Message); }
                byte[] body = Encoding.UTF8.GetBytes(J.Encode(result)); byte[] header = BitConverter.GetBytes(body.Length);
                await server.WriteAsync(header, 0, 4, timeout.Token).ConfigureAwait(false); await server.WriteAsync(body, 0, body.Length, timeout.Token).ConfigureAwait(false);
              }
            }
          }
        } catch { }
        if (!stop.IsCancellationRequested) await Task.Delay(250).ConfigureAwait(false);
      }
    }
    public void Dispose() { stop.Cancel(); if (pipe != null) pipe.Dispose(); }
  }
}
