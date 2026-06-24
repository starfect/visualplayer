import Combine
import SwiftUI

@MainActor
final class SettingsStore: ObservableObject {
    enum AppTheme: String, CaseIterable, Identifiable {
        case system, light, dark
        var id: String { rawValue }
    }

    @Published var theme: AppTheme { didSet { defaults.set(theme.rawValue, forKey: Keys.theme) } }
    @Published var rememberPosition: Bool { didSet { defaults.set(rememberPosition, forKey: Keys.remember) } }
    @Published var autoloadSubtitles: Bool { didSet { defaults.set(autoloadSubtitles, forKey: Keys.autoload) } }
    @Published var gesturesEnabled: Bool { didSet { defaults.set(gesturesEnabled, forKey: Keys.gestures) } }

    private let defaults = UserDefaults.standard
    private enum Keys {
        static let theme = "theme"
        static let remember = "rememberPosition"
        static let autoload = "autoloadSubtitles"
        static let gestures = "gesturesEnabled"
    }

    init() {
        // Deep Cinema is dark-first: default to dark unless the user opts out.
        theme = AppTheme(rawValue: defaults.string(forKey: Keys.theme) ?? "") ?? .dark
        rememberPosition = defaults.object(forKey: Keys.remember) as? Bool ?? true
        autoloadSubtitles = defaults.object(forKey: Keys.autoload) as? Bool ?? true
        gesturesEnabled = defaults.object(forKey: Keys.gestures) as? Bool ?? true
    }

    var colorScheme: ColorScheme? {
        switch theme {
        case .light: return .light
        case .dark: return .dark
        case .system: return nil
        }
    }
}
