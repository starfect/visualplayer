import Foundation

enum SubtitleFinder {
    static func matches(for mediaURL: URL) -> [URL] {
        guard mediaURL.isFileURL else { return [] }
        let dir = mediaURL.deletingLastPathComponent()
        let stem = mediaURL.deletingPathExtension().lastPathComponent
        guard
            let entries = try? FileManager.default.contentsOfDirectory(
                at: dir, includingPropertiesForKeys: nil)
        else { return [] }

        return entries.filter { candidate in
            guard candidate != mediaURL,
                MediaType.subtitleExtensions.contains(candidate.pathExtension.lowercased())
            else { return false }
            let candidateStem = candidate.deletingPathExtension().lastPathComponent
            return candidateStem.caseInsensitiveCompare(stem) == .orderedSame
                || candidateStem.lowercased().hasPrefix(stem.lowercased() + ".")
        }
        .sorted { $0.lastPathComponent < $1.lastPathComponent }
    }
}
