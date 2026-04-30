import Foundation
import MarkdownEditor

@MainActor
final class GrimoireDocumentModel: ObservableObject {
    @Published var markdown: String = """
    ---
    title: Welcome
    type: Note
    ---
    # Welcome

    This is the native SwiftUI shell reading the same markdown semantics as Tauri.

    Link to [[Journal/Today]] and write math like $E=mc^2$.
    """

    var document: MarkdownDocument {
        MarkdownDocument(markdown)
    }

    var compactedMarkdown: String {
        document.compactedSource()
    }
}
