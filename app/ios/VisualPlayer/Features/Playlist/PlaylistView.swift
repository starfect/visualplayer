import SwiftUI

struct PlaylistView: View {
    @EnvironmentObject var library: LibraryStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach(library.items) { item in
                    Button {
                        library.play(item)
                        dismiss()
                    } label: {
                        HStack {
                            Image(systemName: item.isAudio ? "music.note" : "film")
                                .foregroundStyle(.secondary)
                            Text(item.title).lineLimit(1)
                            Spacer()
                            if library.current == item {
                                Image(systemName: "speaker.wave.2.fill").foregroundStyle(.tint)
                            }
                        }
                    }
                }
                .onDelete { indexSet in
                    indexSet.map { library.items[$0] }.forEach(library.remove)
                }
            }
            .overlay {
                if library.items.isEmpty {
                    ContentUnavailableView("playlist.empty", systemImage: "list.bullet")
                }
            }
            .navigationTitle("playlist.title")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("settings.close") { dismiss() }
                }
            }
        }
    }
}
