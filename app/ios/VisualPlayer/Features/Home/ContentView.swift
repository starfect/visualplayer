import SwiftUI
import UniformTypeIdentifiers

struct ContentView: View {
    @EnvironmentObject var settings: SettingsStore
    @EnvironmentObject var library: LibraryStore
    @StateObject private var player = PlayerViewModel()

    @State private var showPlaylist = false
    @State private var showSettings = false
    @State private var showBookmarks = false
    @State private var showImporter = false
    @State private var controlsVisible = true

    var body: some View {
        ZStack {
            Color.cinemaCanvas.ignoresSafeArea()

            if library.current != nil {
                PlayerSurface(renderView: player.renderView).ignoresSafeArea()
                GestureLayer(player: player, enabled: settings.gesturesEnabled).ignoresSafeArea()
                if controlsVisible {
                    PlayerControls(
                        player: player,
                        showPlaylist: $showPlaylist,
                        showSettings: $showSettings,
                        showBookmarks: $showBookmarks
                    )
                    .transition(.opacity)
                }
            } else {
                emptyState
            }
        }
        .contentShape(Rectangle())
        .onTapGesture { withAnimation { controlsVisible.toggle() } }
        .sheet(isPresented: $showPlaylist) { PlaylistView() }
        .sheet(isPresented: $showSettings) { SettingsView() }
        .sheet(isPresented: $showBookmarks) { BookmarksView(player: player) }
        .fileImporter(
            isPresented: $showImporter,
            allowedContentTypes: [.movie, .audio, .mpeg4Movie, .item],
            allowsMultipleSelection: true
        ) { result in
            if case let .success(urls) = result { importFiles(urls) }
        }
        .onChange(of: library.currentIndex) { _ in loadCurrent() }
        .onAppear {
            player.onEnded = { [weak library] in library?.onPlaybackEnded() }
            player.onSkipNext = { [weak library] in library?.advance(by: 1) }
            player.onSkipPrevious = { [weak library] in library?.advance(by: -1) }
            loadCurrent()
        }
    }

    private var emptyState: some View {
        VStack(spacing: 18) {
            Image(systemName: "play.circle.fill")
                .font(.system(size: 78))
                .foregroundStyle(Color.brandGradient)
                .shadow(color: .brand.opacity(0.6), radius: 28)
            Text("app.drop_hint")
                .multilineTextAlignment(.center)
                .foregroundStyle(.white.opacity(0.8))
            Button { showImporter = true } label: {
                Text("app.open_file").bold()
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .clipShape(Capsule())
        }
        .padding()
    }

    private func loadCurrent() {
        guard let item = library.current else { return }
        player.load(item, autoloadSubtitles: settings.autoloadSubtitles)
    }

    private func importFiles(_ urls: [URL]) {
        let accessible = urls.filter { $0.startAccessingSecurityScopedResource() }
        library.openMany(accessible.isEmpty ? urls : accessible)
    }
}
