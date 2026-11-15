using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Web.Script.Serialization;

namespace Baran {
  public static class J {
    public static JavaScriptSerializer Codec() { return new JavaScriptSerializer { MaxJsonLength = 64 * 1024 * 1024, RecursionLimit = 128 }; }
    public static string Encode(object value) { return Codec().Serialize(value); }
    public static object Decode(string value) { return Codec().DeserializeObject(value); }
    public static Dictionary<string, object> Obj(params object[] values) {
      var result = new Dictionary<string, object>();
      for (int i = 0; i < values.Length; i += 2) result[(string)values[i]] = values[i + 1];
      return result;
    }
    public static Dictionary<string, object> Map(object value) { return value as Dictionary<string, object> ?? new Dictionary<string, object>(); }
    public static object Get(object value, string key, object fallback = null) { object found; return Map(value).TryGetValue(key, out found) ? found : fallback; }
    public static string Str(object value, string key, string fallback = "") { return Convert.ToString(Get(value, key, fallback), CultureInfo.InvariantCulture) ?? fallback; }
    public static long Num(object value, string key, long fallback = 0) { try { return Convert.ToInt64(Get(value, key, fallback), CultureInfo.InvariantCulture); } catch { return fallback; } }
    public static bool Bool(object value, string key, bool fallback = false) { try { return Convert.ToBoolean(Get(value, key, fallback), CultureInfo.InvariantCulture); } catch { return fallback; } }
    public static object[] List(object value) { return (value as object[]) ?? ((value as ArrayList) == null ? new object[0] : ((ArrayList)value).ToArray()); }
    public static long Now() { return (long)(DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalMilliseconds; }
    public static string SafeName(string value) {
      value = Regex.Replace(value ?? "download", "[\\x00-\\x1f<>:\"/\\\\|?*]", "_").Trim().TrimEnd('.', ' ');
      if (String.IsNullOrWhiteSpace(value)) value = "download";
      if (Regex.IsMatch(value, "^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])($|\\.)", RegexOptions.IgnoreCase)) value = "_" + value;
      return value.Length > 180 ? value.Substring(0, 180) : value;
    }
    public static Uri Url(string value) {
      Uri url;
      if (value == null || value.Length > 8192 || !Uri.TryCreate(value.Trim(), UriKind.Absolute, out url) || !(url.Scheme == "http" || url.Scheme == "https") || !String.IsNullOrEmpty(url.UserInfo)) throw new Exception("Enter an HTTP(S) URL without embedded credentials");
      return new UriBuilder(url) { Fragment = "" }.Uri;
    }
    public static string Quote(string value) {
      // Windows CommandLineToArgvW escaping, including trailing backslashes.
      var result = new StringBuilder("\""); int slashes = 0;
      foreach (char ch in value ?? "") {
        if (ch == '\\') { slashes++; continue; }
        if (ch == '"') result.Append('\\', slashes * 2 + 1).Append(ch);
        else result.Append('\\', slashes).Append(ch);
        slashes = 0;
      }
      return result.Append('\\', slashes * 2).Append('"').ToString();
    }
    public static void Atomic(string path, object value) {
      Directory.CreateDirectory(Path.GetDirectoryName(path));
      string temp = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
      File.WriteAllText(temp, Encode(value), new UTF8Encoding(false));
      try {
        for (int n = 0; ; n++) {
          try { if (File.Exists(path)) File.Replace(temp, path, null); else File.Move(temp, path); break; }
          catch (IOException) { if (n >= 5) throw; System.Threading.Thread.Sleep(20 * (1 << n)); }
        }
      } finally { if (File.Exists(temp)) File.Delete(temp); }
    }
  }
}
