using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
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
    public readonly VpnBinding Vpn;
    readonly object routing = new object();
    readonly List<WeakReference> requests = new List<WeakReference>();
    public NativeNetwork(StateStore state) {
      store = state; Vpn = new VpnBinding(state);
      ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
      ServicePointManager.DefaultConnectionLimit = 64;
    }
    public IWebProxy Proxy(string url) {
      if (Vpn.Enabled) {
        Vpn.Ensure();
        lock (tunnels) { ProxyTunnel bound; if (!tunnels.TryGetValue("vpn", out bound)) { bound = new ProxyTunnel(null, Vpn); tunnels["vpn"] = bound; } return bound.Proxy; }
      }
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
    public string MediaProxy(string url) {
      if (!Vpn.Enabled) return store.Proxy(url);
      var proxy = Proxy(url); var address = proxy.GetProxy(J.Url(url));
      var credentials = proxy.Credentials.GetCredential(address, "Basic");
      return new UriBuilder(address) { UserName = credentials.UserName, Password = credentials.Password }.Uri.AbsoluteUri;
    }
    public void Configure(Action change) {
      lock (routing) {
        foreach (var entry in requests) { var request = entry.Target as HttpWebRequest; if (request != null) request.Abort(); }
        requests.Clear(); change();
      }
    }
    HttpWebRequest Request(string url) {
      lock (routing) {
        var request = (HttpWebRequest)WebRequest.Create(J.Url(url)); request.Proxy = Proxy(url);
        request.ConnectionGroupName = "Baran-" + J.Str(store.Settings, "vpnInterfaceId");
        requests.RemoveAll(entry => !entry.IsAlive); requests.Add(new WeakReference(request)); return request;
      }
    }
    public async Task<HttpWebResponse> Open(string input, IDictionary<string, string> headers, CancellationToken token, long? start = null, long? end = null, bool redirects = true) {
      var uri = J.Url(input);
      var request = Request(uri.AbsoluteUri);
      request.Method = "GET"; request.AllowAutoRedirect = redirects; request.MaximumAutomaticRedirections = 8;
      request.AutomaticDecompression = DecompressionMethods.None;
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
        BrowserSessionPolicy.ValidateResponse(response.ResponseUri, response.ContentType);
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
    public async Task<string> GithubText(string url, object headers) {
      for (int attempt = 0; ; attempt++) {
        try {
          using (var timeout = new CancellationTokenSource(30000))
          using (var response = await Open(url, Headers(headers), timeout.Token).ConfigureAwait(false))
          using (timeout.Token.Register(response.Close)) {
            int status = (int)response.StatusCode;
            if ((status == 403 || status == 429) && response.Headers["X-RateLimit-Remaining"] == "0") throw new Exception("GitHub API rate limit reached. Add a personal access token in Settings > Tools, or wait for the limit to reset.");
            if (status == 404) throw new Exception("Repository not found or not accessible to this account.");
            if (status < 200 || status >= 300) throw new Exception("GitHub API HTTP " + status);
            return Encoding.UTF8.GetString(await Read(response.GetResponseStream(), 8 * 1024 * 1024, timeout.Token).ConfigureAwait(false));
          }
        } catch (WebException error) {
          // Retry transport failures only, preserving HTTP and security errors.
          if (attempt >= 2 || error.Status == WebExceptionStatus.TrustFailure || error.Status == WebExceptionStatus.SecureChannelFailure) throw new Exception("Could not reach GitHub. Check your connection or proxy.");
        }
        await Task.Delay(400 * (attempt + 1)).ConfigureAwait(false);
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
    public async Task<string> Api(string url, object headers, string form) {
      var request = Request(url);
      request.AllowAutoRedirect = false;
      request.UserAgent = J.Str(store.Settings, "userAgent"); request.Method = form == null ? "GET" : "POST";
      foreach (var entry in Headers(headers)) request.Headers[entry.Key] = entry.Value;
      using (var timeout = new CancellationTokenSource(30000))
      using (timeout.Token.Register(request.Abort)) {
        if (form != null) {
          byte[] bytes = System.Text.Encoding.UTF8.GetBytes(form); request.ContentType = "application/x-www-form-urlencoded"; request.ContentLength = bytes.Length;
          using (var output = await request.GetRequestStreamAsync().ConfigureAwait(false)) await output.WriteAsync(bytes, 0, bytes.Length, timeout.Token).ConfigureAwait(false);
        }
        HttpWebResponse response;
        try { response = (HttpWebResponse)await request.GetResponseAsync().ConfigureAwait(false); }
        catch (WebException error) { if (!(error.Response is HttpWebResponse)) throw new Exception("Provider connection failed"); response = (HttpWebResponse)error.Response; }
        using (response) {
          if ((int)response.StatusCode < 200 || (int)response.StatusCode >= 300) throw new Exception("Provider HTTP " + (int)response.StatusCode + ". Check your token, account and host availability.");
          return System.Text.Encoding.UTF8.GetString(await Read(response.GetResponseStream(), 1024 * 1024, timeout.Token).ConfigureAwait(false));
        }
      }
    }
    public void Dispose() { Vpn.Dispose(); lock (tunnels) { foreach (var value in tunnels.Values) value.Dispose(); tunnels.Clear(); } }
  }
}
