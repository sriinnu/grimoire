public struct MarkdownDocument: Equatable, Sendable {
    /// The complete markdown document source.
    public var source: String

    /// Creates a markdown document wrapper around source text.
    public init(_ source: String) {
        self.source = source
    }

    /// The source split into frontmatter and body.
    public var split: FrontmatterSplit {
        Frontmatter.split(source)
    }

    /// The YAML frontmatter block, including delimiters when present.
    public var frontmatter: String {
        split.frontmatter
    }

    /// The markdown body after frontmatter is removed.
    public var body: String {
        split.body
    }

    /// Sorted, unique outgoing wikilink targets.
    public var outgoingLinks: [String] {
        Wikilinks.extractOutgoingLinks(from: source)
    }

    /// Shared document structure used by outline, frontmatter, and native shells.
    public var semantics: MarkdownDocumentSemantics {
        MarkdownSemantics.parse(source)
    }

    /// Word count for the document body.
    public var wordCount: Int {
        Wikilinks.countWords(in: source)
    }

    /// Plain-text preview extracted from the document body.
    public var snippet: String {
        Wikilinks.extractSnippet(from: source)
    }

    /// Returns frontmatter plus compacted body markdown.
    public func compactedSource() -> String {
        let split = split
        return split.frontmatter + MarkdownCompactor.compact(split.body)
    }

    /// Applies wikilink and math placeholder preprocessing for rich editor adapters.
    public func preprocessedForRichEditing() -> String {
        let split = split
        let preprocessedBody = MathMarkdown.preprocess(Wikilinks.preprocess(split.body))
        return split.frontmatter + preprocessedBody
    }
}
