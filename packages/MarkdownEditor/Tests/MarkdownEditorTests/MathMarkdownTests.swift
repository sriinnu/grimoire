import XCTest
@testable import MarkdownEditor

final class MathMarkdownTests: XCTestCase {
    func testPreprocessesInlineMath() {
        XCTAssertEqual(
            MathMarkdown.preprocess("Energy is $E=mc^2$."),
            "Energy is @@GRIMOIRE_MATH_INLINE:E%3Dmc%5E2@@."
        )
    }

    func testIgnoresEscapedInlineMathAndCodeSpans() {
        XCTAssertEqual(MathMarkdown.preprocess(#"Cost is \$5 and code `$x$`."#), #"Cost is \$5 and code `$x$`."#)
    }

    func testPreprocessesSingleLineDisplayMath() {
        XCTAssertEqual(
            MathMarkdown.preprocess("Before\n$$x + y$$\nAfter"),
            "Before\n@@GRIMOIRE_MATH_BLOCK:x%20%2B%20y@@\nAfter"
        )
    }

    func testPreprocessesMultilineDisplayMath() {
        XCTAssertEqual(
            MathMarkdown.preprocess("$$\nx + y\n= z\n$$"),
            "@@GRIMOIRE_MATH_BLOCK:x%20%2B%20y%0A%3D%20z@@"
        )
    }

    func testIgnoresMathInsideFences() {
        let input = "```\n$x$\n```\n$x$"
        XCTAssertEqual(
            MathMarkdown.preprocess(input),
            "```\n$x$\n```\n@@GRIMOIRE_MATH_INLINE:x@@"
        )
    }

    func testDocumentConvenienceSurface() {
        let document = MarkdownDocument("# Title\n\nSee [[B]].")
        XCTAssertEqual(document.outgoingLinks, ["B"])
        XCTAssertEqual(document.wordCount, 2)
        XCTAssertEqual(document.snippet, "See B.")
    }
}
