import MediaPlayer

/// Drives the system "Now Playing" info and the remote command center so the
/// lock screen / Control Center show playback metadata and transport controls,
/// and so playback keeps running in the background (the app already declares the
/// `audio` background mode and uses the `.playback` audio-session category).
@MainActor
final class NowPlayingController {
    private let center = MPNowPlayingInfoCenter.default()
    private let commands = MPRemoteCommandCenter.shared()
    private var configured = false

    func configure(
        play: @escaping () -> Void,
        pause: @escaping () -> Void,
        toggle: @escaping () -> Void,
        next: @escaping () -> Void,
        previous: @escaping () -> Void,
        seek: @escaping (Double) -> Void
    ) {
        guard !configured else { return }
        configured = true

        commands.playCommand.addTarget { _ in play(); return .success }
        commands.pauseCommand.addTarget { _ in pause(); return .success }
        commands.togglePlayPauseCommand.addTarget { _ in toggle(); return .success }
        commands.nextTrackCommand.addTarget { _ in next(); return .success }
        commands.previousTrackCommand.addTarget { _ in previous(); return .success }
        commands.changePlaybackPositionCommand.addTarget { event in
            guard let event = event as? MPChangePlaybackPositionCommandEvent else {
                return .commandFailed
            }
            seek(event.positionTime)
            return .success
        }
        commands.nextTrackCommand.isEnabled = true
        commands.previousTrackCommand.isEnabled = true
        commands.changePlaybackPositionCommand.isEnabled = true
    }

    func update(title: String, duration: Double, position: Double, rate: Double, isPlaying: Bool) {
        var info: [String: Any] = [MPMediaItemPropertyTitle: title]
        if duration > 0 { info[MPMediaItemPropertyPlaybackDuration] = duration }
        info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = position
        info[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? rate : 0
        center.nowPlayingInfo = info
    }

    func clear() { center.nowPlayingInfo = nil }
}
