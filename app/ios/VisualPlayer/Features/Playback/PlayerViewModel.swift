import Combine
import UIKit

@MainActor
final class PlayerViewModel: ObservableObject {
    @Published var isPlaying = false
    @Published var currentTime: Double = 0
    @Published var duration: Double = 0
    @Published var rate: Double = 1
    @Published var volume: Double = 100
    @Published var brightness: Double = 1
    @Published private(set) var renderView: UIView?
    @Published private(set) var canPictureInPicture = false

    var onEnded: (() -> Void)?
    /// Skip callbacks, wired by the host to the playlist/library so the lock
    /// screen "next/previous" controls move through the queue.
    var onSkipNext: (() -> Void)?
    var onSkipPrevious: (() -> Void)?

    private var engine: PlayerEngine?
    private let nowPlaying = NowPlayingController()
    private var title = "VisualPlayer"

    init() {
        nowPlaying.configure(
            play: { [weak self] in self?.engine?.play() },
            pause: { [weak self] in self?.engine?.pause() },
            toggle: { [weak self] in self?.togglePlay() },
            next: { [weak self] in self?.onSkipNext?() },
            previous: { [weak self] in self?.onSkipPrevious?() },
            seek: { [weak self] time in self?.seek(to: time) }
        )
    }

    func load(_ item: MediaItem, autoloadSubtitles: Bool) {
        engine?.teardown()
        title = item.title
        let engine = EngineFactory.make(for: item.url)
        engine.onTick = { [weak self] time, dur in
            self?.currentTime = time
            self?.duration = dur
            self?.refreshNowPlaying()
        }
        engine.onPlayingChange = { [weak self] playing in
            self?.isPlaying = playing
            self?.refreshNowPlaying()
        }
        engine.onEnded = { [weak self] in self?.onEnded?() }
        engine.setVolume(volume)
        engine.setRate(rate)
        let subtitles = autoloadSubtitles ? item.externalSubtitles : []
        engine.load(url: item.url, subtitles: subtitles)
        self.engine = engine
        renderView = engine.view
        canPictureInPicture = engine.supportsPictureInPicture
        refreshNowPlaying()
    }

    func togglePlay() { isPlaying ? engine?.pause() : engine?.play() }
    func seek(to seconds: Double) {
        let target = max(0, min(seconds, duration > 0 ? duration : seconds))
        engine?.seek(to: target)
        currentTime = target
        refreshNowPlaying()
    }
    func seek(by delta: Double) { seek(to: currentTime + delta) }
    func setRate(_ value: Double) {
        rate = value
        engine?.setRate(value)
        refreshNowPlaying()
    }
    func setVolume(_ value: Double) {
        volume = min(150, max(0, value))
        engine?.setVolume(volume)
    }
    func addSubtitle(_ url: URL) { engine?.addSubtitle(url) }

    func startPictureInPicture() { engine?.startPictureInPicture() }

    func stop() {
        engine?.teardown()
        engine = nil
        nowPlaying.clear()
    }

    private func refreshNowPlaying() {
        nowPlaying.update(
            title: title,
            duration: duration,
            position: currentTime,
            rate: rate,
            isPlaying: isPlaying
        )
    }
}
