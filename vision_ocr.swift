import Foundation
import Vision
import AppKit

guard CommandLine.arguments.count >= 2 else {
    fputs("Usage: vision_ocr <image_path>\n", stderr)
    exit(1)
}

let imagePath = CommandLine.arguments[1]
let imageURL = URL(fileURLWithPath: imagePath)

guard let nsImage = NSImage(contentsOf: imageURL),
      let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    fputs("Failed to load image: \(imagePath)\n", stderr)
    exit(1)
}

let imgW = CGFloat(cgImage.width)
let imgH = CGFloat(cgImage.height)

let sema = DispatchSemaphore(value: 0)
var output: [[String: Any]] = []

let request = VNRecognizeTextRequest { req, err in
    defer { sema.signal() }
    guard let results = req.results as? [VNRecognizedTextObservation] else { return }
    for obs in results {
        guard let top = obs.topCandidates(1).first else { continue }
        let text = top.string
        let bb = obs.boundingBox  // normalized, origin bottom-left
        let x = bb.origin.x * imgW
        let y = (1.0 - bb.origin.y - bb.size.height) * imgH  // flip Y
        let w = bb.size.width * imgW
        let h = bb.size.height * imgH
        output.append(["text": text, "x": Int(x), "y": Int(y), "w": Int(w), "h": Int(h)])
    }
}

request.recognitionLanguages = ["ja", "en"]
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try? handler.perform([request])
sema.wait()

if let data = try? JSONSerialization.data(withJSONObject: output, options: []),
   let json = String(data: data, encoding: .utf8) {
    print(json)
}
