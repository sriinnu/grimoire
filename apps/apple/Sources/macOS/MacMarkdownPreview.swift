import Foundation
import SwiftUI

struct MacMarkdownPreview: View {
    let markdown: String

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 16) {
                ForEach(Array(MacMarkdownBlocks.parse(markdown).enumerated()), id: \.offset) { _, block in
                    blockView(block)
                }
            }
            .frame(maxWidth: 760, alignment: .leading)
            .padding(.horizontal, 40)
            .padding(.vertical, 34)
        }
        .background(Color(nsColor: .textBackgroundColor))
    }

    @ViewBuilder
    private func blockView(_ block: MacMarkdownBlock) -> some View {
        switch block {
        case let .heading(level, text):
            inlineText(text)
                .font(headingFont(level))
                .padding(.top, level == 1 ? 6 : 10)

        case let .paragraph(text):
            inlineText(text)
                .font(.system(.body, design: .serif))
                .lineSpacing(5)

        case let .unordered(items):
            VStack(alignment: .leading, spacing: 7) {
                ForEach(items, id: \.self) { item in
                    HStack(alignment: .firstTextBaseline, spacing: 10) {
                        Text("•")
                            .foregroundStyle(.secondary)
                        inlineText(item)
                            .font(.system(.body, design: .serif))
                    }
                }
            }

        case let .ordered(items):
            VStack(alignment: .leading, spacing: 7) {
                ForEach(Array(items.enumerated()), id: \.offset) { index, item in
                    HStack(alignment: .firstTextBaseline, spacing: 10) {
                        Text("\(index + 1).")
                            .monospacedDigit()
                            .foregroundStyle(.secondary)
                            .frame(width: 24, alignment: .trailing)
                        inlineText(item)
                            .font(.system(.body, design: .serif))
                    }
                }
            }

        case let .quote(text):
            HStack(alignment: .top, spacing: 12) {
                Capsule()
                    .fill(Color.accentColor.opacity(0.7))
                    .frame(width: 3)
                inlineText(text)
                    .font(.system(.body, design: .serif))
                    .italic()
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, 4)

        case let .code(code):
            Text(code)
                .font(.system(.callout, design: .monospaced))
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .background(.quaternary, in: RoundedRectangle(cornerRadius: 10, style: .continuous))

        case .divider:
            Divider()
                .padding(.vertical, 6)
        }
    }

    private func inlineText(_ markdown: String) -> Text {
        if let attributed = try? AttributedString(markdown: markdown) {
            return Text(attributed)
        }
        return Text(markdown)
    }

    private func headingFont(_ level: Int) -> Font {
        switch level {
        case 1: .system(.largeTitle, design: .serif).weight(.semibold)
        case 2: .system(.title, design: .serif).weight(.semibold)
        case 3: .system(.title2, design: .serif).weight(.semibold)
        default: .system(.title3, design: .serif).weight(.semibold)
        }
    }
}

private enum MacMarkdownBlock {
    case heading(level: Int, text: String)
    case paragraph(String)
    case unordered([String])
    case ordered([String])
    case quote(String)
    case code(String)
    case divider
}

private enum MacMarkdownBlocks {
    static func parse(_ markdown: String) -> [MacMarkdownBlock] {
        let lines = markdown.components(separatedBy: .newlines)
        var blocks: [MacMarkdownBlock] = []
        var index = 0

        while index < lines.count {
            let line = lines[index]
            let trimmed = line.trimmingCharacters(in: .whitespaces)

            if trimmed.isEmpty {
                index += 1
                continue
            }

            if trimmed.hasPrefix("```") {
                index += 1
                var code: [String] = []
                while index < lines.count, !lines[index].trimmingCharacters(in: .whitespaces).hasPrefix("```") {
                    code.append(lines[index])
                    index += 1
                }
                if index < lines.count { index += 1 }
                blocks.append(.code(code.joined(separator: "\n")))
                continue
            }

            if trimmed == "---" || trimmed == "***" || trimmed == "___" {
                blocks.append(.divider)
                index += 1
                continue
            }

            if let heading = heading(trimmed) {
                blocks.append(.heading(level: heading.level, text: heading.text))
                index += 1
                continue
            }

            if trimmed.hasPrefix(">") {
                blocks.append(.quote(trimmed.dropFirst().trimmingCharacters(in: .whitespaces)))
                index += 1
                continue
            }

            if let item = unorderedItem(trimmed) {
                var items = [item]
                index += 1
                while index < lines.count, let next = unorderedItem(lines[index].trimmingCharacters(in: .whitespaces)) {
                    items.append(next)
                    index += 1
                }
                blocks.append(.unordered(items))
                continue
            }

            if let item = orderedItem(trimmed) {
                var items = [item]
                index += 1
                while index < lines.count, let next = orderedItem(lines[index].trimmingCharacters(in: .whitespaces)) {
                    items.append(next)
                    index += 1
                }
                blocks.append(.ordered(items))
                continue
            }

            var paragraph = [trimmed]
            index += 1
            while index < lines.count {
                let next = lines[index].trimmingCharacters(in: .whitespaces)
                if next.isEmpty || heading(next) != nil || next.hasPrefix(">") || unorderedItem(next) != nil || orderedItem(next) != nil || next.hasPrefix("```") {
                    break
                }
                paragraph.append(next)
                index += 1
            }
            blocks.append(.paragraph(paragraph.joined(separator: " ")))
        }

        return blocks.isEmpty ? [.paragraph("This page is empty.")] : blocks
    }

    private static func heading(_ line: String) -> (level: Int, text: String)? {
        let hashes = line.prefix { $0 == "#" }
        guard !hashes.isEmpty, hashes.count <= 6 else { return nil }
        let remainder = line.dropFirst(hashes.count)
        guard remainder.first == " " else { return nil }
        return (hashes.count, remainder.trimmingCharacters(in: .whitespaces))
    }

    private static func unorderedItem(_ line: String) -> String? {
        guard line.count > 2, (line.hasPrefix("- ") || line.hasPrefix("* ") || line.hasPrefix("+ ")) else { return nil }
        return String(line.dropFirst(2))
    }

    private static func orderedItem(_ line: String) -> String? {
        guard let dot = line.firstIndex(of: "."), dot > line.startIndex else { return nil }
        let number = line[..<dot]
        guard number.allSatisfy(\.isNumber) else { return nil }
        let afterDot = line.index(after: dot)
        guard afterDot < line.endIndex, line[afterDot] == " " else { return nil }
        return String(line[line.index(after: afterDot)...])
    }
}
