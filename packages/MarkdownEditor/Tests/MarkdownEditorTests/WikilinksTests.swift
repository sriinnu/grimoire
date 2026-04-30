import XCTest
@testable import MarkdownEditor

final class WikilinksTests: XCTestCase {
    func testPreprocessesWikilinksToPlaceholders() {
        XCTAssertEqual(
            Wikilinks.preprocess("See [[My Note]] and [[path/note|Alias]]."),
            "See ‹WIKILINK:My Note› and ‹WIKILINK:path/note|Alias›."
        )
    }

    func testSplitsFrontmatter() {
        let split = Frontmatter.split("---\ntitle: Test\n---\n# Body")

        XCTAssertEqual(split.frontmatter, "---\ntitle: Test\n---\n")
        XCTAssertEqual(split.body, "# Body")
    }

    func testExtractsSortedUniqueOutgoingTargets() {
        XCTAssertEqual(
            Wikilinks.extractOutgoingLinks(from: "See [[B|Bee]], [[A]], [[B|Other]]."),
            ["A", "B"]
        )
    }

    func testExtractsBacklinkContextByFullTargetOrLeafName() {
        let content = """
        ---
        title: Child
        ---
        # Child

        This paragraph links to [[project/Alpha|Alpha]] and gives context.
        """

        XCTAssertEqual(
            Wikilinks.extractBacklinkContext(from: content, matching: ["Alpha"]),
            "This paragraph links to [[project/Alpha|Alpha]] and gives context."
        )
    }

    func testExtractsSnippetWithoutFrontmatterHeadingOrMarkdownSyntax() {
        let content = """
        ---
        title: Test
        ---
        # Test

        - **Ship** the [editor](https://example.com) with [[Notes|links]].
        """

        XCTAssertEqual(
            Wikilinks.extractSnippet(from: content),
            "Ship the editor with links."
        )
    }

    func testCountsWordsWithoutTitleOrWikilinks() {
        let content = "# Title\n\nHello **bold** [[Hidden Link]] world."
        XCTAssertEqual(Wikilinks.countWords(in: content), 3)
    }
}
