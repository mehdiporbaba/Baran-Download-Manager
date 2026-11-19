using System;
using Baran;
class BrowserSessionFixture {
  static void Check(bool value) { if (!value) throw new Exception("Session policy regression"); }
  public static void Main() {
    Check(BrowserSessionPolicy.RequiresBrowser("https://search.google.com/u/2/search-console/verification-download?resource_id=example"));
    Check(!BrowserSessionPolicy.RequiresBrowser("https://search.google.com.evil.example/search-console/verification-download"));
    Check(!BrowserSessionPolicy.RequiresBrowser("https://example.com/google-verification.html"));
    bool rejected=false;
    try { BrowserSessionPolicy.ValidateResponse(new Uri("https://accounts.google.com/v3/signin/identifier"), "text/html; charset=utf-8"); } catch (System.IO.InvalidDataException) { rejected=true; }
    Check(rejected);
    BrowserSessionPolicy.ValidateResponse(new Uri("https://example.com/google-verification.html"), "text/html");
    Console.WriteLine("PASS session policy: Google browser-only verification, exact hostname, sign-in rejection and ordinary HTML preserved");
  }
}
