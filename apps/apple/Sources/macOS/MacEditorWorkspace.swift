import MarkdownEditor
import MarkdownEditorUI
import SwiftUI

struct MacEditorWorkspace: View {
    @Environment(\.colorScheme) private var colorScheme
    @ObservedObject var model: GrimoireWorkspaceModel
    @State private var mode: EditorMode = .preview

    var body: some View {
        if let document = model.activeDocument {
            VStack(spacing: 0) {
                MacDocumentChrome(document: document, mode: $mode)
                Divider()

                Group {
                    switch mode {
                    case .preview:
                        MacMarkdownPreview(markdown: Frontmatter.split(document.markdown).body)
                    case .edit:
                        NativeMarkdownEditorView(
                            markdown: bodyBinding(for: document.id),
                            title: document.title,
                            showsHeader: false,
                            showsStats: false,
                            style: NativeMarkdownEditorStyle(
                                background: MacNotebookTheme.editorPaper(for: colorScheme),
                                textFont: .system(.body, design: .serif)
                            )
                        )
                    }
                }
                .overlay {
                    if model.isLoadingDocument {
                        ProgressView("Opening page…")
                            .padding(16)
                            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
                    }
                }

                Divider()
                documentStatus(document)
            }
        } else {
            ContentUnavailableView(
                "Choose a Page",
                systemImage: "book.pages",
                description: Text("Select a page from the middle column to begin reading or writing.")
            )
        }
    }

    private func documentStatus(_ document: WorkspaceDocument) -> some View {
        HStack(spacing: 14) {
            Label(document.path, systemImage: "folder")
                .lineLimit(1)

            Spacer(minLength: 0)

            if document.isLocalOnly {
                Label("Private on this Mac", systemImage: "lock.fill")
                    .foregroundStyle(MacNotebookTheme.warmAccent)
            } else {
                Label("Vault source", systemImage: "checkmark.shield")
                    .foregroundStyle(.secondary)
            }

            Text(model.activeVaultPath == nil ? "Preview" : model.vaultActivity)
                .foregroundStyle(model.vaultActivity == "Save failed" ? .red : .secondary)
        }
        .font(.caption)
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(.bar)
    }

    private func bodyBinding(for documentID: WorkspaceDocument.ID) -> Binding<String> {
        Binding(
            get: {
                Frontmatter.split(model.markdownBinding(for: documentID).wrappedValue).body
            },
            set: { body in
                let source = model.markdownBinding(for: documentID)
                source.wrappedValue = Frontmatter.split(source.wrappedValue).frontmatter + body
            }
        )
    }
}

private enum EditorMode: String, CaseIterable, Identifiable {
    case preview
    case edit

    var id: String { rawValue }
    var title: String { rawValue.capitalized }
}

private struct MacDocumentChrome: View {
    let document: WorkspaceDocument
    @Binding var mode: EditorMode

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(document.title)
                    .font(.title2.weight(.semibold))
                    .lineLimit(1)
                Spacer(minLength: 0)

                Picker("Mode", selection: $mode) {
                    ForEach(EditorMode.allCases) { mode in
                        Text(mode.title).tag(mode)
                    }
                }
                .labelsHidden()
                .pickerStyle(.segmented)
                .frame(width: 148)

                Group {
                    if document.isLocalOnly {
                        Label("Private", systemImage: "lock.fill")
                    } else {
                        Label("Local", systemImage: "checkmark.shield")
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }

            Text([document.folderName, document.collection.title, "\(document.wordCount) words"]
                .compactMap { $0 }
                .joined(separator: " · "))
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(.bar)
    }
}
