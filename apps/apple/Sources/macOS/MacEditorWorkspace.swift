import MarkdownEditorUI
import SwiftUI

struct MacEditorWorkspace: View {
    @Environment(\.colorScheme) private var colorScheme
    @ObservedObject var model: GrimoireWorkspaceModel

    var body: some View {
        if let document = model.activeDocument {
            VStack(spacing: 0) {
                MacDocumentChrome(document: document)
                Divider()

                NativeMarkdownEditorView(
                    markdown: model.markdownBinding(for: document.id),
                    title: document.title,
                    showsHeader: false,
                    showsStats: false,
                    style: NativeMarkdownEditorStyle(
                        background: MacNotebookTheme.editorPaper(for: colorScheme),
                        textFont: .system(.body, design: .serif)
                    )
                )
                .overlay {
                    if model.isLoadingDocument {
                        ProgressView("Opening page…")
                            .padding(16)
                            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
                    }
                }

                Divider()
                MacAskComposer(document: document)
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
}

private struct MacDocumentChrome: View {
    let document: WorkspaceDocument

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Text(document.folderName ?? "Notebook")
                Image(systemName: "chevron.right")
                    .font(.caption2)
                Text(document.title)
                    .fontWeight(.semibold)
                Spacer(minLength: 0)
            }
            .font(.caption)
            .foregroundStyle(.secondary)

            Text(document.title)
                .font(.largeTitle.weight(.bold))
                .lineLimit(2)

            HStack(spacing: 8) {
                metadataChip(document.collection.title, image: document.systemImage)
                metadataChip(
                    document.isLocalOnly ? "Local only" : "Vault context",
                    image: document.isLocalOnly ? "lock.fill" : "checkmark.shield"
                )
                metadataChip("\(document.wordCount) words", image: "text.word.spacing")
                Spacer(minLength: 0)
                metadataChip("TOC \(document.headingCount)", image: "list.bullet.indent")
                metadataChip("Links \(document.linkCount)", image: "link")
            }
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 14)
        .background(.bar)
    }

    private func metadataChip(_ text: String, image: String) -> some View {
        Label(text, systemImage: image)
            .font(.caption)
            .foregroundStyle(.secondary)
            .padding(.horizontal, 9)
            .padding(.vertical, 5)
            .background(.regularMaterial, in: Capsule())
    }
}

private struct MacAskComposer: View {
    let document: WorkspaceDocument
    @State private var prompt = ""

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "sparkles")
                .foregroundStyle(MacNotebookTheme.accent)
            TextField("Ask Grimoire about \(document.title)…", text: $prompt)
                .textFieldStyle(.plain)
                .disabled(true)
                .help("Agent requests activate after the Chitragupta connection is wired")
            Label("Local context", systemImage: "lock.shield")
                .font(.caption)
                .foregroundStyle(.secondary)
            Button(action: {}) {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.title3)
            }
            .buttonStyle(.borderless)
            .disabled(true)
            .help("Agent requests will activate when Chitragupta is connected")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(.regularMaterial)
    }
}
