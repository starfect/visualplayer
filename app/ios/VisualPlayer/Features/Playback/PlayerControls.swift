import SwiftUI

struct PlayerControls: View {
    @ObservedObject var player: PlayerViewModel
    @EnvironmentObject var library: LibraryStore
    @EnvironmentObject var bookmarks: BookmarkStore
    @Binding var showPlaylist: Bool
    @Binding var showSettings: Bool
    @Binding var showBookmarks: Bool

    private let rates: [Double] = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

    var body: some View {
        VStack {
            HStack {
                Text(library.current?.title ?? "VisualPlayer").font(.headline).lineLimit(1)
                Spacer()
                Button { showSettings = true } label: { Image(systemName: "gearshape") }
            }
            .padding(.horizontal).padding(.top, 8)
            .background(LinearGradient(colors: [.black.opacity(0.5), .clear], startPoint: .top, endPoint: .bottom))

            Spacer()

            VStack(spacing: 14) {
                HStack(spacing: 10) {
                    Text(timeString(player.currentTime)).font(.caption.monospacedDigit())
                    Slider(
                        value: Binding(get: { player.currentTime }, set: { player.seek(to: $0) }),
                        in: 0...max(player.duration, 1)
                    )
                    .tint(.white)
                    Text(timeString(player.duration)).font(.caption.monospacedDigit())
                }
                HStack(spacing: 30) {
                    Button { library.advance(by: -1) } label: { Image(systemName: "backward.end.fill") }
                    Button { player.seek(by: -10) } label: { Image(systemName: "gobackward.10") }
                    Button { player.togglePlay() } label: {
                        Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                            .font(.title)
                            .foregroundStyle(.white)
                            .frame(width: 66, height: 66)
                            .background(Color.brandGradient, in: Circle())
                            .shadow(color: .brand.opacity(0.6), radius: 16, y: 4)
                    }
                    Button { player.seek(by: 10) } label: { Image(systemName: "goforward.10") }
                    Button { library.advance(by: 1) } label: { Image(systemName: "forward.end.fill") }
                }
                .font(.title3)
                HStack(spacing: 22) {
                    Menu {
                        ForEach(rates, id: \.self) { rate in
                            Button(String(format: "%.2g×", rate)) { player.setRate(rate) }
                        }
                    } label: {
                        Label(String(format: "%.2g×", player.rate), systemImage: "speedometer")
                    }
                    Spacer()
                    Button { addBookmark() } label: { Image(systemName: "bookmark") }
                    Button { showBookmarks = true } label: { Image(systemName: "bookmark.circle") }
                    if player.canPictureInPicture {
                        Button { player.startPictureInPicture() } label: {
                            Image(systemName: "pip.enter")
                        }
                    }
                    Button { showPlaylist = true } label: { Image(systemName: "list.bullet") }
                }
                .font(.subheadline)
            }
            .padding()
            .background(LinearGradient(colors: [.clear, .black.opacity(0.6)], startPoint: .top, endPoint: .bottom))
        }
        .foregroundStyle(.white)
    }

    private func addBookmark() {
        guard let url = library.current?.url else { return }
        bookmarks.add(url, position: player.currentTime)
    }

    private func timeString(_ seconds: Double) -> String {
        let total = Int(max(0, seconds))
        let h = total / 3600
        let m = (total % 3600) / 60
        let s = total % 60
        return h > 0 ? String(format: "%d:%02d:%02d", h, m, s) : String(format: "%d:%02d", m, s)
    }
}
