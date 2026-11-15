using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Baran {
  // Secrets belong to the signed-in Windows user, never to the ordinary state JSON.
  public sealed class UserSecrets {
    readonly string path;
    readonly object gate = new object();
    public UserSecrets(string root) { path = Path.Combine(root, "connected-secrets.bin"); }
    public bool Exists { get { lock (gate) return File.Exists(path); } }
    public string Read() { lock (gate) { try { return File.Exists(path) ? Encoding.UTF8.GetString(ProtectedData.Unprotect(File.ReadAllBytes(path), null, DataProtectionScope.CurrentUser)) : ""; } catch (CryptographicException) { throw new Exception("This token belongs to another Windows account or is damaged. Remove it and enter a new token."); } } }
    public void Write(string token) {
      lock (gate) {
      if (token.Length > 4096 || token.Any(Char.IsWhiteSpace)) throw new Exception("Invalid Real-Debrid token");
      if (token.Length == 0) { if (File.Exists(path)) File.Delete(path); return; }
      byte[] bytes = ProtectedData.Protect(Encoding.UTF8.GetBytes(token), null, DataProtectionScope.CurrentUser);
      string temp = path + ".tmp"; File.WriteAllBytes(temp, bytes);
      if (File.Exists(path)) File.Replace(temp, path, null); else File.Move(temp, path);
      }
    }
  }
  public sealed class RealDebrid {
    readonly UserSecrets secrets;
    readonly NativeNetwork network;
    readonly SemaphoreSlim gate = new SemaphoreSlim(1, 1);
    readonly string endpoint;
    public RealDebrid(UserSecrets vault, NativeNetwork net, string api = "https://api.real-debrid.com/rest/1.0/") { secrets = vault; network = net; endpoint = api; }
    public bool Configured { get { return secrets.Exists; } }
    public static Dictionary<string, object> Result(object value) {
      if (J.Get(value, "error") != null) throw new Exception("Real-Debrid: " + J.Str(value, "error"));
      string url = J.Url(J.Str(value, "download")).AbsoluteUri;
      return J.Obj("url", url, "fileName", J.SafeName(J.Str(value, "filename", "download")), "size", J.Num(value, "filesize"));
    }
    public async Task<object> Request(string method, string link) {
      string token = secrets.Read(); if (token.Length == 0) throw new Exception("Connect your Real-Debrid account first");
      await gate.WaitAsync().ConfigureAwait(false);
      try {
        var headers = J.Obj("Authorization", "Bearer " + token);
        string body = method == "unrestrict/link" ? "link=" + Uri.EscapeDataString(J.Url(link).AbsoluteUri) + "&remote=0" : null;
        string text = await network.Api(endpoint + method, headers, body).ConfigureAwait(false);
        object data = J.Decode(text);
        if (J.Get(data, "error") != null) throw new Exception("Real-Debrid: " + J.Str(data, "error"));
        // Neither the API token nor the raw provider account object reaches snapshots or logs.
        return method == "user" ? J.Obj("username", J.Str(data, "username"), "type", J.Str(data, "type"), "expiration", J.Str(data, "expiration")) : Result(data);
      } finally { gate.Release(); }
    }
  }
  public sealed class WakeScheduler {
    readonly string executable;
    readonly bool testing;
    long last = -1;
    public string Error = "";
    public WakeScheduler(string file, bool test) { executable = file; testing = test; }
    public static string Xml(string file, long timestamp, string sid) {
      Func<string, string> xml = System.Security.SecurityElement.Escape;
      var time = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddMilliseconds(timestamp);
      return "<?xml version=\"1.0\" encoding=\"UTF-16\"?><Task version=\"1.2\" xmlns=\"http://schemas.microsoft.com/windows/2004/02/mit/task\"><RegistrationInfo><Description>Baran: wake and start the next scheduled download for the signed-in user.</Description></RegistrationInfo><Triggers><TimeTrigger><StartBoundary>" + time.ToString("yyyy-MM-ddTHH:mm:ssZ", System.Globalization.CultureInfo.InvariantCulture) + "</StartBoundary><EndBoundary>" + time.AddDays(1).ToString("yyyy-MM-ddTHH:mm:ssZ", System.Globalization.CultureInfo.InvariantCulture) + "</EndBoundary><Enabled>true</Enabled></TimeTrigger></Triggers><Principals><Principal id=\"User\"><UserId>" + xml(sid) + "</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals><Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><StartWhenAvailable>true</StartWhenAvailable><Enabled>true</Enabled><WakeToRun>true</WakeToRun><ExecutionTimeLimit>PT0S</ExecutionTimeLimit></Settings><Actions Context=\"User\"><Exec><Command>" + xml(file) + "</Command><Arguments>--scheduled-wake</Arguments><WorkingDirectory>" + xml(Path.GetDirectoryName(file)) + "</WorkingDirectory></Exec></Actions></Task>";
    }
    public void Sync(bool enabled, long next) {
      long desired = enabled ? next : 0;
      if (testing || last == desired) return;
      string sid = WindowsIdentity.GetCurrent().User.Value;
      string name = "BaranDownloadManager-Wake-" + sid;
      try {
        dynamic service = Activator.CreateInstance(Type.GetTypeFromProgID("Schedule.Service")); service.Connect();
        dynamic folder = service.GetFolder("\\");
        if (desired == 0) { try { folder.DeleteTask(name, 0); } catch (Exception error) { if ((uint)error.HResult != 0x80070002) throw; } }
        else folder.RegisterTask(name, Xml(executable, desired, sid), 6, sid, null, 3, null);
        last = desired; Error = "";
      } catch (Exception error) { Error = "Windows wake task could not be updated: " + error.Message; throw new Exception(Error); }
    }
  }
}
