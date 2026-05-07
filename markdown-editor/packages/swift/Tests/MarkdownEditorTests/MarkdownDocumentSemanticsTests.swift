import XCTest
@testable import MarkdownEditor

final class MarkdownDocumentSemanticsTests: XCTestCase {
    func testExtractsFrontmatterFieldsAndBodyHeadings() {
        let result = MarkdownSemantics.parse("""
        ---
        title: Alpha
        tags:
          - grimoire
          - wiki
        ---
        # Alpha

        ## Plan

        ### Next
        """)

        XCTAssertEqual(result.frontmatterState, .valid)
        XCTAssertEqual(result.frontmatterFields, [
            MarkdownFrontmatterField(key: "title", value: "Alpha", line: 2),
            MarkdownFrontmatterField(key: "tags", value: "grimoire, wiki", line: 3)
        ])
        XCTAssertEqual(result.headings, [
            MarkdownHeading(level: 1, text: "Alpha", slug: "alpha", line: 7),
            MarkdownHeading(level: 2, text: "Plan", slug: "plan", line: 9),
            MarkdownHeading(level: 3, text: "Next", slug: "next", line: 11)
        ])
    }

    func testIgnoresFencedHeadingsAndDedupesSlugs() {
        let result = MarkdownDocument("""
        # Intro

        ```
        # Not Heading
        ```

        ## Intro
        ## Intro
        """).semantics

        XCTAssertEqual(result.headings, [
            MarkdownHeading(level: 1, text: "Intro", slug: "intro", line: 1),
            MarkdownHeading(level: 2, text: "Intro", slug: "intro-2", line: 7),
            MarkdownHeading(level: 2, text: "Intro", slug: "intro-3", line: 8)
        ])
    }
}
