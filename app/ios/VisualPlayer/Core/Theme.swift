import SwiftUI

/// Shared "Deep Cinema" brand palette — a luminous blue that glows on the
/// near-black canvas, matching the desktop and Android apps.
extension Color {
    static let brand = Color(red: 0x4D / 255, green: 0x7C / 255, blue: 0xFF / 255)
    static let brandAccent = Color(red: 0x7A / 255, green: 0xA0 / 255, blue: 0xFF / 255)

    /// Near-black cinema canvas.
    static let cinemaCanvas = Color(red: 0x06 / 255, green: 0x07 / 255, blue: 0x0A / 255)

    /// The brand's soft diagonal accent gradient used for emphasis surfaces.
    static var brandGradient: LinearGradient {
        LinearGradient(
            colors: [.brand, .brandAccent],
            startPoint: .topLeading,
            endPoint: .bottomTrailing)
    }
}
