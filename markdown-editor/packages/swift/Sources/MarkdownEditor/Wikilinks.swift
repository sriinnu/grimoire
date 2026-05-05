import Foundation

public struct FrontmatterSplit: Equatable, Sendable {
    /// The YAML frontmatter block, including delimiters and trailing newline when present.
    public let frontmatter: String

    /// The markdown body after frontmatter is removed.
    public let body: String

    /// Creates a split frontmatter/body value.
    public init(frontmatter: String, body: String) {
        self.frontmatter = frontmatter
        self.body = body
    }
}

public enum Frontmatter {
    /// Splits a markdown document into YAML frontmatter and body without parsing YAML.
    public static func split(_ content: String) -> FrontmatterSplit {
        let pattern = #"(?s)\A---[ \t]*\r?\n.*?\r?\n---[ \t]*(?:\r?\n|\z)"#
        guard
            let regex = try? NSRegularExpression(pattern: pattern),
            let match = regex.firstMatch(
                in: content,
                range: NSRange(content.startIndex..<content.endIndex, in: content)
            ),
            match.range.location == 0,
            let frontmatterRange = Range(match.range, in: content)
        else {
            return FrontmatterSplit(frontmatter: "", body: content)
        }

        return FrontmatterSplit(
            frontmatter: String(content[frontmatterRange]),
            body: String(content[frontmatterRange.upperBound...])
        )
    }
}

public enum Wikilinks {
    /// Prefix used when converting `[[target]]` links into parser-safe placeholder text.
    public static let placeholderStart = "\u{2039}WIKILINK:"

    /// Suffix used when converting `[[target]]` links into parser-safe placeholder text.
    public static let placeholderEnd = "\u{203A}"

    /// Replaces wikilinks with placeholder tokens that markdown parsers preserve as text.
    public static func preprocess(_ markdown: String) -> String {
        MarkdownScanning.replaceWikilinksOutsideCode(in: markdown) { inner in
            "\(placeholderStart)\(inner)\(placeholderEnd)"
        }
    }

    /// Extracts sorted, unique wikilink targets from markdown content.
    public static func extractOutgoingLinks(from content: String) -> [String] {
        let targets = wikilinkInners(in: content).compactMap { inner -> String? in
            let target = targetPart(from: inner)
            return target.isEmpty ? nil : target
        }

        return Array(Set(targets)).sorted()
    }

    /// Returns the first paragraph that links to any matching target or target leaf name.
    public static func extractBacklinkContext(
        from content: String,
        matching matchTargets: Set<String>,
        maxLength: Int = 120
    ) -> String? {
        let body = Frontmatter.split(content).body
        let withoutTitle = body.replacingOccurrences(
            of: #"^\s*# [^\n]+\n?"#,
            with: "",
            options: .regularExpression
        )

        for paragraph in splitParagraphs(withoutTitle) {
            let trimmed = paragraph.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { continue }

            for inner in wikilinkInners(in: trimmed) {
                let target = targetPart(from: inner)
                let leaf = target.split(separator: "/").last.map(String.init) ?? ""
                guard matchTargets.contains(target) || matchTargets.contains(leaf) else { continue }

                let flat = trimmed.replacingOccurrences(
                    of: #"\s+"#,
                    with: " ",
                    options: .regularExpression
                )

                if flat.count <= maxLength {
                    return flat
                }

                let prefixLength = max(0, maxLength - 1)
                return "\(flat.prefix(prefixLength))\u{2026}"
            }
        }

        return nil
    }

    /// Extracts a short plain-text preview from the markdown body.
    public static func extractSnippet(from content: String) -> String {
        let body = Frontmatter.split(content).body
        let withoutH1 = removeH1Line(from: body)
        let clean = withoutH1
            .components(separatedBy: "\n")
            .filter(isSnippetLine)
            .map(stripListMarker)
            .joined(separator: " ")

        let stripped = stripMarkdownCharacters(from: clean).trimmingCharacters(in: .whitespacesAndNewlines)
        if !stripped.isEmpty {
            return truncateSnippet(stripped)
        }

        let headingText = withoutH1
            .components(separatedBy: "\n")
            .compactMap(extractSubheadingText)
            .joined(separator: " ")
        let headingStripped = stripMarkdownCharacters(from: headingText).trimmingCharacters(in: .whitespacesAndNewlines)
        return headingStripped.isEmpty ? "" : truncateSnippet(headingStripped)
    }

    /// Counts words in the markdown body after removing the title and wikilinks.
    public static func countWords(in content: String) -> Int {
        let body = Frontmatter.split(content).body
        let withoutTitle = body.replacingOccurrences(
            of: #"^\s*# [^\n]+\n?"#,
            with: "",
            options: .regularExpression
        )
        let withoutWikilinks = MarkdownScanning.replaceWikilinksOutsideCode(in: withoutTitle) { _ in "" }
        let text = withoutWikilinks.replacingOccurrences(
            of: #"[#*_\[\]`>~\-|]"#,
            with: "",
            options: .regularExpression
        )
        .trimmingCharacters(in: .whitespacesAndNewlines)

        guard !text.isEmpty else { return 0 }
        return text.split(whereSeparator: { $0.isWhitespace }).count
    }

