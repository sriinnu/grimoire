import MarkdownEditor
import SwiftUI

public struct NativeMarkdownEditorView: View {
    @Binding private var markdown: String
    private let title: String
    private let showsStats: Bool

    public init(
        markdown: Binding<String>,
        title: String = "Markdown",
        showsStats: Bool = true
    ) {
        self._markdown = markdown
        self.title = title
        self.showsStats = showsStats
    }

    public var body: some View {
        VStack(spacing: 0) {
            header
            ZStack(alignment: .topLeading) {
                TextEditor(text: $markdown)
                    .font(.system(.body, design: .serif))
                    .markdownInputBehavior()
                    .scrollContentBackgroundIfAvailable(.hidden)
                    .padding()

                if let query = activeSlashQuery {
                    commandMenu(query: query)
                        .padding(.top, 18)
                        .padding(.leading, 18)
                }
            }
        }
        .background(Color.markdownEditorBackground)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.title2.weight(.semibold))

            if showsStats {
                HStack(spacing: 12) {
                    Label("\(document.wordCount) words", systemImage: "text.word.spacing")
                    Label("\(document.outgoingLinks.count) links", systemImage: "link")
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }

            Text(document.snippet)
                .font(.callout)
                .foregroundStyle(.secondary)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.bar)
    }

    private var document: MarkdownDocument {
        MarkdownDocument(markdown)
    }

    private var activeSlashQuery: String? {
        guard let lastLine = markdown.components(separatedBy: .newlines).last else { return nil }
        let trimmed = lastLine.trimmingCharacters(in: .whitespaces)
        guard trimmed.hasPrefix("/") else { return nil }
        return String(trimmed.dropFirst())
    }

    private func commandMenu(query: String) -> some View {
        let commands = Array(MarkdownEditorCommandCatalog.filtered(query: query).prefix(8))
        return VStack(alignment: .leading, spacing: 4) {
            ForEach(commands) { command in
                Button {
                    apply(command)
                } label: {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(command.title).font(.callout.weight(.semibold))
                        Text(command.subtitle).font(.caption).foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                }
                .buttonStyle(.plain)
            }
        }
        .frame(width: 280)
        .padding(6)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .shadow(radius: 12, y: 4)
    }

    private func apply(_ command: MarkdownEditorCommand) {
        var lines = markdown.components(separatedBy: "\n")
        let replacement = command.renderedMarkdown()

        if let lastIndex = lines.indices.last,
           lines[lastIndex].trimmingCharacters(in: .whitespaces).hasPrefix("/") {
            lines[lastIndex] = replacement
            markdown = lines.joined(separator: "\n")
        } else {
            markdown += "\n\(replacement)"
        }

        if !markdown.hasSuffix("\n") {
            markdown += "\n"
        }
    }
}

private extension View {
    @ViewBuilder
    func markdownInputBehavior() -> some View {
        #if os(iOS)
        self
            .autocorrectionDisabled(true)
            .textInputAutocapitalization(.never)
        #else
        self.autocorrectionDisabled(true)
        #endif
    }

    @ViewBuilder
    func scrollContentBackgroundIfAvailable(_ visibility: Visibility) -> some View {
        if #available(macOS 13.0, iOS 16.0, *) {
            self.scrollContentBackground(visibility)
        } else {
            self
        }
    }
}

private extension Color {
    static var markdownEditorBackground: Color {
        #if os(macOS)
        Color(nsColor: .textBackgroundColor)
        #else
        Color(uiColor: .systemBackground)
        #endif
    }
}
