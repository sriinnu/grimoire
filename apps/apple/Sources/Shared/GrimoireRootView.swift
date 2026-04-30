import MarkdownEditor
import SwiftUI

struct GrimoireRootView: View {
    @StateObject private var model = GrimoireDocumentModel()

    var body: some View {
        NavigationSplitView {
            List(selection: .constant("welcome")) {
                Label("Welcome", systemImage: "doc.text")
                    .tag("welcome")
            }
            .navigationTitle("Grimoire")
        } detail: {
            VStack(spacing: 0) {
                editorHeader
                TextEditor(text: $model.markdown)
                    .font(.system(.body, design: .serif))
                    .scrollContentBackground(.hidden)
                    .padding()
            }
            .background(Color.grimoireEditorBackground)
        }
    }

    private var editorHeader: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Native Markdown Editor")
                .font(.title2.weight(.semibold))

            HStack(spacing: 12) {
                Label("\(model.document.wordCount) words", systemImage: "text.word.spacing")
                Label("\(model.document.outgoingLinks.count) links", systemImage: "link")
            }
            .font(.caption)
            .foregroundStyle(.secondary)

            Text(model.document.snippet)
                .font(.callout)
                .foregroundStyle(.secondary)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.bar)
    }
}

#Preview {
    GrimoireRootView()
}

private extension Color {
    static var grimoireEditorBackground: Color {
        #if os(macOS)
        Color(nsColor: .textBackgroundColor)
        #else
        Color(uiColor: .systemBackground)
        #endif
    }
}
