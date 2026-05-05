import XCTest
@testable import MarkdownEditor

final class MarkdownParityFixturesTests: XCTestCase {
    func testFixtureGroupsArePopulatedWithUniqueNames() throws {
        let fixtures = try loadFixtures()

        for group in fixtures.groups {
            XCTAssertFalse(group.cases.isEmpty, "\(group.name) should not be empty")
            XCTAssertEqual(Set(group.cases).count, group.cases.count, "\(group.name) names should be unique")
        }
    }

    func testCompactMarkdownFixtures() throws {
        let fixtures = try loadFixtures()

        for fixture in fixtures.compactMarkdown {
            XCTAssertEqual(MarkdownCompactor.compact(fixture.input), fixture.output, fixture.name)
        }
    }

    func testWikilinkPreprocessFixtures() throws {
        let fixtures = try loadFixtures()

        for fixture in fixtures.wikilinkPreprocess {
            XCTAssertEqual(Wikilinks.preprocess(fixture.input), fixture.output, fixture.name)
        }
    }

    func testFrontmatterSplitFixtures() throws {
        let fixtures = try loadFixtures()

        for fixture in fixtures.frontmatterSplits {
            let split = Frontmatter.split(fixture.input)
            XCTAssertEqual(split.frontmatter, fixture.frontmatter, fixture.name)
            XCTAssertEqual(split.body, fixture.body, fixture.name)
        }
    }

    func testOutgoingLinkFixtures() throws {
        let fixtures = try loadFixtures()

        for fixture in fixtures.outgoingLinks {
            XCTAssertEqual(Wikilinks.extractOutgoingLinks(from: fixture.input), fixture.output, fixture.name)
        }
    }

    func testSnippetFixtures() throws {
        let fixtures = try loadFixtures()

        for fixture in fixtures.snippets {
            XCTAssertEqual(Wikilinks.extractSnippet(from: fixture.input), fixture.output, fixture.name)
        }
    }

    func testWordCountFixtures() throws {
        let fixtures = try loadFixtures()

        for fixture in fixtures.wordCounts {
            XCTAssertEqual(Wikilinks.countWords(in: fixture.input), fixture.output, fixture.name)
        }
    }

    func testMathPreprocessFixtures() throws {
        let fixtures = try loadFixtures()

        for fixture in fixtures.mathPreprocess {
            XCTAssertEqual(MathMarkdown.preprocess(fixture.input), fixture.output, fixture.name)
        }
    }

    private func loadFixtures() throws -> MarkdownParityFixtures {
        let testFile = URL(fileURLWithPath: #filePath)
        let packageRoot = testFile
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
        let fixtureURL = packageRoot.appendingPathComponent("Fixtures/markdown-parity.json")
        let data = try Data(contentsOf: fixtureURL)
        return try JSONDecoder().decode(MarkdownParityFixtures.self, from: data)
    }
}

private struct MarkdownParityFixtures: Decodable {
    let compactMarkdown: [StringFixture]
    let wikilinkPreprocess: [StringFixture]
    let frontmatterSplits: [FrontmatterFixture]
    let outgoingLinks: [StringArrayFixture]
    let snippets: [StringFixture]
    let wordCounts: [NumberFixture]
    let mathPreprocess: [StringFixture]

    var groups: [(name: String, cases: [String])] {
        [
            ("compactMarkdown", compactMarkdown.map(\.name)),
            ("wikilinkPreprocess", wikilinkPreprocess.map(\.name)),
            ("frontmatterSplits", frontmatterSplits.map(\.name)),
            ("outgoingLinks", outgoingLinks.map(\.name)),
            ("snippets", snippets.map(\.name)),
            ("wordCounts", wordCounts.map(\.name)),
            ("mathPreprocess", mathPreprocess.map(\.name))
        ]
    }
}

private struct StringFixture: Decodable {
    let name: String
    let input: String
    let output: String
}

private struct FrontmatterFixture: Decodable {
    let name: String
    let input: String
    let frontmatter: String
    let body: String
}

private struct StringArrayFixture: Decodable {
    let name: String
    let input: String
    let output: [String]
}

private struct NumberFixture: Decodable {
    let name: String
    let input: String
    let output: Int
}
