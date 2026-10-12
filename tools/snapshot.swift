// Renders a page to PNG with WebKit (used for og.png, the link-preview image).
// Needs the local server running. Build and run:
//   swiftc -O tools/snapshot.swift -o /tmp/snapshot && /tmp/snapshot <url> <out.png> <width> <height>
import AppKit
import WebKit

let a = CommandLine.arguments
let url = URL(string: a[1])!, out = a[2]
let W = CGFloat(Double(a[3])!), H = CGFloat(Double(a[4])!)

final class Shot: NSObject, WKNavigationDelegate {
  let web = WKWebView(frame: NSRect(x: 0, y: 0, width: W, height: H))
  override init() { super.init(); web.navigationDelegate = self; web.load(URLRequest(url: url)) }
  func webView(_ w: WKWebView, didFail _: WKNavigation!, withError e: Error) { print("✗ \(e.localizedDescription)"); exit(1) }
  func webView(_ w: WKWebView, didFailProvisionalNavigation _: WKNavigation!, withError e: Error) { print("✗ \(e.localizedDescription)"); exit(1) }
  func webView(_ w: WKWebView, didFinish _: WKNavigation!) {
    Task { @MainActor in
      for _ in 0..<100 {
        if let s = try? await w.evaluateJavaScript("document.body.dataset.ready || ''") as? String, s == "ok" { break }
        try? await Task.sleep(nanoseconds: 100_000_000)
      }
      try? await Task.sleep(nanoseconds: 300_000_000)
      let cfg = WKSnapshotConfiguration()
      cfg.rect = CGRect(x: 0, y: 0, width: W, height: H)
      cfg.snapshotWidth = NSNumber(value: Double(W))  // exactly W pixels wide, whatever the screen scale
      let img = try! await w.takeSnapshot(configuration: cfg)
      let rep = NSBitmapImageRep(cgImage: img.cgImage(forProposedRect: nil, context: nil, hints: nil)!)
      try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: out))
      print("✓ \(out) (\(rep.pixelsWide)x\(rep.pixelsHigh))")
      exit(0)
    }
  }
}
let app = NSApplication.shared
app.setActivationPolicy(.prohibited)
let shot = Shot()
DispatchQueue.main.asyncAfter(deadline: .now() + 60) { print("✗ timed out"); exit(1) }
app.run()
