import SwiftUI
import UniformTypeIdentifiers

/// On-device snapshot of preferences and bookmarks. Nothing leaves the device:
/// export writes a JSON file the user saves through the system file UI, and
/// import reads one back. Mirrors the Android backup payload shape.
struct BackupData: Codable {
    var theme: String
    var rememberPosition: Bool
    var autoloadSubtitles: Bool
    var gesturesEnabled: Bool
    var bookmarks: [String: [Bookmark]]
}

/// A plain JSON document used with SwiftUI's `.fileExporter` / `.fileImporter`.
struct BackupDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.json] }

    var data: Data

    init(data: Data = Data()) { self.data = data }

    init(configuration: ReadConfiguration) throws {
        data = configuration.file.regularFileContents ?? Data()
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: data)
    }
}

enum BackupService {
    @MainActor
    static func makeDocument(settings: SettingsStore, bookmarks: BookmarkStore) -> BackupDocument {
        let payload = BackupData(
            theme: settings.theme.rawValue,
            rememberPosition: settings.rememberPosition,
            autoloadSubtitles: settings.autoloadSubtitles,
            gesturesEnabled: settings.gesturesEnabled,
            bookmarks: bookmarks.snapshot()
        )
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return BackupDocument(data: (try? encoder.encode(payload)) ?? Data())
    }

    @MainActor
    @discardableResult
    static func restore(from url: URL, settings: SettingsStore, bookmarks: BookmarkStore) -> Bool {
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        guard let data = try? Data(contentsOf: url),
            let payload = try? JSONDecoder().decode(BackupData.self, from: data)
        else { return false }
        if let theme = SettingsStore.AppTheme(rawValue: payload.theme) { settings.theme = theme }
        settings.rememberPosition = payload.rememberPosition
        settings.autoloadSubtitles = payload.autoloadSubtitles
        settings.gesturesEnabled = payload.gesturesEnabled
        bookmarks.restore(payload.bookmarks)
        return true
    }
}
