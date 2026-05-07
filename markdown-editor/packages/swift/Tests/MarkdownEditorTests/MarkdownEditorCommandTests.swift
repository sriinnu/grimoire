import XCTest
@testable import MarkdownEditorUI

final class MarkdownEditorCommandTests: XCTestCase {
    func testCatalogFiltersByAliasAndTitle() {
        XCTAssertEqual(MarkdownEditorCommandCatalog.filtered(query: "todo").first?.id, "task")
        XCTAssertEqual(MarkdownEditorCommandCatalog.filtered(query: "#").first?.id, "heading-one")
        XCTAssertEqual(MarkdownEditorCommandCatalog.filtered(query: "##").first?.id, "heading-two")
        XCTAssertEqual(MarkdownEditorCommandCatalog.filtered(query: "next day").first?.id, "grimoire_tomorrow")
        XCTAssertEqual(MarkdownEditorCommandCatalog.filtered(query: "wikilink").first?.id, "grimoire_wikilink")
        XCTAssertEqual(MarkdownEditorCommandCatalog.filtered(query: "internal link").first?.id, "grimoire_wikilink")
        XCTAssertEqual(MarkdownEditorCommandCatalog.filtered(query: "nested tag").first?.id, "grimoire_tag")
        XCTAssertEqual(MarkdownEditorCommandCatalog.filtered(query: "week cal").first?.id, "grimoire_week_calendar")
        XCTAssertEqual(MarkdownEditorCommandCatalog.filtered(query: "frontmatter field").first?.id, "grimoire_frontmatter_block")
        XCTAssertEqual(MarkdownEditorCommandCatalog.filtered(query: "weekly retro").first?.id, "grimoire_weekly_review")
        XCTAssertEqual(MarkdownEditorCommandCatalog.filtered(query: "obsidian").first?.id, "grimoire_map_of_content")
        XCTAssertEqual(MarkdownEditorCommandCatalog.filtered(query: "toc").first?.id, "grimoire_table_of_contents")
        XCTAssertEqual(MarkdownEditorCommandCatalog.filtered(query: "notion").first?.id, "grimoire_database_table")
        XCTAssertEqual(MarkdownEditorCommandCatalog.filtered(query: "karpathy").first?.id, "grimoire_llm_research_note")
        XCTAssertEqual(MarkdownEditorCommandCatalog.filtered(query: "handwriting").first?.id, "grimoire_handwritten_canvas")
        XCTAssertEqual(MarkdownEditorCommandCatalog.filtered(query: "excalidraw").first?.id, "grimoire_whiteboard_canvas")
        XCTAssertEqual(MarkdownEditorCommandCatalog.filtered(query: "pencil note").first?.id, "grimoire_sketch_note")
    }

    func testDateCommandsRenderDeterministically() {
        let command = MarkdownEditorCommandCatalog.filtered(query: "today").first
        let date = Date(timeIntervalSince1970: 1_777_500_000)
        XCTAssertEqual(command?.renderedMarkdown(now: date), "2026-04-30")
    }

    func testPortableCommandIdsMirrorReactSlashKeys() {
        let allIds = MarkdownEditorCommandCatalog.all.map(\.id)
        let ids = Set(allIds)
        XCTAssertEqual(ids.count, allIds.count)
        let requiredIds = [
            "grimoire_today",
            "grimoire_time_now",
            "grimoire_inline_math",
            "grimoire_display_math",
            "grimoire_mermaid",
            "grimoire_handwritten_canvas",
            "grimoire_whiteboard_canvas",
            "grimoire_sketch_note",
            "grimoire_footnote",
            "grimoire_source_block",
            "grimoire_week_calendar",
            "grimoire_month_calendar",
            "grimoire_table_of_contents",
            "grimoire_create_wikilinks",
            "grimoire_related_context"
        ]

        for id in requiredIds {
            XCTAssertTrue(ids.contains(id), "\(id) should exist in the Swift command catalog")
        }
    }

    func testCalendarCommandsRenderWeekAndMonthTables() {
        let date = Date(timeIntervalSince1970: 1_777_500_000)

        let week = MarkdownEditorCommandCatalog.filtered(query: "week cal").first?.renderedMarkdown(now: date)
        XCTAssertTrue(week?.contains("## Week Calendar - 2026-04-27 to 2026-05-03") == true)
        XCTAssertTrue(week?.contains("| Thu | 2026-04-30 |") == true)

        let month = MarkdownEditorCommandCatalog.filtered(query: "month cal").first?.renderedMarkdown(now: date)
        XCTAssertTrue(month?.contains("## Calendar - April 2026") == true)
        XCTAssertTrue(month?.contains("| 27 | 28 | 29 | 30 |  |  |  |") == true)
    }

