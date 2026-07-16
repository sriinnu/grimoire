import SwiftUI

struct MacWorkspaceSidebar: View {
    @ObservedObject var model: GrimoireWorkspaceModel

    var body: some View {
        List(selection: sidebarSelection) {
            Section("Library") {
                ForEach(WorkspaceDestination.allCases) { destination in
                    destinationRow(destination)
                }
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
        .navigationTitle("Grimoire")
        .searchable(text: $model.searchText, placement: .sidebar, prompt: "Search")
    }

    private var sidebarSelection: Binding<SidebarSelection?> {
        Binding(
            get: {
                if let folder = model.selectedFolder {
                    return .folder(folder)
                }
                return .destination(model.selectedDestination)
            },
            set: { selection in
                guard let selection else { return }
                switch selection {
                case let .destination(destination):
                    model.selectDestination(destination)
                case let .folder(folder):
                    model.selectFolder(folder)
                }
            }
        )
    }

    private func destinationRow(_ destination: WorkspaceDestination) -> some View {
        HStack {
            Label(destination.title, systemImage: destination.systemImage)
            Spacer(minLength: 0)
            let count = documentCount(for: destination)
            if count > 0 {
                Text("\(count)")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
            }
        }
        .tag(SidebarSelection.destination(destination))
    }

    private func folderRow(_ folder: String) -> some View {
        HStack {
            Label(folder, systemImage: "folder")
                .lineLimit(1)
            Spacer(minLength: 0)
            Text("\(model.documents.filter { $0.folderName == folder }.count)")
                .font(.caption.monospacedDigit())
                .foregroundStyle(.secondary)
        }
        .tag(SidebarSelection.folder(folder))
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

private enum SidebarSelection: Hashable {
    case destination(WorkspaceDestination)
    case folder(String)
}
