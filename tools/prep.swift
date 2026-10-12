// Readies a float WAV for 24-bit FLAC: finds the sample peak and, only if it goes over full scale, turns the
// whole file down just enough (a plain gain, no limiting) while writing a 24-bit WAV.
//   swiftc -O tools/prep.swift -o /tmp/prep
//   /tmp/prep <in.wav> <out.wav>   -> JSON {"peak": dBFS, "gain": dB applied (0 if none)}
import AVFoundation
import Foundation

let a = CommandLine.arguments
let input = try! AVAudioFile(forReading: URL(fileURLWithPath: a[1]))
let fmt = input.processingFormat, chunk: AVAudioFrameCount = 1 << 18
let buf = AVAudioPCMBuffer(pcmFormat: fmt, frameCapacity: chunk)!

// Pass 1: sample peak.
var peak: Float = 0
while input.framePosition < input.length {
  try! input.read(into: buf, frameCount: chunk)
  for c in 0..<Int(fmt.channelCount) {
    let p = buf.floatChannelData![c]
    for i in 0..<Int(buf.frameLength) { peak = max(peak, abs(p[i])) }
  }
}
let ceiling: Float = 0.999 // about -0.01 dBFS, so 24-bit rounding can't clip
let gain: Float = peak > ceiling ? ceiling / peak : 1

// Pass 2: write 24-bit integer WAV at the same rate, scaled only if needed.
let settings: [String: Any] = [AVFormatIDKey: kAudioFormatLinearPCM, AVSampleRateKey: fmt.sampleRate,
                               AVNumberOfChannelsKey: fmt.channelCount, AVLinearPCMBitDepthKey: 24,
                               AVLinearPCMIsFloatKey: false, AVLinearPCMIsBigEndianKey: false]
var output: AVAudioFile? = try! AVAudioFile(forWriting: URL(fileURLWithPath: a[2]), settings: settings,
                              commonFormat: .pcmFormatFloat32, interleaved: false)
input.framePosition = 0
while input.framePosition < input.length {
  try! input.read(into: buf, frameCount: chunk)
  if gain != 1 {
    for c in 0..<Int(fmt.channelCount) {
      let p = buf.floatChannelData![c]
      for i in 0..<Int(buf.frameLength) { p[i] *= gain }
    }
  }
  try! output!.write(from: buf)
}
output = nil // closes the file and finalises the WAV header
let db = { (x: Float) in x > 0 ? 20 * log10(Double(x)) : -200 }
print(String(format: "{\"peak\":%.2f,\"gain\":%.2f}", db(peak), gain == 1 ? 0 : db(gain)))
