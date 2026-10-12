// Loudness meter (ITU-R BS.1770-4 / EBU R128): integrated loudness, gating blocks and true peak.
//   swiftc -O tools/measure.swift -o /tmp/measure
//   /tmp/measure <audio file>   -> JSON: {"lufs", "tp", "blocks": [mean-square power per 400 ms block, 100 ms hop]}
//   /tmp/measure --selftest     -> checks against tones with known answers
// The blocks let tools/levels.mjs gate several files together (album loudness).
import AVFoundation
import Foundation

struct Biquad {
  var b0, b1, b2, a1, a2: Double
  var z1 = 0.0, z2 = 0.0
  mutating func run(_ x: Double) -> Double {
    let y = b0 * x + z1
    z1 = b1 * x - a1 * y + z2
    z2 = b2 * x - a2 * y
    return y
  }
}

// K-weighting for any sample rate (BS.1770 pre-filter + RLB high-pass, bilinear form).
func kWeighting(_ fs: Double) -> [Biquad] {
  var K = tan(.pi * 1681.974450955533 / fs)
  let Q1 = 0.7071752369554196, Vh = pow(10, 3.999843853973347 / 20), Vb = pow(Vh, 0.4996667741545416)
  var a0 = 1 + K / Q1 + K * K
  let shelf = Biquad(b0: (Vh + Vb * K / Q1 + K * K) / a0, b1: 2 * (K * K - Vh) / a0, b2: (Vh - Vb * K / Q1 + K * K) / a0,
                     a1: 2 * (K * K - 1) / a0, a2: (1 - K / Q1 + K * K) / a0)
  K = tan(.pi * 38.13547087602444 / fs)
  let Q2 = 0.5003270373238773
  a0 = 1 + K / Q2 + K * K
  let hp = Biquad(b0: 1, b1: -2, b2: 1, a1: 2 * (K * K - 1) / a0, a2: (1 - K / Q2 + K * K) / a0)
  return [shelf, hp]
}

// True peak: 4x oversampling with a 48-tap windowed-sinc interpolator (BS.1770 Annex 2 style).
struct TruePeak {
  static let phases = 4, taps = 12
  static let coef: [[Double]] = (0..<phases).map { p in
    (0..<taps).map { k in
      let t = Double(k - taps / 2) + Double(phases - p) / Double(phases) - 1 + 1e-12
      let w = 0.5 * (1 + cos(.pi * t / Double(taps / 2 + 1)))
      return sin(.pi * t) / (.pi * t) * w
    }
  }
  var hist = [Double](repeating: 0, count: taps), i = 0, peak = 0.0
  mutating func push(_ x: Double) {
    hist[i] = x; i = (i + 1) % TruePeak.taps
    peak = max(peak, abs(x))
    for p in 0..<TruePeak.phases {
      var y = 0.0
      for k in 0..<TruePeak.taps { y += TruePeak.coef[p][k] * hist[(i + k) % TruePeak.taps] }
      peak = max(peak, abs(y))
    }
  }
}

func gated(_ blocks: [Double]) -> Double {
  let lufs = { (z: Double) in -0.691 + 10 * log10(z) }
  let abs = blocks.filter { $0 > 0 && lufs($0) > -70 }
  guard !abs.isEmpty else { return -.infinity }
  let rel = lufs(abs.reduce(0, +) / Double(abs.count)) - 10
  let kept = abs.filter { lufs($0) > rel }
  return lufs(kept.reduce(0, +) / Double(kept.count))
}

func measure(channels: [[Float]], fs: Double) -> (lufs: Double, tp: Double, blocks: [Double]) {
  let n = channels[0].count, step = Int(fs * 0.1)
  var sq = [Double](repeating: 0, count: n)  // per-sample K-weighted power, summed over channels (all weight 1)
  var tp = 0.0
  for ch in channels {
    var f = kWeighting(fs), t = TruePeak()
    for s in 0..<n {
      let x = Double(ch[s])
      let y = f[1].run(f[0].run(x))
      sq[s] += y * y
      t.push(x)
    }
    tp = max(tp, t.peak)
  }
  var blocks: [Double] = []
  var start = 0
  while start + 4 * step <= n {
    var e = 0.0
    for s in start..<(start + 4 * step) { e += sq[s] }
    blocks.append(e / Double(4 * step))
    start += step
  }
  return (gated(blocks), 20 * log10(max(tp, 1e-12)), blocks)
}

func read(_ path: String) -> ([[Float]], Double) {
  let file = try! AVAudioFile(forReading: URL(fileURLWithPath: path))
  let fmt = file.processingFormat, n = Int(file.length)
  let buf = AVAudioPCMBuffer(pcmFormat: fmt, frameCapacity: AVAudioFrameCount(n))!
  try! file.read(into: buf)
  let len = Int(buf.frameLength)
  let chans = (0..<Int(fmt.channelCount)).map { c in Array(UnsafeBufferPointer(start: buf.floatChannelData![c], count: len)) }
  return (chans, fmt.sampleRate)
}

let args = CommandLine.arguments
if args.count > 1 && args[1] == "--selftest" {
  // Known answers: 997 Hz sine at 0 dBFS in both channels reads about 0.0 LUFS; at -20 dBFS, about -20.0.
  // A 997 Hz sine at 0 dBFS in one channel only reads about -3.0 LUFS.
  func sine(_ db: Double, _ n: Int, fs: Double) -> [Float] {
    let amp = pow(10.0, db / 20), w = 2.0 * Double.pi * 997.0 / fs
    var out = [Float](repeating: 0, count: n)
    for i in 0..<n { out[i] = Float(amp * sin(w * Double(i))) }
    return out
  }
  for fs in [44100.0, 48000.0, 96000.0] {
    let n = Int(fs * 5)
    let a = measure(channels: [sine(0, n, fs: fs), sine(0, n, fs: fs)], fs: fs)
    let b = measure(channels: [sine(-20, n, fs: fs), sine(-20, n, fs: fs)], fs: fs)
    let c = measure(channels: [sine(0, n, fs: fs), [Float](repeating: 0, count: n)], fs: fs)
    print(String(format: "fs %6.0f: both 0 dBFS %+.2f LUFS (0.00) | -20 dBFS %+.2f (-20.00) | one ch %+.2f (-3.01) | TP %+.2f dBTP (~0)",
                 fs, a.lufs, b.lufs, c.lufs, a.tp))
  }
  exit(0)
}
let (chans, fs) = read(args[1])
let r = measure(channels: chans, fs: fs)
let blocks = r.blocks.map { String(format: "%.6e", $0) }.joined(separator: ",")
print("{\"lufs\":\(r.lufs.isFinite ? String(format: "%.2f", r.lufs) : "null"),\"tp\":\(String(format: "%.2f", r.tp)),\"blocks\":[\(blocks)]}")
