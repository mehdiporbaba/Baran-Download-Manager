using System;
using System.Diagnostics;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Win32;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Baran {
  static class Program {
    [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr FindWindow(string type, string title);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr handle, int command);
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr handle);
    [STAThread] static int Main(string[] args) {
      string root = AppDomain.CurrentDomain.BaseDirectory;
      if (args.Contains("--remove-wake-task")) { try { new WakeScheduler(Path.Combine(root, "Baran Download Manager.exe"), false).Sync(false, 0); return 0; } catch { return 1; } }
      int profileAt = Array.IndexOf(args, "--profile");
      string profile = profileAt >= 0 && args.Length > profileAt + 1 ? Path.GetFullPath(args[profileAt + 1]) : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Baran");
      if (args.Contains("--repair-browser-hosts")) { try { BrowserRegistration.RepairInstalled(root, profile, Application.ExecutablePath); return 0; } catch { return 1; } }
      if (args.Contains("--test-driver")) return Driver(profile, root).GetAwaiter().GetResult();
      try {
        bool owner; using (var mutex = new Mutex(true, "Local\\BaranNative-" + Environment.UserName, out owner)) {
          if (!owner) { var window = FindWindow(null, "Baran Download Manager"); if (window != IntPtr.Zero) { ShowWindow(window, 9); SetForegroundWindow(window); } return 0; }
          if (profileAt < 0) foreach (var other in Process.GetProcessesByName("Baran Download Manager")) {
            try { if (other.Id != Process.GetCurrentProcess().Id && File.Exists(Path.Combine(Path.GetDirectoryName(other.MainModule.FileName), "resources", "app.asar"))) { MessageBox.Show("Close the previous Electron version of Baran before starting the native version. Your settings and partial files will be preserved.", "Baran Download Manager"); return 1; } } catch { }
          }
          SetProcessDPIAware(); Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
          Application.Run(new Shell(root, profile, profileAt >= 0)); return 0;
        }
      } catch (Exception error) { MessageBox.Show(error.Message, "Baran Download Manager", MessageBoxButtons.OK, MessageBoxIcon.Error); return 1; }
    }
    static async Task<int> Driver(string profile, string root) {
      object output = new object();
      Action<object> write = value => { lock (output) Console.WriteLine(J.Encode(value)); };
      using (var app = new Core(profile, root, value => write(J.Obj("event", value)), true)) {
        var testPipeName = Environment.GetEnvironmentVariable("BARAN_NATIVE_TEST_PIPE");
        using (var testBridge = String.IsNullOrEmpty(testPipeName) ? null : new BrowserPipe(app, testPipeName)) {
        string line;
        while ((line = Console.ReadLine()) != null) {
          object id = null;
          try { var request = J.Decode(line); id = J.Get(request, "id"); var result = await app.Invoke(J.Str(request, "method"), J.List(J.Get(request, "args"))).ConfigureAwait(false); write(J.Obj("id", id, "result", result)); }
          catch (Exception error) { write(J.Obj("id", id, "error", error.Message)); }
        }
        await app.Stop().ConfigureAwait(false);
        }
      }
      return 0;
    }
  }
  sealed class Shell : Form {
    readonly Dictionary<string, ProgressWindow> progressWindows = new Dictionary<string, ProgressWindow>();
    readonly HashSet<string> progressShown = new HashSet<string>();
    CoreWebView2Environment webEnvironment;
    readonly WebView2 web = new WebView2(); readonly string root; readonly bool testing;
    readonly Core core; readonly NotifyIcon tray = new NotifyIcon(); readonly System.Windows.Forms.Timer clipboardTimer = new System.Windows.Forms.Timer();
    BrowserPipe browserPipe; bool quitting, stopping; string lastClipboard = "";
    [DllImport("user32.dll")] static extern bool ReleaseCapture();
    [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr hwnd, int msg, IntPtr wparam, IntPtr lparam);
    public Shell(string directory, string profile, bool test) {
      root = directory; testing = test;
      Text = "Baran Download Manager"; FormBorderStyle = FormBorderStyle.None; BackColor = Color.FromArgb(15, 23, 42);
      var area = Screen.FromPoint(Cursor.Position).WorkingArea;
      Width = Math.Min(1000, area.Width - 40); Height = Math.Min(680, area.Height - 40);
      MinimumSize = new Size(Math.Min(720, Width), Math.Min(480, Height)); StartPosition = FormStartPosition.Manual;
      Location = new Point(area.Left + (area.Width - Width) / 2, area.Top + (area.Height - Height) / 2);
      string icon = Path.Combine(root, "icon.ico"); if (File.Exists(icon)) Icon = new Icon(icon);
      web.Dock = DockStyle.Fill; Controls.Add(web);
      core = new Core(profile, root, Post, testing); core.Ui = Ui; core.RevealBrowserImport = () => { if (!IsDisposed) BeginInvoke(new Action(Reveal)); };
      tray.Icon = Icon; tray.Text = "Baran Download Manager"; tray.Visible = true;
      var menu = new ContextMenuStrip(); menu.Items.Add("Open Baran", null, (s, e) => Reveal());
      menu.Items.Add("Downloads in progress", null, (s, e) => { foreach (string id in core.ActiveTaskIds()) { try { OpenProgress(id); } catch (Exception error) { core.Toast("error", "Download window could not open: " + error.Message); } } });
      menu.Items.Add("Quit", null, (s, e) => { quitting = true; Close(); }); tray.ContextMenuStrip = menu;
      tray.DoubleClick += (s, e) => Reveal();
      Shown += async (s, e) => { try { await Initialize(); } catch (Exception error) { MessageBox.Show(this, "WebView2 could not start. Install Microsoft's Evergreen WebView2 Runtime, then reopen Baran.\n\n" + error.Message, Text); quitting = true; Close(); } };
      Resize += (s, e) => { if (WindowState == FormWindowState.Minimized && J.Bool(core.Store.Settings, "minimizeToTray")) Hide(); Post(J.Obj("type", "window:state", "maximized", WindowState == FormWindowState.Maximized)); };
      FormClosing += async (s, e) => {
        if (!quitting && J.Bool(core.Store.Settings, "minimizeToTray")) { e.Cancel = true; Hide(); return; }
        if (!stopping) {
          e.Cancel = true; stopping = true; Hide(); clipboardTimer.Stop(); if (browserPipe != null) browserPipe.Dispose();
          foreach (var progress in progressWindows.Values.ToArray()) progress.Close();
          try { await core.Stop(); } catch (Exception error) { File.AppendAllText(Path.Combine(profile, "shutdown-error.log"), error.ToString()); }
          tray.Visible = false; tray.Dispose(); web.Dispose(); BeginInvoke(new Action(Close));
        }
      };
      clipboardTimer.Interval = 1200;
      clipboardTimer.Tick += (s, e) => {
        if (!J.Bool(core.Store.Settings, "clipboardWatch")) return;
        try { if (Clipboard.ContainsText()) { string value = Clipboard.GetText().Trim(); if (value == lastClipboard) return; lastClipboard = value; if (value.Length < 8192 && (value.StartsWith("https://") || value.StartsWith("http://") || value.StartsWith("magnet:?"))) Post(J.Obj("type", "clipboard:url", "url", value)); } } catch { }
      };
    }
    async Task Initialize() {
      // Use the installed Evergreen runtime, never a bundled Chromium directory.
      var environment = await CoreWebView2Environment.CreateAsync(null, Path.Combine(core.Store.Root, "webview2"), null);
      webEnvironment = environment;
      await web.EnsureCoreWebView2Async(environment);
      core.Runtime = environment.BrowserVersionString;
      web.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
      web.CoreWebView2.Settings.AreDevToolsEnabled = testing;
      web.CoreWebView2.Settings.IsStatusBarEnabled = false;
      web.CoreWebView2.Settings.AreHostObjectsAllowed = false;
      web.CoreWebView2.SetVirtualHostNameToFolderMapping("baran.local", Path.Combine(root, "ui"), CoreWebView2HostResourceAccessKind.DenyCors);
      await web.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(File.ReadAllText(Path.Combine(root, "bridge.js")));
      web.CoreWebView2.WebMessageReceived += async (s, e) => {
        if (!e.Source.StartsWith("https://baran.local/", StringComparison.Ordinal)) return;
        object id = null;
        try {
          string text = e.TryGetWebMessageAsString(); if (text.Length > 64 * 1024 * 1024) throw new Exception("IPC request exceeds 64 MB");
          var request = J.Decode(text); id = J.Get(request, "id");
          object result = await Task.Run(() => core.Invoke(J.Str(request, "method"), J.List(J.Get(request, "args"))));
          web.CoreWebView2.PostWebMessageAsJson(J.Encode(J.Obj("id", id, "result", result)));
        } catch (Exception error) { if (!web.IsDisposed) web.CoreWebView2.PostWebMessageAsJson(J.Encode(J.Obj("id", id, "error", error.Message))); }
      };
      web.CoreWebView2.NavigationStarting += (s, e) => { if (!e.Uri.StartsWith("https://baran.local/", StringComparison.Ordinal)) { e.Cancel = true; External(e.Uri); } };
      web.CoreWebView2.NewWindowRequested += (s, e) => { e.Handled = true; External(e.Uri); };
      web.CoreWebView2.PermissionRequested += (s, e) => e.State = CoreWebView2PermissionState.Deny;
      web.CoreWebView2.Navigate("https://baran.local/index.html");
      if (!testing) { browserPipe = new BrowserPipe(core); try { ApplySettings(); } catch (Exception error) { core.Toast("error", "Startup registration could not be applied: " + error.Message); } clipboardTimer.Start(); }
    }
    void Reveal() { Show(); if (WindowState == FormWindowState.Minimized) WindowState = FormWindowState.Normal; Activate(); }
    void Post(object value) {
      if (IsDisposed || !IsHandleCreated) return; string json = J.Encode(J.Obj("event", value));
      BeginInvoke(new Action(() => {
        if (IsDisposed || stopping) return;
        foreach (var progress in progressWindows.Values.ToArray()) progress.Post(value);
        if (!testing && webEnvironment != null && J.Bool(core.Store.Settings, "showProgressWindow", true) && J.Str(value, "type") == "task:update") {
          var task = J.Get(value, "task"); string id = J.Str(task, "id");
          if (new [] { "connecting", "downloading" }.Contains(J.Str(task, "status")) && !progressShown.Contains(id)) {
            try { OpenProgress(id); } catch (Exception error) { progressShown.Add(id); core.Toast("error", "Download window could not open: " + error.Message); }
          }
        }
        if (web.CoreWebView2 != null && !web.IsDisposed) web.CoreWebView2.PostWebMessageAsJson(json);
        if (!testing && J.Bool(core.Store.Settings, "notifyOnComplete") && J.Str(value, "type") == "toast" && J.Str(value, "level") == "success" && J.Str(value, "message").StartsWith("Completed:")) tray.ShowBalloonTip(5000, "Baran Download Manager", J.Str(value, "message"), ToolTipIcon.Info);
      }));
    }
    static void External(string url) { try { J.Url(url); Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); } catch { } }
    void OpenProgress(string id) {
      core.Find(id);
      ProgressWindow progress;
      if (progressWindows.TryGetValue(id, out progress) && !progress.IsDisposed) { progress.Reveal(); return; }
      if (webEnvironment == null) throw new Exception("Wait for the main window to finish loading");
      progress = new ProgressWindow(core, root, webEnvironment, id, Icon, Screen.FromControl(this).WorkingArea);
      progressWindows[id] = progress; progressShown.Add(id);
      progress.FormClosed += (s, e) => progressWindows.Remove(id); progress.Show();
    }
    void ApplySettings() {
      if (testing) return;
      using (var key = Registry.CurrentUser.CreateSubKey("Software\\Microsoft\\Windows\\CurrentVersion\\Run")) {
        if (J.Bool(core.Store.Settings, "launchAtStartup")) key.SetValue("Baran Download Manager", J.Quote(Application.ExecutablePath));
        else key.DeleteValue("Baran Download Manager", false);
      }
    }
    Task<object> Ui(string method, object[] args) {
      var result = new TaskCompletionSource<object>();
      BeginInvoke(new Action(() => {
        try {
          object value = null; string first = args.Length > 0 ? Convert.ToString(args[0]) : "";
          switch (method) {
            case "openProgressWindow": OpenProgress(first); break;
            case "dragWindow": ReleaseCapture(); SendMessage(Handle, 0xA1, new IntPtr(2), IntPtr.Zero); break;
            case "applySettings": ApplySettings(); break;
            case "windowControl": if (first == "close") Close(); else if (first == "hide") Hide(); else if (first == "minimize") WindowState = FormWindowState.Minimized; else if (first == "maximize") WindowState = WindowState == FormWindowState.Maximized ? FormWindowState.Normal : FormWindowState.Maximized; break;
            case "openExternal": External(first); break;
            case "readClipboard": value = Clipboard.ContainsText() ? Clipboard.GetText() : ""; break;
            case "revealDir": if (Directory.Exists(first)) Process.Start(new ProcessStartInfo(first) { UseShellExecute = true }); break;
            case "openTask": case "revealTask": {
              var task = core.Find(first).Data; string file = J.Str(task, "filePath"), dir = J.Str(task, "dir");
              if (method == "openTask" && File.Exists(file)) Process.Start(new ProcessStartInfo(file) { UseShellExecute = true });
              else if (File.Exists(file)) Process.Start("explorer.exe", "/select," + J.Quote(file));
              else if (Directory.Exists(dir)) Process.Start(new ProcessStartInfo(dir) { UseShellExecute = true }); break;
            }
            case "chooseDir": using (var dialog = new FolderBrowserDialog { SelectedPath = first, Description = "Choose download folder" }) { if (dialog.ShowDialog(this) == DialogResult.OK) value = dialog.SelectedPath; } break;
            case "chooseTorrentFile": case "chooseCookiesFile": using (var dialog = new OpenFileDialog { Filter = method == "chooseTorrentFile" ? "Torrent files|*.torrent" : "Cookies text|*.txt|All files|*.*" }) {
              if (dialog.ShowDialog(this) == DialogResult.OK) value = dialog.FileName;
            } break;
            case "registerBrowserHost": RegisterBrowser(first, args.Length > 1 ? Convert.ToString(args[1]) : ""); break;
            case "openChromiumExtensionFolder": {
              string folder = Path.Combine(root, "extensions", "chromium");
              if (!Directory.Exists(folder)) throw new Exception("Bundled Chromium extension is missing; reinstall Baran");
              Process.Start(new ProcessStartInfo(folder) { UseShellExecute = true }); break;
            }
            case "installFirefoxExtension": {
              if (testing) throw new Exception("Browser installation is disabled for isolated test profiles");
              string package = BrowserInstallation.Package(root), firefox = BrowserInstallation.FindFirefox();
              RegisterBrowser("firefox", ""); BrowserInstallation.Open(firefox, package);
              value = J.Obj("opened", true); break;
            }
            default: throw new Exception("Unsupported desktop action: " + method);
          }
          result.SetResult(value);
        } catch (Exception error) { result.SetException(error); }
      }));
      return result.Task;
    }
    void RegisterBrowser(string browser, string extension) { BrowserRegistration.Register(root, core.Store.Root, Application.ExecutablePath, browser, extension); }
    protected override void WndProc(ref Message message) {
      const int HitTest = 0x84; base.WndProc(ref message);
      if (message.Msg != HitTest || WindowState == FormWindowState.Maximized) return;
      var point = PointToClient(new Point((short)((long)message.LParam & 0xffff), (short)(((long)message.LParam >> 16) & 0xffff)));
      int edge = 6; bool left = point.X < edge, right = point.X >= Width - edge, top = point.Y < edge, bottom = point.Y >= Height - edge;
      if (top && left) message.Result = new IntPtr(13); else if (top && right) message.Result = new IntPtr(14); else if (bottom && left) message.Result = new IntPtr(16); else if (bottom && right) message.Result = new IntPtr(17); else if (left) message.Result = new IntPtr(10); else if (right) message.Result = new IntPtr(11); else if (top) message.Result = new IntPtr(12); else if (bottom) message.Result = new IntPtr(15);
    }
  }
}
