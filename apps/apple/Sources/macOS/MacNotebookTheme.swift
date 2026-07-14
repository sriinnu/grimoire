import SwiftUI

enum MacNotebookTheme {
    static let accent = Color(red: 0.34, green: 0.38, blue: 0.72)
    static let warmAccent = Color(red: 0.88, green: 0.53, blue: 0.24)
    static let tealAccent = Color(red: 0.24, green: 0.58, blue: 0.58)
    static let roseAccent = Color(red: 0.72, green: 0.38, blue: 0.48)
    static let brandGradient = LinearGradient(
        colors: [Color(red: 0.12, green: 0.20, blue: 0.19), accent],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static func editorPaper(for colorScheme: ColorScheme) -> Color {
        switch colorScheme {
        case .light:
            Color(red: 0.975, green: 0.962, blue: 0.925)
        case .dark:
            Color(red: 0.055, green: 0.058, blue: 0.082)
        @unknown default:
            Color(nsColor: .textBackgroundColor)
        }
    }

    static func windowBackdrop(for colorScheme: ColorScheme) -> LinearGradient {
        switch colorScheme {
        case .light:
            LinearGradient(
                colors: [
                    Color(red: 0.94, green: 0.93, blue: 0.97),
                    Color(red: 0.96, green: 0.93, blue: 0.86),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        case .dark:
            LinearGradient(
                colors: [
                    Color(red: 0.08, green: 0.075, blue: 0.13),
                    Color(red: 0.07, green: 0.085, blue: 0.12),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        @unknown default:
            LinearGradient(colors: [.clear], startPoint: .top, endPoint: .bottom)
        }
    }

    static func collectionColor(_ collection: WorkspaceCollection) -> Color {
        switch collection {
        case .today: warmAccent
        case .notes: accent
        case .journal: Color(red: 0.70, green: 0.38, blue: 0.48)
        case .dreams: Color(red: 0.47, green: 0.40, blue: 0.78)
        case .projects: Color(red: 0.28, green: 0.58, blue: 0.58)
        }
    }

    static func destinationColor(_ destination: WorkspaceDestination) -> Color {
        switch destination {
        case .notebook: accent
        case .inbox: warmAccent
        case .pages: tealAccent
        case .graph: Color(red: 0.42, green: 0.48, blue: 0.78)
        case .journal: roseAccent
        case .dreams: Color(red: 0.49, green: 0.40, blue: 0.80)
        case .archive: Color.secondary
        }
    }

    static func folderColor(_ folder: String) -> Color {
        let palette = [accent, warmAccent, tealAccent, roseAccent]
        let index = abs(folder.unicodeScalars.reduce(0) { $0 + Int($1.value) }) % palette.count
        return palette[index]
    }
}
