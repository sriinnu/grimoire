import MarkdownEditorUI
import SwiftUI

struct MacEditorWorkspace: View {
    @Environment(\.colorScheme) private var colorScheme
    @ObservedObject var model: GrimoireWorkspaceModel
    let editorSurface: MacEditorSurface

    var body: some View {
        if let document = model.activeDocument {
            editor(for: document)
                .safeAreaInset(edge: .bottom, spacing: 0) {
                    documentStatus(document)
                }
        } else {
            ContentUnavailableView(
                "No Note Selected",
                systemImage: "doc.text.magnifyingglass",
                description: Text("Choose a note from the workspace sidebar.")
            )
        }
    }

    @ViewBuilder
    private func editor(for document: WorkspaceDocument) -> some View {
        switch editorSurface {
        case .native:
            NativeMarkdownEditorView(
                markdown: model.markdownBinding(for: document.id),
                title: document.title,
                showsStats: true,
                style: NativeMarkdownEditorStyle(
                    background: MacNotebookTheme.editorPaper(for: colorScheme),
                    textFont: .system(.body, design: .serif)
                )
            )
        case .web:
            WebMarkdownEditorView(markdown: model.markdownBinding(for: document.id))
        }
    }

    private func documentStatus(_ document: WorkspaceDocument) -> some View {
        HStack(spacing: 14) {
            Label(document.path, systemImage: "folder")
                .lineLimit(1)

            Spacer(minLength: 0)

            if document.isLocalOnly {
                Label("Local only", systemImage: "lock.fill")
                    .foregroundStyle(.orange)
            } else {
                Label("Vault context", systemImage: "checkmark.shield")
                    .foregroundStyle(.secondary)
            }

            Text(model.manifestNeedsRebuild ? "Context changed" : "Context current")
                .foregroundStyle(model.manifestNeedsRebuild ? .orange : .secondary)
        }
        .font(.caption)
        .padding(.horizontal, 12)
        .padding(.vertical, 7)
        .background(.bar)
    }
}
