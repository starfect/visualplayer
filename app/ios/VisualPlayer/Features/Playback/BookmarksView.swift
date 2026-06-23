import SwiftUI

/// Lists the bookmarks saved for the currently playing item. Tapping one seeks
/// to it; swipe to delete.
struct BookmarksView: View {
    @ObservedObject var player: PlayerViewModel
    @EnvironmentObject var library: LibraryStore
    @EnvironmentObject var bookmarks: BookmarkStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Group {
                if let url = library.current?.url {
                    let marks = bookmarks.bookmarks(for: url)
                    if marks.isEmpty {
                        emptyState
                    } else {
                        List {
                            ForEach(marks) { mark in
                                Button {
                                    player.seek(to: mark.position)
                                    dismiss()
                                } label: {
                                    Label(
                                        mark.label ?? timeString(mark.position),
                                        systemImage: "bookmark.fill")
                                }
                            }
                            .onDelete { offsets in
                                for index in offsets { bookmarks.remove(url, bookmark: marks[index]) }
                            }
                        }
                    }
                } else {
                    emptyState
                }
            }
            .navigationTitle("bookmark.title")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("settings.close") { dismiss() }
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "bookmark")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("bookmark.none").foregroundStyle(.secondary)
        }
    }

    private func timeString(_ seconds: Double) -> String {
        let total = Int(max(0, seconds))
        let h = total / 3600
        let m = (total % 3600) / 60
        let s = total % 60
        return h > 0 ? String(format: "%d:%02d:%02d", h, m, s) : String(format: "%d:%02d", m, s)
    }
}
