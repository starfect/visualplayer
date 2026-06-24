import SwiftUI

/// Shared brand palette, matching the desktop and Android apps (#0040FF).
extension Color {
    static let brand = Color(red: 0x00 / 255, green: 0x40 / 255, blue: 0xFF / 255)
    static let brandAccent = Color(red: 0x5A / 255, green: 0x7B / 255, blue: 0xFF / 255)

    /// The brand's soft diagonal accent gradient used for emphasis surfaces.
    static var brandGradient: LinearGradient {
        LinearGradient(
            colors: [.brand, .brandAccent],
            startPoint: .topLeading,
            endPoint: .bottomTrailing)
    }
}