    func testKnowledgeCommandsRenderPortableGraphMarkdown() {
        let date = Date(timeIntervalSince1970: 1_777_500_000)

        let moc = MarkdownEditorCommandCatalog.filtered(query: "obsidian").first?.renderedMarkdown(now: date)
        XCTAssertTrue(moc?.contains("## Map of Content - 2026-04-30") == true)
        XCTAssertTrue(moc?.contains("[[Source Note]] -> [[Target Note]]") == true)

        let linkMap = MarkdownEditorCommandCatalog.filtered(query: "nodes").first?.renderedMarkdown(now: date)
        XCTAssertTrue(linkMap?.contains("| From | Relation | To | Why |") == true)

        let toc = MarkdownEditorCommandCatalog.filtered(query: "toc").first?.renderedMarkdown(now: date)
        XCTAssertTrue(toc?.contains("## Table of Contents") == true)

        let llm = MarkdownEditorCommandCatalog.filtered(query: "karpathy").first?.renderedMarkdown(now: date)
        XCTAssertTrue(llm?.contains("## LLM Research Note - 2026-04-30") == true)
        XCTAssertTrue(llm?.contains("[[Transformers]]") == true)
    }

    func testJournalCommandsRenderDatesAndReviewSections() {
        let date = Date(timeIntervalSince1970: 1_777_500_000)

        let frontmatter = MarkdownEditorCommandCatalog.filtered(query: "frontmatter field").first?.renderedMarkdown(now: date)
        XCTAssertTrue(frontmatter?.contains("date: 2026-04-30") == true)

        let weekly = MarkdownEditorCommandCatalog.filtered(query: "weekly retro").first?.renderedMarkdown(now: date)
        XCTAssertTrue(weekly?.contains("## Weekly Review - 2026-04-27 to 2026-05-03") == true)

        let monthly = MarkdownEditorCommandCatalog.filtered(query: "monthly retro").first?.renderedMarkdown(now: date)
        XCTAssertTrue(monthly?.contains("## Monthly Review - April 2026") == true)

        let rollover = MarkdownEditorCommandCatalog.filtered(query: "carry forward").first?.renderedMarkdown(now: date)
        XCTAssertTrue(rollover?.contains("## Task Rollover - 2026-04-30") == true)
    }

    func testCanvasCommandsRenderDurableMarkdownAttachments() {
        let date = Date(timeIntervalSince1970: 1_777_500_000)

        let handwriting = MarkdownEditorCommandCatalog.filtered(query: "handwriting").first?.renderedMarkdown(now: date)
        XCTAssertTrue(handwriting?.contains("```grimoire-canvas") == true)
        XCTAssertTrue(handwriting?.contains("type: handwriting") == true)
        XCTAssertTrue(handwriting?.contains("attachments/handwriting-2026-04-30-000000.grimoire-canvas.json") == true)
        XCTAssertTrue(handwriting?.contains("preview: attachments/handwriting-2026-04-30-000000.png") == true)

        let whiteboard = MarkdownEditorCommandCatalog.filtered(query: "excalidraw").first?.renderedMarkdown(now: date)
        XCTAssertTrue(whiteboard?.contains("type: whiteboard") == true)
        XCTAssertTrue(whiteboard?.contains("attachments/whiteboard-2026-04-30-000000.png") == true)

        let sketch = MarkdownEditorCommandCatalog.filtered(query: "pencil note").first?.renderedMarkdown(now: date)
        XCTAssertTrue(sketch?.contains("## Sketch Note - 2026-04-30") == true)
        XCTAssertTrue(sketch?.contains("Prompt\n- \n\n## Handwritten Canvas - 2026-04-30") == true)
        XCTAssertTrue(sketch?.contains("```grimoire-canvas\ntype: handwriting") == true)
        XCTAssertTrue(sketch?.contains("source: attachments/handwriting-2026-04-30-000000.grimoire-canvas.json") == true)
        XCTAssertTrue(sketch?.contains("Notes\n- ") == true)
    }

    func testMathCommandsRenderDurableLatexMarkdown() {
        let inline = MarkdownEditorCommandCatalog.filtered(query: "inline math").first?.renderedMarkdown()
        XCTAssertEqual(inline, "$E=mc^2$")

        let display = MarkdownEditorCommandCatalog.filtered(query: "display math").first?.renderedMarkdown()
        XCTAssertEqual(display, "$$\nE=mc^2\n$$")
    }
}
