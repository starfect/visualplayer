import Foundation

enum SourceResolver {
    static func resolve(fileURL: URL) -> MediaItem? {
        guard let contents = try? String(contentsOf: fileURL, encoding: .utf8) else { return nil }
        guard let url = firstURL(in: contents) else { return nil }
        var item = MediaItem(url: url)
        item.displayTitle = title(in: contents) ?? fileURL.deletingPathExtension().lastPathComponent
        return item
    }

    static func firstURL(in text: String) -> URL? {
        for rawLine in text.split(whereSeparator: \.isNewline) {
            let line = rawLine.trimmingCharacters(in: .whitespaces)
            if line.isEmpty || line.hasPrefix("#") { continue }
            if let value = tomlValue(line, key: "url") ?? directURL(line) {
                if value.hasPrefix("http://") || value.hasPrefix("https://") {
                    return URL(string: value)
                }
            }
        }
        return nil
    }

    private static func directURL(_ line: String) -> String? {
        line.hasPrefix("http") ? line : nil
    }

    private static func title(in text: String) -> String? {
        for rawLine in text.split(whereSeparator: \.isNewline) {
            if let value = tomlValue(String(rawLine), key: "title") { return value }
        }
        return nil
    }

    private static func tomlValue(_ line: String, key: String) -> String? {
        guard let eq = line.range(of: "="), line.hasPrefix(key) else { return nil }
        let value = line[eq.upperBound...].trimmingCharacters(in: .whitespaces)
        return value.trimmingCharacters(in: CharacterSet(charactersIn: "\"'"))
    }
}
