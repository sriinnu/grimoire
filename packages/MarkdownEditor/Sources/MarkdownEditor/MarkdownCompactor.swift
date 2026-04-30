import Foundation

public enum MarkdownCompactor {
    /// Normalizes markdown emitted by editor engines into Grimoire's durable source format.
    public static func compact(_ markdown: String) -> String {
        guard !markdown.isEmpty else { return markdown }

        let lines = markdown.components(separatedBy: "\n")
        var result: [String] = []
        var inCodeBlock = false

        for index in lines.indices {
            let rawLine = lines[index]

            if isFenceDelimiter(rawLine) {
                inCodeBlock.toggle()
                result.append(rawLine)
                continue
            }

            if inCodeBlock {
                result.append(rawLine)
                continue
            }

            let line = normalize(rawLine)
            if shouldSkipLine(lines: lines, index: index, normalizedLine: line) {
                continue
            }

            result.append(line)
        }

        while let last = result.last, last.trimmedForMarkdown.isEmpty {
            result.removeLast()
        }

        if !result.isEmpty {
            result.append("")
        }

        return result.joined(separator: "\n")
    }

    private static func isFenceDelimiter(_ line: String) -> Bool {
        line.trimmedLeadingWhitespace.hasPrefix("```")
    }

    private static func normalize(_ line: String) -> String {
        let normalizedBullets = normalizeBulletMarker(line)
        let decodedEntities = decodeHtmlEntities(normalizedBullets)
        return normalizeStrongWhitespace(decodedEntities)
    }

    private static func shouldSkipLine(
        lines: [String],
        index: Int,
        normalizedLine: String
    ) -> Bool {
        if normalizedLine.trimmedForMarkdown.isEmpty {
            return isBlankBetweenListItems(lines: lines, index: index)
                || isExcessiveBlankLine(lines: lines, index: index)
        }

        return isRedundantHardBreakLine(lines: lines, index: index, normalizedLine: normalizedLine)
    }

    private static func isBlankBetweenListItems(lines: [String], index: Int) -> Bool {
        guard
            let previous = previousNonBlankLineIndex(lines: lines, before: index),
            let next = nextNonBlankLineIndex(lines: lines, after: index)
        else {
            return false
        }

        return isListItem(lines[previous]) && isListItem(lines[next])
    }

    private static func isExcessiveBlankLine(lines: [String], index: Int) -> Bool {
        index > 0 && lines[index - 1].trimmedForMarkdown.isEmpty
    }

    private static func previousNonBlankLineIndex(lines: [String], before index: Int) -> Int? {
        guard index > 0 else { return nil }

        for candidate in stride(from: index - 1, through: 0, by: -1) {
            if !lines[candidate].trimmedForMarkdown.isEmpty {
                return candidate
            }
        }

        return nil
    }

    private static func nextNonBlankLineIndex(lines: [String], after index: Int) -> Int? {
        guard index + 1 < lines.count else { return nil }

        for candidate in (index + 1)..<lines.count where !lines[candidate].trimmedForMarkdown.isEmpty {
            return candidate
        }

        return nil
    }

    private static func isRedundantHardBreakLine(
        lines: [String],
        index: Int,
        normalizedLine: String
    ) -> Bool {
        guard isHardBreakOnlyLine(normalizedLine) else { return false }
        guard let previous = previousNonBlankLineIndex(lines: lines, before: index) else { return false }

        let previousLine = normalize(lines[previous])
        return isHardBreakOnlyLine(previousLine) || endsWithHardBreakMarker(previousLine)
    }

    private static func isHardBreakOnlyLine(_ line: String) -> Bool {
        let trimmed = line.trimmedForMarkdown
        return !trimmed.isEmpty && trimmed.allSatisfy { $0 == "\\" }
    }

    private static func endsWithHardBreakMarker(_ line: String) -> Bool {
        let trimmed = line.trimmingCharacters(in: .whitespaces)
        if trimmed.hasSuffix("\\\\") {
            return true
        }

        let withoutClosers = String(trimmed.dropLastWhile { "*_~`".contains($0) })
        return withoutClosers.hasSuffix("\\\\")
    }

    private static func normalizeBulletMarker(_ line: String) -> String {
        let pattern = #"^(\s*)\*(\s)"#
        return line.replacingOccurrences(
            of: pattern,
            with: "$1-$2",
            options: .regularExpression
        )
    }

    private static func decodeHtmlEntities(_ line: String) -> String {
        guard line.contains("&#x") else { return line }

        let pattern = #"&#x([0-9a-fA-F]+);"#
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return line }

        var output = line
        let fullRange = NSRange(line.startIndex..<line.endIndex, in: line)
        let matches = regex.matches(in: line, range: fullRange)

        for match in matches.reversed() {
            guard
                match.numberOfRanges == 2,
                let entityRange = Range(match.range(at: 0), in: output),
                let hexRange = Range(match.range(at: 1), in: output),
                let scalarValue = UInt32(output[hexRange], radix: 16),
                let scalar = UnicodeScalar(scalarValue)
            else {
                continue
            }

            output.replaceSubrange(entityRange, with: String(scalar))
        }

        return output
    }

    private static func normalizeStrongWhitespace(_ line: String) -> String {
        var output = ""
        var cursor = line.startIndex

        while let start = line.range(of: "**", range: cursor..<line.endIndex) {
            output.append(contentsOf: line[cursor..<start.lowerBound])

            guard let end = line.range(of: "**", range: start.upperBound..<line.endIndex) else {
                output.append(contentsOf: line[start.lowerBound..<line.endIndex])
                return output
            }

            let content = String(line[start.upperBound..<end.lowerBound])
            let replacement = normalizedStrongToken(original: String(line[start.lowerBound..<end.upperBound]), content: content)
            output.append(replacement)
            cursor = end.upperBound
        }

        output.append(contentsOf: line[cursor..<line.endIndex])
        return output
    }

    private static func normalizedStrongToken(original: String, content: String) -> String {
        guard !content.contains("*"), !content.contains("\n") else { return original }

        let leading = String(content.prefix { $0.isWhitespace })
        let trailing = String(content.reversed().prefix { $0.isWhitespace }.reversed())
        guard !leading.isEmpty || !trailing.isEmpty else { return original }

        let contentStart = content.index(content.startIndex, offsetBy: leading.count)
        let contentEnd = content.index(content.endIndex, offsetBy: -trailing.count)
        let strongContent = String(content[contentStart..<contentEnd])
        guard !strongContent.isEmpty else { return original }

        return "\(leading)**\(strongContent)**\(trailing)"
    }

    private static func isListItem(_ line: String) -> Bool {
        guard let regex = try? NSRegularExpression(pattern: #"^\s*([-*+]|\d+\.)\s"#) else {
            return false
        }

        let range = NSRange(line.startIndex..<line.endIndex, in: line)
        return regex.firstMatch(in: line, range: range) != nil
    }
}

private extension String {
    var trimmedForMarkdown: String {
        trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var trimmedLeadingWhitespace: String {
        String(drop(while: { $0 == " " || $0 == "\t" }))
    }

    func dropLastWhile(_ predicate: (Character) -> Bool) -> Substring {
        var end = endIndex
        while end > startIndex {
            let previous = index(before: end)
            guard predicate(self[previous]) else { break }
            end = previous
        }
        return self[startIndex..<end]
    }
}
