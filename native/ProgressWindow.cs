using System;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Baran {
  public static class ProgressAccess {
    public static bool Allows(string taskId, string method, object[] args) {
      return !String.IsNullOrEmpty(taskId) && args.Length > 0 && Convert.ToString(args[0]) == taskId &&
        new [] { "pauseTask", "resumeTask", "cancelTask", "retryTask", "revealTask", "openTask", "replaceUrl", "setTaskSpeedLimit", "setTaskChecksum", "setTaskCloseOnComplete" }.Contains(method);
    }
  }
  public static class ProgressPlacement {
    public static Rectangle Fit(Rectangle area) {
      int width = Math.Min(600, Math.Max(1, area.Width - 32));
      int height = Math.Min(600, Math.Max(1, area.Height - 32));
      return new Rectangle(area.Left + (area.Width - width) / 2, area.Top + (area.Height - height) / 2, width, height);
    }
  }

  // A view of the existing task, sharing the application's engine and WebView2
  // environment. Closing this form never pauses, removes or restarts a task.
  sealed class ProgressWindow : Form {
    readonly Core core; readonly string root, taskId;
    readonly CoreWebView2Environment environment;
    readonly WebView2 web = new WebView2();
    public ProgressWindow(Core app, string directory, CoreWebView2Environment runtime, string id, Icon icon, Rectangle area) {
      core = app; root = directory; environment = runtime; taskId = id;
      Text = "Baran Download Manager"; Icon = icon;
      BackColor = ColorTranslator.FromHtml(J.Str(core.Store.Settings, "theme") == "light" ? "#eef2f8" : "#0a0c12"); web.DefaultBackgroundColor = BackColor;
      StartPosition = FormStartPosition.Manual; Bounds = ProgressPlacement.Fit(area);
      MinimumSize = new Size(Math.Min(420, Width), Math.Min(360, Height));
      web.Dock = DockStyle.Fill; Controls.Add(web);
      UpdateTitle(core.Find(taskId).Data);
      Shown += async (s, e) => { try { await Initialize(); } catch (Exception error) { if (!IsDisposed) { MessageBox.Show(this, error.Message, Text); Close(); } } };
      FormClosed += (s, e) => web.Dispose();
    }
    public void Reveal() { if (IsDisposed) return; Show(); if (WindowState == FormWindowState.Minimized) WindowState = FormWindowState.Normal; Activate(); }
    void UpdateTitle(object task) {
      long total = J.Num(task, "size"), downloaded = J.Num(task, "downloaded");
      Text = (total > 0 ? Math.Min(100, (int)(100.0 * downloaded / total)) + "% · " : "") + J.Str(task, "fileName") + " — Baran";
    }
    public void Post(object value) {
      if (IsDisposed) return;
      string type = J.Str(value, "type"); var task = J.Get(value, "task");
      if (type == "task:remove" && J.Str(value, "id") == taskId) { Close(); return; }
      if (type == "task:update" || type == "task:add") {
        if (J.Str(task, "id") != taskId) return;
        if (J.Str(task, "status") == "completed" && J.Bool(task, "closeProgressOnComplete")) { Close(); return; }
        UpdateTitle(task);
      }
      else if (type != "settings") return;
      if (web.CoreWebView2 != null && !web.IsDisposed) web.CoreWebView2.PostWebMessageAsJson(J.Encode(J.Obj("event", value)));
    }
    async Task Initialize() {
      await web.EnsureCoreWebView2Async(environment);
      if (IsDisposed) return;
      var view = web.CoreWebView2;
      view.Settings.AreDefaultContextMenusEnabled = false; view.Settings.AreDevToolsEnabled = false;
      view.Settings.IsStatusBarEnabled = false; view.Settings.AreHostObjectsAllowed = false;
      view.SetVirtualHostNameToFolderMapping("baran.local", Path.Combine(root, "ui"), CoreWebView2HostResourceAccessKind.DenyCors);
      await view.AddScriptToExecuteOnDocumentCreatedAsync(File.ReadAllText(Path.Combine(root, "bridge.js")));
      view.PermissionRequested += (s, e) => e.State = CoreWebView2PermissionState.Deny;
      view.NewWindowRequested += (s, e) => e.Handled = true;
      view.NavigationStarting += (s, e) => { if (!e.Uri.StartsWith("https://baran.local/", StringComparison.Ordinal)) e.Cancel = true; };
      view.WebMessageReceived += async (s, e) => {
        if (!e.Source.StartsWith("https://baran.local/", StringComparison.Ordinal)) return;
        object requestId = null;
        try {
          string text = e.TryGetWebMessageAsString(); if (text.Length > 65536) throw new Exception("Progress request exceeds 64 KB");
          var request = J.Decode(text); requestId = J.Get(request, "id");
          string method = J.Str(request, "method"); object[] args = J.List(J.Get(request, "args")); object result = null;
          if (method == "windowControl") {
            string action = args.Length == 0 ? "" : Convert.ToString(args[0]);
            if (action == "close") { Close(); return; }
            if (action == "hide") Hide();
            else if (action == "minimize") WindowState = FormWindowState.Minimized;
          } else if (method == "snapshot") {
            result = await Task.Run(() => core.Invoke("snapshot", new object[0]));
            J.Map(result)["tasks"] = J.List(J.Get(result, "tasks")).Where(t => J.Str(t, "id") == taskId).ToArray();
          } else {
            if (!ProgressAccess.Allows(taskId, method, args)) throw new Exception("This window can only operate on its own download");
            result = await Task.Run(() => core.Invoke(method, args));
          }
          if (!IsDisposed && !web.IsDisposed) view.PostWebMessageAsJson(J.Encode(J.Obj("id", requestId, "result", result)));
        } catch (Exception error) { if (!IsDisposed && !web.IsDisposed) view.PostWebMessageAsJson(J.Encode(J.Obj("id", requestId, "error", error.Message))); }
      };
      view.Navigate("https://baran.local/index.html?mode=progress&task=" + Uri.EscapeDataString(taskId));
    }
  }
}
