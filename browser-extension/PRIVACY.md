# Baran browser extension privacy

The extension sends links and visible media URLs to Baran Download Manager on your own computer through Windows Native Messaging. The required Firefox data categories describe this transfer outside the browser; Baran does not operate an upload or analytics server.

- Clicking a collection action sends the links or media URLs on the active page or selected region.
- Optional **Handle new downloads in Baran** access observes new HTTP(S) download URLs after you enable it and grant the downloads permission. It starts disabled for each browser.
- Private-window downloads, downloads created by another extension, `blob:`/`data:` URLs, browser cookies, passwords, authorization headers and POST request bodies are not transferred by this extension.
- Baran stores the review inbox locally. You can remove inbox items; queued downloads and settings are also kept locally. Downloading a selected file contacts its source server.
- Media tools can use your authorized cookies only when you explicitly choose a browser profile or cookies file in desktop settings. This is separate from the extension's URL collection.
- There is no advertising, telemetry or sale of browsing data in this extension.

This extension is open source under GPL-3.0-or-later. Source and issue tracker: https://github.com/mehdiporbaba/Baran-Download-Manager
