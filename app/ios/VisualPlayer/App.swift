import SwiftUI

@main
struct VisualPlayerApp: App {
    @StateObject private var settings = SettingsStore()
    @StateObject private var library = LibraryStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(settings)
                .environmentObject(library)
                .preferredColorScheme(settings.colorScheme)
                .onOpenURL { url in
                    library.open(url: url)
                }
        }
    }
}
