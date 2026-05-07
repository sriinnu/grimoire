import Foundation

public enum MarkdownFrontmatterState: String, Sendable {
    case valid
    case empty
    case none
    case invalid
}

public struct MarkdownHeading: Equatable, Sendable {
    /// Heading depth from 1 to 6.
    public let level: Int
    /// Plain heading text without leading hashes.
    public let text: String
    /// Stable slug derived from heading text and sibling collisions.
    public let slug: String
    /// One-based line number in the source document.
    public let line: Int
}

public struct MarkdownFrontmatterField: Equatable, Sendable {
    /// YAML key as written without surrounding quotes.
    public let key: String
    /// Raw scalar value or comma-joined inline/list value.
    public let value: String
    /// One-based line number in the source document.
    public let line: Int
}

public struct MarkdownDocumentSemantics: Equatable, Sendable {
    /// YAML frontmatter state for validation and repair prompts.
    public let frontmatterState: MarkdownFrontmatterState
    /// Raw frontmatter block including delimiters when present.
    public let frontmatter: String
    /// Markdown body after frontmatter is removed.
    public let body: String
    /// Shallow parsed frontmatter fields for property and diagnostics surfaces.
    public let frontmatterFields: [MarkdownFrontmatterField]
    /// ATX headings outside fenced code blocks.
    public let headings: [MarkdownHeading]
}

public enum MarkdownSemantics {
    /// Parses document structure shared by SwiftUI and web editor shells.
    public static func parse(_ markdown: String) -> MarkdownDocumentSemantics {
        let split = splitFrontmatter(markdown)
        return MarkdownDocumentSemantics(
            frontmatterState: detectFrontmatterState(split.frontmatter),
            frontmatter: split.frontmatter,
            body: split.body,
            frontmatterFields: parseFrontmatterFields(split.frontmatter),
            headings: extractHeadings(from: split.body, bodyStartLine: split.bodyStartLine)
        )
    }

    private static func splitFrontmatter(_ markdown: String) -> (
        frontmatter: String,
        body: String,
        bodyStartLine: Int
    ) {
        guard markdown.hasPrefix("---\n") || markdown.hasPrefix("---\r\n") else {
            return ("", markdown, 1)
        }

        let lines = markdown.split(omittingEmptySubsequences: false, whereSeparator: \.isNewline)
        var byteOffset = 0
        for index in 1..<lines.count {
            let rawLine = String(lines[index])
            byteOffset += String(lines[index - 1]).count + 1
            if rawLine.trimmingCharacters(in: .whitespaces) == "---" {
                let endOffset = byteOffset + rawLine.count + 1
                let boundary = markdown.index(markdown.startIndex, offsetBy: min(endOffset, markdown.count))
                return (String(markdown[..<boundary]), String(markdown[boundary...]), index + 2)
            }
        }

        return ("", markdown, 1)
    }

    private static func detectFrontmatterState(_ frontmatter: String) -> MarkdownFrontmatterState {
        guard !frontmatter.isEmpty else { return .none }
        let body = frontmatter
            .split(omittingEmptySubsequences: false, whereSeparator: \.isNewline)
            .dropFirst()
            .dropLast()
            .map(String.init)
            .joined(separator: "\n")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard !body.isEmpty else { return .empty }
        return body.split(separator: "\n").contains { parseKeyValueLine(String($0)) != nil } ? .valid : .invalid
    }

    private static func parseFrontmatterFields(_ frontmatter: String) -> [MarkdownFrontmatterField] {
        guard !frontmatter.isEmpty else { return [] }
        let lines = frontmatter.split(omittingEmptySubsequences: false, whereSeparator: \.isNewline).map(String.init)
        var fields: [MarkdownFrontmatterField] = []
        var activeKey: String?
        var activeLine = 0
        var activeItems: [String] = []

        for index in 1..<max(1, lines.count - 1) {
            if let item = parseListItem(lines[index]), activeKey != nil {
                activeItems.append(item)
                continue
            }

            flushListField(into: &fields, key: activeKey, line: activeLine, items: activeItems)
            activeItems = []

            guard let keyValue = parseKeyValueLine(lines[index]) else {
                activeKey = nil
                continue
            }

            activeKey = keyValue.key
            activeLine = index + 1
            if !["", "|", ">"].contains(keyValue.value) {
                fields.append(MarkdownFrontmatterField(
                    key: keyValue.key,
                    value: cleanYamlScalar(keyValue.value),
                    line: activeLine
                ))
                activeKey = nil
            }
        }

        flushListField(into: &fields, key: activeKey, line: activeLine, items: activeItems)
        return fields
    }

