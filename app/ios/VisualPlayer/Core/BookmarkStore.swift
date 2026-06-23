import Combine
import Foundation

/// A saved position inside a media file the user can jump back to.
struct Bookmark: Codable, Identifiable, Hashable {
    var id = UUID()
    let position: Double
    var label: String?
    let createdAt: Date
}

/// Per-file bookmarks, keyed by the media URL and persisted in `UserDefaults`.
/// Mirrors the Android `Bookmarks` store so both round-trip through backups.
@MainActor
final class BookmarkStore: ObservableObject {
    @Published private(set) var byURL: [String: [Bookmark]] = [:]

    private let defaults = UserDefaults.standard
    private let key = "bookmarks"

    init() { load() }

    func bookmarks(for url: URL) -> [Bookmark] {
        (byURL[url.absoluteString] ?? []).sorted { $0.position < $1.position }
    }

    func add(_ url: URL, position: Double, label: String? = nil) {
        var list = byURL[url.absoluteString] ?? []
        list.append(Bookmark(position: position, label: label, createdAt: Date()))
        byURL[url.absoluteString] = list
        persist()
    }

    func remove(_ url: URL, bookmark: Bookmark) {
        guard var list = byURL[url.absoluteString] else { return }
        list.removeAll { $0.id == bookmark.id }
        byURL[url.absoluteString] = list.isEmpty ? nil : list
        persist()
    }

    /// Snapshot for inclusion in a backup file.
    func snapshot() -> [String: [Bookmark]] { byURL }

    /// Replaces all bookmarks from a restored backup payload.
    func restore(_ data: [String: [Bookmark]]) {
        byURL = data
        persist()
    }

    private func persist() {
        if let data = try? JSONEncoder().encode(byURL) { defaults.set(data, forKey: key) }
    }

    private func load() {
        guard let data = defaults.data(forKey: key),
            let decoded = try? JSONDecoder().decode([String: [Bookmark]].self, from: data)
        else { return }
        byURL = decoded
    }
}
