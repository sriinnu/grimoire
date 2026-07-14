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
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(pageTitle)
                        .font(.title2.weight(.bold))
                    Text(pageSubtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer(minLength: 0)

                Button(action: onCreateNote) {
                    Label("New", systemImage: "plus")
                }
                .buttonStyle(.borderedProminent)
                .disabled(model.activeVaultPath == nil)
            }

            HStack(spacing: 8) {
                Picker("Scope", selection: $scope) {
                    ForEach(PageScope.allCases) { scope in
                        Text(scope.title).tag(scope)
                    }
                }
                .pickerStyle(.segmented)
                .labelsHidden()

                Menu {
                    Picker("Sort pages", selection: $sort) {
                        ForEach(PageSort.allCases) { sort in
                            Label(sort.title, systemImage: sort.systemImage).tag(sort)
                        }
                    }
                } label: {
                    Label("Sort", systemImage: "arrow.up.arrow.down")
                }
                .menuStyle(.borderlessButton)
                .fixedSize()
            }
        }
        .padding(14)
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

    private var pageSubtitle: String {
        let count = model.filteredDocuments.count
        return switch model.selectedDestination {
        case .notebook: "The living record of this vault · \(count) pages"
        case .inbox: "Unsorted thoughts waiting for a home · \(count) pages"
        case .pages: "Every page in the current vault · \(count) pages"
        case .graph: "Knowledge nodes available to the local graph · \(count) pages"
        case .journal: "Daily pages and private reflection · \(count) entries"
        case .dreams: "Private by default · \(count) entries"
        case .archive: "Finished, kept, and out of the way · \(count) pages"
        }
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
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline, spacing: 7) {
                Image(systemName: document.systemImage)
                    .foregroundStyle(
                        document.isLocalOnly
                            ? MacNotebookTheme.warmAccent
                            : MacNotebookTheme.collectionColor(document.collection)
                    )
                Text(document.title)
                    .font(.headline)
                    .lineLimit(1)
                Spacer(minLength: 0)
                if document.isLocalOnly {
                    Image(systemName: "lock.fill")
                        .font(.caption2)
                        .foregroundStyle(MacNotebookTheme.warmAccent)
                        .help("Local only")
                }
            }

            Text(document.notePreview)
                .font(.callout)
                .foregroundStyle(.secondary)
                .lineLimit(2)

            HStack(spacing: 8) {
                if let folder = document.folderName {
                    Label(folder, systemImage: "folder")
                }
                Spacer(minLength: 0)
                Text(documentActivity)
            }
            .font(.caption2)
            .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 8)
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