    private static func extractHeadings(from body: String, bodyStartLine: Int) -> [MarkdownHeading] {
        var headings: [MarkdownHeading] = []
        var slugCounts: [String: Int] = [:]
        var fence: String?

        for (index, line) in body.split(omittingEmptySubsequences: false, whereSeparator: \.isNewline).map(String.init).enumerated() {
            if let marker = MarkdownScanning.fenceDelimiter(in: line), fence == nil {
                fence = marker
                continue
            }
            if let marker = MarkdownScanning.fenceDelimiter(in: line), fence == marker {
                fence = nil
                continue
            }
            guard fence == nil, let heading = parseHeadingLine(line) else { continue }

            let baseSlug = slugifyHeading(heading.text)
            let count = slugCounts[baseSlug, default: 0]
            slugCounts[baseSlug] = count + 1
            headings.append(MarkdownHeading(
                level: heading.level,
                text: heading.text,
                slug: count == 0 ? baseSlug : "\(baseSlug)-\(count + 1)",
                line: bodyStartLine + index
            ))
        }

        return headings
    }

    private static func parseHeadingLine(_ line: String) -> (level: Int, text: String)? {
        let leadingSpaces = line.prefix(while: { $0 == " " }).count
        guard leadingSpaces <= 3 else { return nil }
        let trimmed = line.trimmingCharacters(in: .whitespaces)
        let hashes = trimmed.prefix(while: { $0 == "#" }).count
        guard (1...6).contains(hashes), trimmed.dropFirst(hashes).first == " " else { return nil }
        let text = trimmed
            .dropFirst(hashes)
            .trimmingCharacters(in: .whitespaces)
            .trimmingCharacters(in: CharacterSet(charactersIn: "# "))
        return text.isEmpty ? nil : (hashes, text)
    }

    private static func parseKeyValueLine(_ line: String) -> (key: String, value: String)? {
        guard let colon = line.firstIndex(of: ":") else { return nil }
        let key = line[..<colon].trimmingCharacters(in: CharacterSet(charactersIn: " \"'"))
        guard let first = key.first, first.isLetter || first == "_" else { return nil }
        guard key.allSatisfy({ $0.isLetter || $0.isNumber || $0 == "_" || $0 == "-" || $0 == " " }) else {
            return nil
        }
        let value = line[line.index(after: colon)...].trimmingCharacters(in: .whitespaces)
        return (key, value)
    }

    private static func parseListItem(_ line: String) -> String? {
        guard line.hasPrefix("  - ") else { return nil }
        return cleanYamlScalar(String(line.dropFirst(4)))
    }

    private static func flushListField(
        into fields: inout [MarkdownFrontmatterField],
        key: String?,
        line: Int,
        items: [String]
    ) {
        if let key, !items.isEmpty {
            fields.append(MarkdownFrontmatterField(key: key, value: items.joined(separator: ", "), line: line))
        }
    }

    private static func cleanYamlScalar(_ value: String) -> String {
        var clean = value.trimmingCharacters(in: .whitespaces)
        if clean.hasPrefix("[") && clean.hasSuffix("]") && !clean.hasPrefix("[[") {
            clean = String(clean.dropFirst().dropLast())
                .split(separator: ",")
                .map { cleanYamlScalar(String($0)) }
                .joined(separator: ", ")
        }
        return clean.trimmingCharacters(in: CharacterSet(charactersIn: " \"'"))
    }

    private static func slugifyHeading(_ text: String) -> String {
        let allowed = text.lowercased().map { character -> Character in
            character.isLetter || character.isNumber || character == " " || character == "-" ? character : " "
        }
        let slug = String(allowed)
            .split(whereSeparator: \.isWhitespace)
            .joined(separator: "-")
        return slug.isEmpty ? "section" : slug
    }
}
