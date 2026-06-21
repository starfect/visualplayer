import SwiftUI

struct GestureLayer: View {
    @ObservedObject var player: PlayerViewModel
    let enabled: Bool

    @State private var mode: Mode = .none
    @State private var startValue: Double = 0
    @State private var startTime: Double = 0
    @State private var pendingSeek: Double = 0
    @State private var feedback: String?
    @State private var hideTask: Task<Void, Never>?

    enum Mode { case none, seek, volume, brightness }

    var body: some View {
        GeometryReader { geo in
            ZStack {
                Color.clear.contentShape(Rectangle())
                if let feedback {
                    Text(feedback)
                        .font(.system(.body, design: .rounded).monospacedDigit())
                        .padding(.horizontal, 16).padding(.vertical, 8)
                        .background(.ultraThinMaterial, in: Capsule())
                }
            }
            .gesture(enabled ? drag(in: geo.size) : nil)
            .gesture(
                SpatialTapGesture(count: 2).onEnded { event in
                    guard enabled else { return }
                    let forward = event.location.x > geo.size.width / 2
                    player.seek(by: forward ? 10 : -10)
                    show(forward ? "+10s" : "-10s")
                }
            )
        }
        .allowsHitTesting(enabled)
    }

    private func drag(in size: CGSize) -> some Gesture {
        DragGesture(minimumDistance: 10)
            .onChanged { value in
                if mode == .none {
                    if abs(value.translation.width) > abs(value.translation.height) {
                        mode = .seek
                        startTime = player.currentTime
                    } else if value.startLocation.x < size.width / 2 {
                        mode = .brightness
                        startValue = Double(UIScreen.main.brightness)
                    } else {
                        mode = .volume
                        startValue = player.volume
                    }
                }
                switch mode {
                case .seek:
                    let delta = Double(value.translation.width / size.width) * 90
                    pendingSeek = max(0, startTime + delta)
                    show(String(format: "%+.0fs", delta))
                case .volume:
                    let v = clamp(startValue - Double(value.translation.height / size.height) * 150, 0, 100)
                    player.setVolume(v)
                    show("♪ \(Int(v))%")
                case .brightness:
                    let b = clamp(startValue - Double(value.translation.height / size.height) * 1.2, 0.1, 1)
                    UIScreen.main.brightness = CGFloat(b)
                    show("☀ \(Int(b * 100))%")
                case .none:
                    break
                }
            }
            .onEnded { _ in
                if mode == .seek { player.seek(to: pendingSeek) }
                mode = .none
            }
    }

    private func clamp(_ v: Double, _ lo: Double, _ hi: Double) -> Double { min(hi, max(lo, v)) }

    private func show(_ text: String) {
        feedback = text
        hideTask?.cancel()
        hideTask = Task {
            try? await Task.sleep(nanoseconds: 700_000_000)
            if !Task.isCancelled { feedback = nil }
        }
    }
}