    private static func replaceWikilinks(in text: String, replacement: (String) -> String) -> String {
        MarkdownScanning.replaceWikilinksOutsideCode(in: text, replacement: replacement)
    }

    private static func wikilinkInners(in text: String) -> [String] {
        var inners: [String] = []
        _ = replaceWikilinks(in: text) { inner in
            inners.append(inner)
            return ""
        }
        return inners
    }

    private static func targetPart(from inner: String) -> String {
        guard let pipe = inner.firstIndex(of: "|") else { return inner }
        return String(inner[..<pipe])
    }

    private static func splitParagraphs(_ text: String) -> [String] {
        guard let regex = try? NSRegularExpression(pattern: #"\n{2,}"#) else {
            return text.components(separatedBy: "\n\n")
        }

        var paragraphs: [String] = []
        var cursor = text.startIndex
        let range = NSRange(text.startIndex..<text.endIndex, in: text)

        for match in regex.matches(in: text, range: range) {
            guard let matchRange = Range(match.range, in: text) else { continue }
            paragraphs.append(String(text[cursor..<matchRange.lowerBound]))
            cursor = matchRange.upperBound
        }

        paragraphs.append(String(text[cursor..<text.endIndex]))
        return paragraphs
    }

    private static func isSnippetLine(_ line: String) -> Bool {
        let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
        return !trimmed.isEmpty
            && !trimmed.hasPrefix("#")
            && !trimmed.hasPrefix("```")
            && !trimmed.hasPrefix("---")
    }

    private static func stripListMarker(_ line: String) -> String {
        let trimmed = String(line.drop(while: { $0 == " " || $0 == "\t" }))
        for prefix in ["* ", "- ", "+ "] where trimmed.hasPrefix(prefix) {
            return String(trimmed.dropFirst(prefix.count))
        }

        guard let dotRange = trimmed.range(of: ". ") else { return trimmed }
        let digitCount = trimmed.distance(from: trimmed.startIndex, to: dotRange.lowerBound)
        guard (1...3).contains(digitCount) else { return trimmed }

        let digits = trimmed[..<dotRange.lowerBound]
        return digits.allSatisfy(\.isNumber) ? String(trimmed[dotRange.upperBound...]) : trimmed
    }

    private static func removeH1Line(from body: String) -> String {
        let lines = body.components(separatedBy: "\n")

        for index in lines.indices {
            let trimmed = lines[index].trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.hasPrefix("# ") {
                return lines[(index + 1)...].joined(separator: "\n")
            }
            if !trimmed.isEmpty {
                return body
            }
        }

        return body
    }

    private static func stripMarkdownCharacters(from source: String) -> String {
        var result = ""
        var cursor = source.startIndex

        while cursor < source.endIndex {
            if starts(with: "[[", in: source, at: cursor) {
                cursor = appendWikilinkDisplayText(from: source, at: cursor, to: &result)
                continue
            }

            if source[cursor] == "[" {
                cursor = appendMarkdownLinkText(from: source, at: cursor, to: &result)
                continue
            }

            if "*_`~".contains(source[cursor]) {
                cursor = source.index(after: cursor)
                continue
            }

            result.append(source[cursor])
            cursor = source.index(after: cursor)
        }

        return result
    }

    private static func appendWikilinkDisplayText(
        from source: String,
        at cursor: String.Index,
        to result: inout String
    ) -> String.Index {
        let innerStart = source.index(cursor, offsetBy: 2)
        guard let end = source.range(of: "]]", range: innerStart..<source.endIndex) else {
            result.append(source[cursor])
            return source.index(after: cursor)
        }

        let inner = String(source[innerStart..<end.lowerBound])
        if let pipe = inner.firstIndex(of: "|") {
            result.append(contentsOf: inner[inner.index(after: pipe)...])
        } else {
            result.append(inner)
        }

        return end.upperBound
    }

    private static func appendMarkdownLinkText(
        from source: String,
        at cursor: String.Index,
        to result: inout String
    ) -> String.Index {
        var current = source.index(after: cursor)
        var text = ""

        while current < source.endIndex, source[current] != "]" {
            text.append(source[current])
            current = source.index(after: current)
        }

        guard current < source.endIndex else {
            result.append("[")
            return source.index(after: cursor)
        }

        current = source.index(after: current)
        if current < source.endIndex, source[current] == "(" {
            current = source.index(after: current)
            while current < source.endIndex, source[current] != ")" {
                current = source.index(after: current)
            }
            if current < source.endIndex {
                current = source.index(after: current)
            }
        }

        result.append(text)
        return current
    }

    private static func starts(with token: String, in source: String, at index: String.Index) -> Bool {
        source[index...].hasPrefix(token)
    }

    private static func extractSubheadingText(from line: String) -> String? {
        let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
        let stripped = String(trimmed.drop(while: { $0 == "#" }))

        guard stripped.count < trimmed.count, stripped.hasPrefix(" ") else { return nil }

        let text = stripped.trimmingCharacters(in: .whitespacesAndNewlines)
        return text.isEmpty ? nil : text
    }

    private static func truncateSnippet(_ text: String) -> String {
        text.count <= 160 ? text : "\(text.prefix(160))..."
    }
}
