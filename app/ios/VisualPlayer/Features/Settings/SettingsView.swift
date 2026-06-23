import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var settings: SettingsStore
    @EnvironmentObject var bookmarks: BookmarkStore
    @Environment(\.dismiss) private var dismiss

    @State private var showExporter = false
    @State private var showImporter = false
    @State private var exportDocument = BackupDocument()

    var body: some View {
        NavigationStack {
            Form {
                Section("settings.title") {
                    Picker("settings.theme", selection: $settings.theme) {
                        Text("settings.theme_system").tag(SettingsStore.AppTheme.system)
                        Text("settings.theme_light").tag(SettingsStore.AppTheme.light)
                        Text("settings.theme_dark").tag(SettingsStore.AppTheme.dark)
                    }
                }
                Section("settings.playback") {
                    Toggle("settings.remember_position", isOn: $settings.rememberPosition)
                    Toggle("settings.autoload", isOn: $settings.autoloadSubtitles)
                }
                Section("settings.gestures") {
                    Toggle("settings.gestures_enabled", isOn: $settings.gesturesEnabled)
                }
                Section("settings.backup") {
                    Button {
                        exportDocument = BackupService.makeDocument(
                            settings: settings, bookmarks: bookmarks)
                        showExporter = true
                    } label: {
                        Label("backup.export", systemImage: "square.and.arrow.up")
                    }
                    Button {
                        showImporter = true
                    } label: {
                        Label("backup.import", systemImage: "square.and.arrow.down")
                    }
                }
                Section("settings.about") {
                    LabeledContent("settings.version", value: appVersion)
                }
            }
            .navigationTitle("settings.title")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("settings.close") { dismiss() }
                }
            }
            .fileExporter(
                isPresented: $showExporter,
                document: exportDocument,
                contentType: .json,
                defaultFilename: "visualplayer-backup"
            ) { _ in }
            .fileImporter(
                isPresented: $showImporter,
                allowedContentTypes: [.json]
            ) { result in
                if case let .success(url) = result {
                    BackupService.restore(from: url, settings: settings, bookmarks: bookmarks)
                }
            }
        }
    }

    private var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
    }
}
