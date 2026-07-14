import SwiftUI

struct MacWorkspaceSidebar: View {
    @ObservedObject var model: GrimoireWorkspaceModel

    var body: some View {
        List {
            Section {
                ForEach(WorkspaceDestination.allCases) { destination in
                    destinationRow(destination)
                }
            }

            Section("Places") {
                Button {
                    model.selectDestination(.pages)
                } label: {
                    Label {
                        VStack(alignment: .leading, spacing: 1) {
                            Text(model.vaultName)
                                .lineLimit(1)
                            Text(model.activeVaultPath == nil ? "Preview library" : "Local Markdown vault")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    } icon: {
                        Image(systemName: "internaldrive")
                            .foregroundStyle(MacNotebookTheme.tealAccent)
                    }
                }
                .buttonStyle(.plain)
            }

            if !model.folderNames.isEmpty {
                Section("Folders") {
                    ForEach(model.folderNames, id: \.self) { folder in
                        folderRow(folder)
                    }
                }
            }
        }
        .listStyle(.sidebar)
        .navigationTitle("Library")
        .safeAreaInset(edge: .top, spacing: 0) {
            brandHeader
        }
    }

    private func destinationRow(_ destination: WorkspaceDestination) -> some View {
        Button {
            model.selectDestination(destination)
        } label: {
            HStack(spacing: 10) {
                Image(systemName: destination.systemImage)
                    .symbolRenderingMode(.hierarchical)
                    .foregroundStyle(MacNotebookTheme.destinationColor(destination))
                    .frame(width: 19)

                Text(destination.title)

                Spacer(minLength: 0)

                let count = documentCount(for: destination)
                if count > 0 {
                    Text("\(count)")
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .listRowBackground(
            model.selectedFolder == nil && model.selectedDestination == destination
                ? MacNotebookTheme.accent.opacity(0.15)
                : Color.clear
        )
    }

    private func folderRow(_ folder: String) -> some View {
        Button {
            model.selectFolder(folder)
        } label: {
            HStack(spacing: 10) {
                Image(systemName: "folder")
                    .foregroundStyle(MacNotebookTheme.folderColor(folder))
                    .frame(width: 19)
                Text(folder)
                    .lineLimit(1)
                Spacer(minLength: 0)
                Text("\(model.documents.filter { $0.folderName == folder }.count)")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .listRowBackground(
            model.selectedFolder == folder ? MacNotebookTheme.accent.opacity(0.15) : Color.clear
        )
    }

    private var brandHeader: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                ZStack {
                    RoundedRectangle(cornerRadius: 9)
                        .fill(MacNotebookTheme.brandGradient)
                    Image(systemName: "book.pages.fill")
                        .font(.headline)
                        .foregroundStyle(.white)
                }
                .frame(width: 34, height: 34)

                VStack(alignment: .leading, spacing: 0) {
                    Text("Grimoire")
                        .font(.title3.weight(.bold))
                    Text("Living notebook")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            HStack(spacing: 7) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                TextField("Search your library", text: $model.searchText)
                    .textFieldStyle(.plain)
                Text("⌘F")
                    .font(.caption2.monospaced())
                    .foregroundStyle(.tertiary)
            }
            .padding(.horizontal, 9)
            .padding(.vertical, 7)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 9))
        }
        .padding(12)
        .background(.bar)
    }

    private func documentCount(for destination: WorkspaceDestination) -> Int {
        switch destination {
        case .notebook, .pages, .graph:
            model.documents.count
        case .inbox:
            model.documents.filter { $0.path.localizedCaseInsensitiveContains("Inbox/") }.count
        case .journal:
            model.documents.filter { $0.collection == .today || $0.collection == .journal }.count
        case .dreams:
            model.documents.filter { $0.collection == .dreams }.count
        case .archive:
            model.documents.filter { $0.path.localizedCaseInsensitiveContains("Archive/") }.count
        }
    }
}
