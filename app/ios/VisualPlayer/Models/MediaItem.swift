import Foundation

struct MediaItem: Identifiable, Hashable {
    let id = UUID()
    let url: URL
    var displayTitle: String?
    var externalSubtitles: [URL] = []
    var isRemote: Bool { url.scheme == "http" || url.scheme == "https" }

    var title: String { displayTitle ?? url.deletingPathExtension().lastPathComponent }
    var isAudio: Bool { MediaType.audioExtensions.contains(url.pathExtension.lowercased()) }
}

enum MediaType {
    static let videoExtensions: Set<String> = [
        "mp4", "mkv", "mov", "avi", "webm", "m4v", "wmv", "flv", "ts", "m2ts", "mts",
        "3gp", "mpg", "mpeg", "vob", "ogv", "rm", "rmvb", "asf", "divx",
    ]
    static let audioExtensions: Set<String> = [
        "mp3", "aac", "m4a", "flac", "wav", "ogg", "oga", "opus", "wma", "alac", "aiff", "amr",
    ]
    static let subtitleExtensions: Set<String> = [
        "srt", "ass", "ssa", "vtt", "sub", "smi", "sami", "ttml", "dfxp", "sbv",
    ]
    static let nativeExtensions: Set<String> = ["mp4", "m4v", "mov", "m4a", "mp3", "aac", "wav", "3gp"]

    static func isMedia(_ url: URL) -> Bool {
        let ext = url.pathExtension.lowercased()
        return videoExtensions.contains(ext) || audioExtensions.contains(ext)
    }

    static func prefersNativePlayer(_ url: URL) -> Bool {
        nativeExtensions.contains(url.pathExtension.lowercased())
    }
}

enum RepeatMode: String, CaseIterable {
    case off, one, all
}
