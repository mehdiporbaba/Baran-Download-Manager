using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Threading;
using System.Threading.Tasks;

namespace Baran {
  public sealed class FixedProxy : IWebProxy {
    readonly Uri address;
    public ICredentials Credentials { get; set; }
    public FixedProxy(Uri proxy, ICredentials credentials = null) { address = proxy; Credentials = credentials; }
    public bool IsBypassed(Uri destination) { return false; }
    public Uri GetProxy(Uri destination) { return address; }
  }
  public sealed class NativeNetwork : IDisposable {
    readonly StateStore store;
    readonly Dictionary<string, ProxyTunnel> tunnels = new Dictionary<string, ProxyTunnel>();
    public NativeNetwork(StateStore state) {
      store = state;
      ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
      ServicePointManager.DefaultConnectionLimit = 64;
    }
    public IWebProxy Proxy(string url) {
      string address = store.Proxy(url);
      if (String.IsNullOrEmpty(address)) return null;
      var uri = new Uri(address);
      if (uri.Scheme == "http") return new FixedProxy(uri);
      lock (tunnels) {
        ProxyTunnel tunnel;
        if (!tunnels.TryGetValue(address, out tunnel)) { tunnel = new ProxyTunnel(uri); tunnels[address] = tunnel; }
        return tunnel.Proxy;
      }
    }
    public async Task<HttpWebResponse> Open(string input, IDictionary<string, string> headers, CancellationToken token, long? start = null, long? end = null, bool redirects = true) {
      var uri = J.Url(input);
      var request = (HttpWebRequest)WebRequest.Create(uri);
      request.Method = "GET"; request.AllowAutoRedirect = redirects; request.MaximumAutomaticRedirections = 8;
      request.AutomaticDecompression = DecompressionMethods.None;
      request.Proxy = Proxy(uri.AbsoluteUri);
      request.UserAgent = J.Str(store.Settings, "userAgent");
      request.Accept = "*/*"; request.Headers["Accept-Encoding"] = "identity";
      request.Timeout = 30000; request.ReadWriteTimeout = 30000;
      if (headers != null) foreach (var entry in headers) {
        string key = entry.Key.ToLowerInvariant();
        if (key == "range" || key == "host" || key == "content-length" || key == "connection") continue;
        if (key == "user-agent") request.UserAgent = entry.Value;
        else if (key == "accept") request.Accept = entry.Value;
        else if (key == "referer") request.Referer = entry.Value;
        else if (key == "content-type") request.ContentType = entry.Value;
        else request.Headers[entry.Key] = entry.Value;
      }
      if (start.HasValue) { if (end.HasValue) request.AddRange(start.Value, end.Value); else request.AddRange(start.Value); }
      var timeout = CancellationTokenSource.CreateLinkedTokenSource(token); timeout.CancelAfter(30000);
      var registration = timeout.Token.Register(request.Abort);
      try {
        try { return (HttpWebResponse)await request.GetResponseAsync().ConfigureAwait(false); }
        catch (WebException error) { if (error.Response is HttpWebResponse) return (HttpWebResponse)error.Response; throw; }
      } finally { registration.Dispose(); timeout.Dispose(); }
    }
    public static Dictionary<string, string> Headers(object value) { var strings = value as IDictionary<string, string>; return strings == null ? J.Map(value).ToDictionary(p => p.Key, p => Convert.ToString(p.Value)) : new Dictionary<string, string>(strings); }
    public static async Task<byte[]> Read(Stream stream, int maximum, CancellationToken token) {
      var buffer = new byte[16384];
      using (var output = new MemoryStream()) {
        while (true) {
          int count = await stream.ReadAsync(buffer, 0, buffer.Length, token).ConfigureAwait(false);
          if (count == 0) break;
          if (output.Length + count > maximum) throw new Exception("Response exceeds the allowed size");
          output.Write(buffer, 0, count);
        }
        return output.ToArray();
      }
    }
    public async Task<Dictionary<string, object>> Probe(string url, object headers = null) {
      using (var cancel = new CancellationTokenSource(30000))
      using (var response = await Open(url, Headers(headers), cancel.Token, 0, 0).ConfigureAwait(false)) {
        int status = (int)response.StatusCode;
        if (status != 200 && status != 206) throw new Exception("HTTP " + status + " " + response.StatusDescription);
        long size = response.ContentLength;
        string range = response.Headers["Content-Range"] ?? "";
        if (range.Contains("/")) Int64.TryParse(range.Split('/').Last(), out size);
        string name = Path.GetFileName(response.ResponseUri.AbsolutePath);
        var disposition = response.Headers["Content-Disposition"] ?? "";
        var encoded = System.Text.RegularExpressions.Regex.Match(disposition, "filename\\*=UTF-8''([^;]+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        var plain = System.Text.RegularExpressions.Regex.Match(disposition, "filename=\"?([^\";]+)", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        if (encoded.Success) name = Uri.UnescapeDataString(encoded.Groups[1].Value);
        else if (plain.Success) name = plain.Groups[1].Value;
        return J.Obj("url", url, "finalUrl", response.ResponseUri.AbsoluteUri, "fileName", J.SafeName(Uri.UnescapeDataString(name)),
          "size", Math.Max(0, size), "resumable", status == 206, "contentType", response.ContentType,
          "etag", response.Headers["ETag"], "lastModified", response.Headers["Last-Modified"],
          "headers", J.Obj("content-type", response.ContentType));
      }
    }
    public async Task<string> Text(string url, int maximum, object headers = null, CancellationToken token = default(CancellationToken)) {
      using (var timeout = CancellationTokenSource.CreateLinkedTokenSource(token)) {
      timeout.CancelAfter(90000);
      using (var response = await Open(url, Headers(headers), timeout.Token).ConfigureAwait(false))
      using (timeout.Token.Register(response.Close)) {
        if ((int)response.StatusCode < 200 || (int)response.StatusCode >= 300) throw new Exception("HTTP " + (int)response.StatusCode);
        return System.Text.Encoding.UTF8.GetString(await Read(response.GetResponseStream(), maximum, timeout.Token).ConfigureAwait(false));
      }
      }
    }
    public void Dispose() { lock (tunnels) { foreach (var value in tunnels.Values) value.Dispose(); tunnels.Clear(); } }
  }
}
