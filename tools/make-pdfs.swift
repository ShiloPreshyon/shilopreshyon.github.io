// Renders the printable documents to PDF with WebKit, one Letter page per .page element.
// Needs the local server running (python3 -m http.server 8642). Build and run:
//   swiftc -O tools/make-pdfs.swift -o /tmp/make-pdfs && /tmp/make-pdfs <url#flags> <out.pdf> [<url> <out.pdf> ...]
import AppKit
import WebKit
import PDFKit

let W: CGFloat = 816, H: CGFloat = 1056  // 8.5 x 11 in at 96 px/in
var jobs: [(String, String)] = []
let a = Array(CommandLine.arguments.dropFirst())
for i in stride(from: 0, to: a.count - 1, by: 2) { jobs.append((a[i], a[i + 1])) }

final class Runner: NSObject, WKNavigationDelegate {
  let web = WKWebView(frame: NSRect(x: 0, y: 0, width: W, height: H))
  var i = 0
  override init() { super.init(); web.navigationDelegate = self; next() }
  func next() {
    guard i < jobs.count else { exit(0) }
    web.load(URLRequest(url: URL(string: jobs[i].0)!))
  }
  func webView(_ w: WKWebView, didFail _: WKNavigation!, withError e: Error) { fail(e) }
  func webView(_ w: WKWebView, didFailProvisionalNavigation _: WKNavigation!, withError e: Error) { fail(e) }
  func webViewWebContentProcessDidTerminate(_ w: WKWebView) { print("✗ WebKit content process died"); exit(1) }
  func fail(_ e: Error) { print("✗ \(jobs[i].0): \(e.localizedDescription)"); exit(1) }
  func webView(_ w: WKWebView, didFinish _: WKNavigation!) {
    Task { @MainActor in
      // Wait until doc.js has finished (fonts loaded, bands drawn, overflow checked).
      var state = ""
      for _ in 0..<100 {
        state = (try? await w.evaluateJavaScript("document.body.dataset.ready || ''") as? String) ?? ""
        if !state.isEmpty { break }
        try? await Task.sleep(nanoseconds: 100_000_000)
      }
      guard state == "ok" else { print("✗ \(jobs[i].0): \(state.isEmpty ? "never ready" : "content overflows a page")"); exit(1) }
      let n = (try? await w.evaluateJavaScript("document.querySelectorAll('.page').length") as? Int) ?? 0
      w.frame = NSRect(x: 0, y: 0, width: W, height: H * CGFloat(n))
      try? await Task.sleep(nanoseconds: 300_000_000)
      // WebKit makes 816x1056 pt pages (1 CSS px = 1 pt); redraw them scaled to true Letter, 612x792 pt, staying vector.
      var box = CGRect(x: 0, y: 0, width: 612, height: 792)
      let info = [kCGPDFContextTitle: (w.title ?? "") as CFString, kCGPDFContextAuthor: "Shilo Preshyon" as CFString] as CFDictionary
      let ctx = CGContext(URL(fileURLWithPath: jobs[i].1) as CFURL, mediaBox: &box, info)!
      for p in 0..<n {
        let cfg = WKPDFConfiguration()
        cfg.rect = CGRect(x: 0, y: H * CGFloat(p), width: W, height: H)
        let data = try! await w.pdf(configuration: cfg)
        let page = PDFDocument(data: data)!.page(at: 0)!
        ctx.beginPDFPage(nil)
        ctx.scaleBy(x: 612 / W, y: 792 / H)
        page.draw(with: .mediaBox, to: ctx)
        ctx.endPDFPage()
      }
      ctx.closePDF()
      print("✓ \(jobs[i].1) (\(n) page\(n == 1 ? "" : "s"))")
      i += 1; next()
    }
  }
}

let app = NSApplication.shared
app.setActivationPolicy(.prohibited)
let runner = Runner()
// Watchdog: never hang silently.
DispatchQueue.main.asyncAfter(deadline: .now() + 60) { print("✗ timed out on job \(runner.i + 1) of \(jobs.count)"); exit(1) }
app.run()
