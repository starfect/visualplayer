import AVFoundation
import AVKit
import UIKit

final class PlayerLayerView: UIView {
    override class var layerClass: AnyClass { AVPlayerLayer.self }
    var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }
}

final class AVPlayerEngine: PlayerEngine {
    let view: UIView
    private let player = AVPlayer()
    private var timeObserver: Any?
    private var pipController: AVPictureInPictureController?

    var onTick: ((Double, Double) -> Void)?
    var onPlayingChange: ((Bool) -> Void)?
    var onEnded: (() -> Void)?

    init() {
        let surface = PlayerLayerView()
        surface.playerLayer.player = player
        surface.playerLayer.videoGravity = .resizeAspect
        view = surface
        activateAudioSession()
        if AVPictureInPictureController.isPictureInPictureSupported() {
            pipController = AVPictureInPictureController(playerLayer: surface.playerLayer)
        }

        let interval = CMTime(seconds: 0.5, preferredTimescale: 600)
        timeObserver = player.addPeriodicTimeObserver(forInterval: interval, queue: .main) {
            [weak self] time in
            guard let self else { return }
            let dur = self.player.currentItem?.duration.seconds ?? 0
            self.onTick?(time.seconds, dur.isFinite ? dur : 0)
        }
        NotificationCenter.default.addObserver(
            self, selector: #selector(playbackEnded),
            name: .AVPlayerItemDidPlayToEndTime, object: nil)
    }

    private func activateAudioSession() {
        try? AVAudioSession.sharedInstance().setCategory(.playback)
        try? AVAudioSession.sharedInstance().setActive(true)
    }

    var isPlaying: Bool { player.rate != 0 }
    var currentTime: Double { player.currentTime().seconds }
    var duration: Double { player.currentItem?.duration.seconds ?? 0 }

    func load(url: URL, subtitles: [URL]) {
        player.replaceCurrentItem(with: AVPlayerItem(url: url))
        play()
    }

    func play() {
        player.play()
        onPlayingChange?(true)
    }

    func pause() {
        player.pause()
        onPlayingChange?(false)
    }

    func seek(to seconds: Double) {
        player.seek(to: CMTime(seconds: seconds, preferredTimescale: 600))
    }

    func setRate(_ rate: Double) {
        if isPlaying { player.rate = Float(rate) }
        player.defaultRate = Float(rate)
    }

    func setVolume(_ volume: Double) {
        player.volume = Float(min(1, volume / 100))
    }

    func addSubtitle(_ url: URL) {
        // Sidecar subtitles for AVPlayer require an AVMutableComposition; broad
        // subtitle support is provided by the VLC engine.
    }

    var supportsPictureInPicture: Bool { pipController != nil }

    func startPictureInPicture() {
        pipController?.startPictureInPicture()
    }

    @objc private func playbackEnded() {
        onPlayingChange?(false)
        onEnded?()
    }

    func teardown() {
        if let observer = timeObserver { player.removeTimeObserver(observer) }
        NotificationCenter.default.removeObserver(self)
        player.replaceCurrentItem(with: nil)
    }
}
