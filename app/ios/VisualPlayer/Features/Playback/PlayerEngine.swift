import UIKit

protocol PlayerEngine: AnyObject {
    var view: UIView { get }
    var isPlaying: Bool { get }
    var currentTime: Double { get }
    var duration: Double { get }
    var onTick: ((Double, Double) -> Void)? { get set }
    var onPlayingChange: ((Bool) -> Void)? { get set }
    var onEnded: (() -> Void)? { get set }
    func load(url: URL, subtitles: [URL])
    func play()
    func pause()
    func seek(to seconds: Double)
    func setRate(_ rate: Double)
    func setVolume(_ volume: Double)
    func addSubtitle(_ url: URL)
    func teardown()
}

enum EngineFactory {
    static func make(for url: URL) -> PlayerEngine {
        if MediaType.prefersNativePlayer(url) {
            return AVPlayerEngine()
        }
        #if canImport(VLCKit)
            return VLCEngine()
        #else
            return AVPlayerEngine()
        #endif
    }
}
