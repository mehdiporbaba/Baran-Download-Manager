using System;

namespace Baran {
  public static class BrowserSessionPolicy {
    public static bool RequiresBrowser(string value) {
      Uri url;
      return Uri.TryCreate(value, UriKind.Absolute, out url) &&
        url.Host.Equals("search.google.com", StringComparison.OrdinalIgnoreCase) &&
        url.AbsolutePath.IndexOf("/search-console/verification-download", StringComparison.OrdinalIgnoreCase) >= 0;
    }
    public static bool IsSignIn(Uri url) {
      return url.Host.Equals("accounts.google.com", StringComparison.OrdinalIgnoreCase) &&
        (url.AbsolutePath.StartsWith("/v3/signin", StringComparison.OrdinalIgnoreCase) ||
         url.AbsolutePath.StartsWith("/signin", StringComparison.OrdinalIgnoreCase) ||
         url.AbsolutePath.StartsWith("/ServiceLogin", StringComparison.OrdinalIgnoreCase));
    }
    public static void ValidateResponse(Uri url, string contentType) {
      string type = (contentType ?? "").Split(';')[0].Trim();
      if ((type.Equals("text/html", StringComparison.OrdinalIgnoreCase) || type.Equals("application/xhtml+xml", StringComparison.OrdinalIgnoreCase)) && IsSignIn(url))
        throw new System.IO.InvalidDataException("Google returned a sign-in page, not the requested file. Download this file in your signed-in browser. / گوگل صفحهٔ ورود برگرداند؛ این فایل را در مرورگر واردشده دانلود کنید.");
    }
  }
}
