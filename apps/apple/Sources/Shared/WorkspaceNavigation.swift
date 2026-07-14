import Foundation

enum WorkspaceDestination: String, CaseIterable, Identifiable {
    case notebook
    case inbox
    case pages
    case graph
    case journal
    case dreams
    case archive

    var id: String { rawValue }

    var title: String {
        switch self {
        case .notebook: "Notebook"
        case .inbox: "Inbox"
        case .pages: "Pages"
        case .graph: "Graph"
        case .journal: "Journal"
        case .dreams: "Dreams"
        case .archive: "Archive"
        }
    }

    var systemImage: String {
        switch self {
        case .notebook: "books.vertical"
        case .inbox: "tray"
        case .pages: "doc.on.doc"
        case .graph: "point.3.connected.trianglepath.dotted"
        case .journal: "book.closed"
        case .dreams: "moon.stars"
        case .archive: "archivebox"
        }
    }
}
