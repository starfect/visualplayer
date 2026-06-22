#if canImport(VLCKit)
    import UIKit
    import VLCKit

    final class VLCEngine: NSObject, PlayerEngine, VLCMediaPlayerDelegate {
        let view: UIView = UIView()
        private let player = VLCMediaPlayer()

        var onTick: ((Double, Double) -> Void)?
        var onPlayingChange: ((Bool) -> Void)?
        var onEnded: (() -> Void)?

        override init() {
            super.init()
            view.backgroundColor = .black
            player.drawable = view
            player.delegate = self
        }

        var isPlaying: Bool { player.isPlaying }
        var currentTime: Double { Double(player.time.intValue) / 1000 }
        var duration: Double { Double(player.media?.length.intValue ?? 0) / 1000 }

        func load(url: URL, subtitles: [URL]) {
            player.media = VLCMedia(url: url)
            play()
            for subtitle in subtitles { addSubtitle(subtitle) }
        }

        func play() { player.play() }
        func pause() { player.pause() }
        func seek(to seconds: Double) { player.time = VLCTime(int: Int32(seconds * 1000)) }
        func setRate(_ rate: Double) { player.rate = Float(rate) }
        func setVolume(_ volume: Double) { player.audio?.volume = Int32(min(200, volume)) }

        func addSubtitle(_ url: URL) {
            player.addPlaybackSlave(url, type: .subtitle, enforce: true)
        }

        func teardown() { player.stop() }

        func mediaPlayerTimeChanged(_ notification: Notification) {
            onTick?(currentTime, duration)
        }

        func mediaPlayerStateChanged(_ notification: Notification) {
            onPlayingChange?(player.isPlaying)
            if player.state == .stopped || player.state == .ended {
                onEnded?()
            }
        }
    }
#endif
