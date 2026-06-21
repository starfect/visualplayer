import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var settings: SettingsStore
    @Environment(\.dismiss) private var dismiss

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
        }
    }

    private var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
    }
}
