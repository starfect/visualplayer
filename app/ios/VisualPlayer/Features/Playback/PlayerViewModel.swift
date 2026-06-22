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

    var onEnded: (() -> Void)?
    private var engine: PlayerEngine?

    func load(_ item: MediaItem, autoloadSubtitles: Bool) {
        engine?.teardown()
        let engine = EngineFactory.make(for: item.url)
        engine.onTick = { [weak self] time, dur in
            self?.currentTime = time
            self?.duration = dur
        }
        engine.onPlayingChange = { [weak self] playing in self?.isPlaying = playing }
        engine.onEnded = { [weak self] in self?.onEnded?() }
        engine.setVolume(volume)
        engine.setRate(rate)
        let subtitles = autoloadSubtitles ? item.externalSubtitles : []
        engine.load(url: item.url, subtitles: subtitles)
        self.engine = engine
        renderView = engine.view
    }

    func togglePlay() { isPlaying ? engine?.pause() : engine?.play() }
    func seek(to seconds: Double) {
        let target = max(0, min(seconds, duration > 0 ? duration : seconds))
        engine?.seek(to: target)
        currentTime = target
    }
    func seek(by delta: Double) { seek(to: currentTime + delta) }
    func setRate(_ value: Double) {
        rate = value
        engine?.setRate(value)
    }
    func setVolume(_ value: Double) {
        volume = min(150, max(0, value))
        engine?.setVolume(volume)
    }
    func addSubtitle(_ url: URL) { engine?.addSubtitle(url) }
}
