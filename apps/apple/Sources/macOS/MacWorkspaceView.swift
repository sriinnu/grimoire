import AppKit
import SwiftUI

struct MacWorkspaceView: View {
    @Environment(\.colorScheme) private var colorScheme
    @StateObject private var model: GrimoireWorkspaceModel
    @State private var columnVisibility: NavigationSplitViewVisibility = .all
    @State private var inspectorPresented = true
    @State private var newNotePresented = false

    init() {
        _model = StateObject(
            wrappedValue: GrimoireWorkspaceModel(vaultService: MacVaultService())
        )
    }

    var body: some View {
        NavigationSplitView(columnVisibility: $columnVisibility) {
            MacWorkspaceSidebar(model: model)
                .navigationSplitViewColumnWidth(min: 190, ideal: 220, max: 280)
        } content: {
            MacPageList(model: model) {
                newNotePresented = true
            }
            .navigationSplitViewColumnWidth(min: 280, ideal: 330, max: 430)
        } detail: {
            MacEditorWorkspace(model: model)
                .navigationTitle(model.activeDocument?.title ?? "Grimoire")
        }
        .inspector(isPresented: $inspectorPresented) {
            MacContextInspector(model: model)
                .inspectorColumnWidth(min: 320, ideal: 370, max: 460)
        }
        .toolbar {
            ToolbarItem(placement: .principal) {
                HStack(spacing: 7) {
                    Image(
                        systemName: model.vaultActivity == "Save failed"
                            ? "exclamationmark.triangle.fill"
                            : "checkmark.circle"
                    )
                    Text(model.vaultActivity)
                }
                .font(.caption)
                .foregroundStyle(model.vaultActivity == "Save failed" ? .red : .secondary)
            }

            ToolbarItemGroup(placement: .primaryAction) {
                Button(action: chooseVault) {
                    Label("Open Vault", systemImage: "folder")
                }
                .help("Open a local Markdown vault")

                Button {
                    newNotePresented = true
                } label: {
                    Label("New Page", systemImage: "square.and.pencil")
                }
                .disabled(model.activeVaultPath == nil)
                .help("Create a portable Markdown page")

                Button {
                    inspectorPresented.toggle()
                } label: {
                    Label("Second Brain", systemImage: "sidebar.trailing")
                }
                .help(inspectorPresented ? "Hide Second Brain" : "Show Second Brain")
            }
        }
        .tint(MacNotebookTheme.accent)
        .background {
            MacNotebookTheme.windowBackdrop(for: colorScheme)
                .ignoresSafeArea()
        }
        .frame(minWidth: 1_180, minHeight: 720)
        .task {
            guard let path = UserDefaults.standard.string(forKey: "activeVaultPath") else { return }
            _ = await model.openVault(path: path)
        }
        .sheet(isPresented: $newNotePresented) {
            MacNewNoteSheet(model: model)
        }
        .alert(
            "Vault Error",
            isPresented: Binding(
                get: { model.vaultError != nil },
                set: { if !$0 { model.clearVaultError() } }
            )
        ) {
            Button("OK") { model.clearVaultError() }
        } message: {
            Text(model.vaultError ?? "The vault operation failed.")
        }
    }

    private func chooseVault() {
        let panel = NSOpenPanel()
        panel.title = "Open Grimoire Vault"
        panel.prompt = "Open Vault"
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        panel.allowsMultipleSelection = false
        guard panel.runModal() == .OK, let url = panel.url else { return }
        Task {
            if await model.openVault(path: url.path) {
                UserDefaults.standard.set(url.path, forKey: "activeVaultPath")
            }
        }
    }
}
