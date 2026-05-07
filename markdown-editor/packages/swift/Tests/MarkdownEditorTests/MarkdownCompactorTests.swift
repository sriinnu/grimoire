import XCTest
@testable import MarkdownEditor

final class MarkdownCompactorTests: XCTestCase {
    func testNormalizesBulletsAndTightensLists() {
        let input = "* Item one\n\n* Item two\n\n* Item three"
        XCTAssertEqual(
            MarkdownCompactor.compact(input),
            "- Item one\n- Item two\n- Item three\n"
        )
    }

    func testPreservesBlankLinesAroundParagraphs() {
        let input = "# Title\n\n\nSome intro.\n\n\nConclusion."
        XCTAssertEqual(
            MarkdownCompactor.compact(input),
            "# Title\n\nSome intro.\n\nConclusion.\n"
        )
    }

    func testLeavesCodeBlocksUntouched() {
        let input = "```\nline one\n\nline two\n\nline three\n```"
        XCTAssertEqual(
            MarkdownCompactor.compact(input),
            "```\nline one\n\nline two\n\nline three\n```\n"
        )
    }

    func testLeavesTildeCodeBlocksUntouched() {
        let input = "~~~\n* Keep entity &#x1F600;\n\n* raw\n~~~"
        XCTAssertEqual(
            MarkdownCompactor.compact(input),
            "~~~\n* Keep entity &#x1F600;\n\n* raw\n~~~\n"
        )
    }

    func testDecodesHexHtmlEntitiesOutsideCodeBlocks() {
        XCTAssertEqual(
            MarkdownCompactor.compact("Use &#x26; and &#x3C; symbols."),
            "Use & and < symbols.\n"
        )
    }

    func testMovesWhitespaceOutsideStrongMarkers() {
        XCTAssertEqual(MarkdownCompactor.compact("**Luca **"), "**Luca** \n")
        XCTAssertEqual(MarkdownCompactor.compact("** Luca**"), " **Luca**\n")
    }
}
