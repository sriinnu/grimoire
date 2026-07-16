import SwiftUI

struct MacPageList: View {
    @ObservedObject var model: GrimoireWorkspaceModel
    let onCreateNote: () -> Void
    @State private var scope: PageScope = .all
    @State private var sort: PageSort = .modified

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider()

            if visibleDocuments.isEmpty {
                emptyState
            } else {
                List(selection: $model.selectedDocumentID) {
                    ForEach(visibleDocuments) { document in
                        MacPageRow(document: document)
                            .tag(document.id)
                    }
                }
                .listStyle(.inset)
            }
        }
        .navigationTitle(pageTitle)
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text(pageTitle)
                    .font(.title2.weight(.semibold))
                Text("\(model.filteredDocuments.count) pages")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 0)

            Menu {
                Section("Show") {
                    Picker("Scope", selection: $scope) {
                        ForEach(PageScope.allCases) { scope in
                            Text(scope.title).tag(scope)
                        }
                    }
                }
                Section("Sort by") {
                    Picker("Sort pages", selection: $sort) {
                        ForEach(PageSort.allCases) { sort in
                            Text(sort.title).tag(sort)
                        }
                    }
                }
            } label: {
                Label("View options", systemImage: "line.3.horizontal.decrease.circle")
            }
            .menuStyle(.borderlessButton)

            Button(action: onCreateNote) {
                Image(systemName: "square.and.pencil")
            }
            .buttonStyle(.borderless)
            .disabled(model.activeVaultPath == nil)
            .help("New page")
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 11)
        .background(.bar)
    }

    private var emptyState: some View {
        ContentUnavailableView {
            Label(emptyTitle, systemImage: model.selectedDestination.systemImage)
        } description: {
            Text(emptyDescription)
        } actions: {
            if model.activeVaultPath != nil {
                Button("Create a page", action: onCreateNote)
                    .buttonStyle(.borderedProminent)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var visibleDocuments: [WorkspaceDocument] {
        let scoped = model.filteredDocuments.filter { document in
            switch scope {
            case .all: true
            case .recent: document.modifiedAt != nil || !document.markdown.isEmpty
            case .privatePages: document.isLocalOnly
            }
        }
        return switch sort {
        case .modified:
            scoped.sorted { ($0.modifiedAt ?? 0) > ($1.modifiedAt ?? 0) }
        case .title:
            scoped.sorted { $0.title.localizedStandardCompare($1.title) == .orderedAscending }
        case .folder:
            scoped.sorted { $0.path.localizedStandardCompare($1.path) == .orderedAscending }
        }
    }

    private var pageTitle: String {
        model.selectedFolder ?? model.selectedDestination.title
    }

    private var emptyTitle: String {
        model.searchText.isEmpty ? "No \(pageTitle) Yet" : "Nothing Matches"
    }

    private var emptyDescription: String {
        if !model.searchText.isEmpty {
            return "Try another search across the current library."
        }
        return switch model.selectedDestination {
        case .inbox: "Captured pages will wait here until you organize them."
        case .journal: "Create a dated page for what happened and what mattered."
        case .dreams: "Dream entries stay local unless you explicitly change their boundary."
        case .archive: "Archived pages remain searchable without crowding active work."
        default: "Open a vault or create the first portable Markdown page."
        }
    }
}

private struct MacPageRow: View {
    let document: WorkspaceDocument

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            VStack(alignment: .leading, spacing: 3) {
                Text(document.title)
                    .font(.body.weight(.medium))
                    .lineLimit(1)

                Text(document.notePreview)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer(minLength: 8)

            VStack(alignment: .trailing, spacing: 5) {
                Text(documentActivity)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                if document.isLocalOnly {
                    Image(systemName: "lock.fill")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .help("Private on this Mac")
                }
            }
        }
        .padding(.vertical, 6)
        .contentShape(Rectangle())
    }

    private var documentActivity: String {
        guard let modifiedAt = document.modifiedAt else {
            return document.fileSize > 0 ? ByteCountFormatter.string(fromByteCount: Int64(document.fileSize), countStyle: .file) : "Local Markdown"
        }
        return Date(timeIntervalSince1970: TimeInterval(modifiedAt)).formatted(.relative(presentation: .named))
    }
}

private enum PageScope: String, CaseIterable, Identifiable {
    case all, recent, privatePages
    var id: String { rawValue }
    var title: String {
        switch self {
        case .all: "All"
        case .recent: "Recent"
        case .privatePages: "Private"
        }
    }
}

private enum PageSort: String, CaseIterable, Identifiable {
    case modified, title, folder
    var id: String { rawValue }
    var title: String { rawValue.capitalized }
    var systemImage: String {
        switch self {
        case .modified: "clock"
        case .title: "textformat.abc"
        case .folder: "folder"
        }
    }
}
