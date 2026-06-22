import Combine
import Foundation

@MainActor
final class LibraryStore: ObservableObject {
    @Published private(set) var items: [MediaItem] = []
    @Published var currentIndex: Int?
    @Published var repeatMode: RepeatMode = .off
    @Published var shuffle = false

    var current: MediaItem? {
        guard let i = currentIndex, items.indices.contains(i) else { return nil }
        return items[i]
    }

    func open(url: URL) {
        let ext = url.pathExtension.lowercased()
        if ext == "webvideo" || ext == "ytvideo", let resolved = SourceResolver.resolve(fileURL: url) {
            append(resolved, playImmediately: true)
            return
        }
        append(makeItem(url), playImmediately: true)
    }

    func openMany(_ urls: [URL]) {
        for (offset, url) in urls.enumerated() {
            append(makeItem(url), playImmediately: offset == 0 && current == nil)
        }
    }

    private func makeItem(_ url: URL) -> MediaItem {
        var item = MediaItem(url: url)
        item.externalSubtitles = SubtitleFinder.matches(for: url)
        return item
    }

    private func append(_ item: MediaItem, playImmediately: Bool) {
        items.append(item)
        if currentIndex == nil || playImmediately {
            currentIndex = items.count - 1
        }
    }

    func play(_ item: MediaItem) {
        if let i = items.firstIndex(of: item) { currentIndex = i }
    }

    func remove(_ item: MediaItem) {
        guard let i = items.firstIndex(of: item) else { return }
        items.remove(at: i)
        if items.isEmpty { currentIndex = nil }
        else if let cur = currentIndex, i < cur { currentIndex = cur - 1 }
        else if currentIndex == i { currentIndex = min(i, items.count - 1) }
    }

    func advance(by delta: Int) {
        guard let cur = currentIndex, !items.isEmpty else { return }
        var next = cur + delta
        if next < 0 || next >= items.count {
            guard repeatMode == .all else { return }
            next = (next + items.count) % items.count
        }
        currentIndex = next
    }

    func onPlaybackEnded() {
        if repeatMode == .one { objectWillChange.send() } else { advance(by: 1) }
    }
}
