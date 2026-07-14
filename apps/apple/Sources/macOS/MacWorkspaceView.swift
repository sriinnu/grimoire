import SwiftUI

struct MacWorkspaceView: View {
    @Environment(\.colorScheme) private var colorScheme
    @StateObject private var model = GrimoireWorkspaceModel()
    @State private var columnVisibility: NavigationSplitViewVisibility = .all
    @State private var inspectorPresented = true
    @State private var editorSurface: MacEditorSurface = .native

    var body: some View {
        NavigationSplitView(columnVisibility: $columnVisibility) {
            MacWorkspaceSidebar(model: model)
                .navigationSplitViewColumnWidth(min: 220, ideal: 260, max: 340)
        } detail: {
            MacEditorWorkspace(model: model, editorSurface: editorSurface)
                .navigationTitle(model.activeDocument?.title ?? "Grimoire")
        }
        .inspector(isPresented: $inspectorPresented) {
            MacContextInspector(model: model)
                .inspectorColumnWidth(min: 320, ideal: 370, max: 460)
        }
        .toolbar {
            ToolbarItem(placement: .principal) {
                Picker("Editor", selection: $editorSurface) {
                    ForEach(MacEditorSurface.allCases) { surface in
                        Label(surface.title, systemImage: surface.systemImage)
                            .tag(surface)
                    }
                }
                .pickerStyle(.segmented)
                .frame(width: 168)
                .help("Choose the native or WebKit editor surface")
            }

            ToolbarItemGroup(placement: .primaryAction) {
                Button {
                    model.rebuildManifest()
                } label: {
                    Label(
                        model.manifestNeedsRebuild ? "Rebuild Context" : "Context Current",
                        systemImage: model.manifestNeedsRebuild
                            ? "arrow.triangle.2.circlepath"
                            : "checkmark.circle"
                    )
                }
                .help(model.manifestNeedsRebuild ? "Rebuild the Context Manifest" : "Context Manifest is current")

                Button {
                    inspectorPresented.toggle()
                } label: {
                    Label("Context Inspector", systemImage: "sidebar.trailing")
                }
                .help(inspectorPresented ? "Hide Context Inspector" : "Show Context Inspector")
            }
        }
        .tint(MacNotebookTheme.accent)
        .background {
            MacNotebookTheme.windowBackdrop(for: colorScheme)
                .ignoresSafeArea()
        }
        .frame(minWidth: 1_020, minHeight: 680)
    }
}

enum MacEditorSurface: String, CaseIterable, Identifiable {
    case native
    case web

    var id: String { rawValue }

    var title: String {
        switch self {
        case .native: "Native"
        case .web: "Web"
        }
    }

    var systemImage: String {
        switch self {
        case .native: "text.cursor"
        case .web: "network"
        }
    }
}
