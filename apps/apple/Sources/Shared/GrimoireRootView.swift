import MarkdownEditorUI
import SwiftUI

struct GrimoireRootView: View {
    @StateObject private var model = GrimoireDocumentModel()
    @State private var editorSurface: EditorSurface = .native

    var body: some View {
        NavigationSplitView {
            VStack(spacing: 12) {
                Picker("Editor Surface", selection: $editorSurface) {
                    ForEach(EditorSurface.allCases) { surface in
                        Label(surface.title, systemImage: surface.systemImage)
                            .tag(surface)
                    }
                }
                .pickerStyle(.segmented)
                .padding([.horizontal, .top])

                List(selection: .constant("welcome")) {
                    Label("Welcome", systemImage: "doc.text")
                        .tag("welcome")
                }
            }
            .navigationTitle("Grimoire")
        } detail: {
            switch editorSurface {
            case .native:
                NativeMarkdownEditorView(
                    markdown: $model.markdown,
                    title: "Native Markdown Editor"
                )
            case .web:
                WebMarkdownEditorView(markdown: $model.markdown)
            }
        }
    }
}

#Preview {
    GrimoireRootView()
}

private enum EditorSurface: String, CaseIterable, Identifiable {
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
        case .web: "globe"
        }
    }
}
