import SwiftUI

struct MacWorkspaceSidebar: View {
    @ObservedObject var model: GrimoireWorkspaceModel

    var body: some View {
        List(selection: $model.selectedDocumentID) {
            ForEach(WorkspaceCollection.allCases) { collection in
                let documents = model.filteredDocuments.filter { $0.collection == collection }
                if !documents.isEmpty {
                    Section(collection.title) {
                        ForEach(documents) { document in
                            documentRow(document)
                        }
                    }
                }
            }

            Section("Workspace Intelligence") {
                LabeledContent {
                    Text("r\(model.manifestRevision)")
                        .foregroundStyle(.secondary)
                } label: {
                    Label("Context Manifest", systemImage: "list.bullet.rectangle")
                }

                LabeledContent {
                    Text("On")
                        .foregroundStyle(.green)
                } label: {
                    Label("Locality Firewall", systemImage: "lock.shield")
                }
            }
        }
        .listStyle(.sidebar)
        .searchable(text: $model.searchText, placement: .sidebar, prompt: "Search workspace")
        .navigationTitle("Grimoire")
        .safeAreaInset(edge: .top, spacing: 0) {
            workspaceHeader
        }
    }

    private func documentRow(_ document: WorkspaceDocument) -> some View {
        Label {
            VStack(alignment: .leading, spacing: 2) {
                Text(document.title)
                    .lineLimit(1)
                Text(document.path)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        } icon: {
            Image(systemName: document.systemImage)
                .foregroundStyle(
                    document.isLocalOnly
                        ? Color.orange
                        : MacNotebookTheme.collectionColor(document.collection)
                )
        }
        .tag(document.id)
        .help(document.isLocalOnly ? "Local-only note" : document.path)
    }

    private var workspaceHeader: some View {
        HStack(spacing: 10) {
            Image(systemName: "books.vertical.fill")
                .font(.title3)
                .symbolRenderingMode(.hierarchical)
                .foregroundStyle(MacNotebookTheme.accent)

            VStack(alignment: .leading, spacing: 1) {
                Text("Preview Notebook")
                    .font(.headline)
                Text("Local on this Mac")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 0)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background {
            ZStack {
                Rectangle().fill(.bar)
                LinearGradient(
                    colors: [
                        MacNotebookTheme.accent.opacity(0.13),
                        MacNotebookTheme.warmAccent.opacity(0.08),
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            }
        }
    }
}
