import Foundation

extension WorkspaceDocument {
    var dashboardTypeName: String {
        typeName == "Note" && collection != .notes ? collection.defaultTypeName : typeName
    }

    init(descriptor: VaultDocumentDescriptor) {
        let collection = WorkspaceCollection(rawValue: descriptor.collection) ?? .notes
        self.init(
            id: descriptor.path,
            title: descriptor.title,
            path: descriptor.path,
            systemImage: collection.systemImage,
            collection: collection,
            isLocalOnly: descriptor.isLocalOnly,
            typeName: descriptor.noteType ?? collection.defaultTypeName,
            modifiedAt: descriptor.modifiedAt,
            fileSize: descriptor.fileSize,
            markdown: ""
        )
    }
}

extension WorkspaceDocument {
    var folderName: String? {
        let components = path.split(separator: "/")
        guard components.count > 1 else { return nil }
        return String(components[0])
    }

    var wordCount: Int {
        markdown.split { $0.isWhitespace || $0.isNewline }.count
    }

    var linkCount: Int {
        max(0, markdown.components(separatedBy: "[[").count - 1)
    }

    var headingCount: Int {
        markdown.split(separator: "\n").filter { $0.hasPrefix("#") }.count
    }

    var notePreview: String {
        let meaningful = markdown
            .split(separator: "\n")
            .map(String.init)
            .filter { line in
                let trimmed = line.trimmingCharacters(in: .whitespaces)
                return !trimmed.isEmpty
                    && trimmed != "---"
                    && !trimmed.hasPrefix("#")
                    && !trimmed.contains(":")
            }
            .joined(separator: " ")
        return meaningful.isEmpty ? path : meaningful
    }
}

extension WorkspaceCollection {
    var defaultTypeName: String {
        switch self {
        case .today, .journal: "Journal"
        case .dreams: "Dream"
        case .projects: "Project"
        case .notes: "Note"
        }
    }

    var systemImage: String {
        switch self {
        case .today: "sun.max"
        case .notes: "doc.text"
        case .journal: "book.closed"
        case .dreams: "moon.stars"
        case .projects: "folder"
        }
    }
}
