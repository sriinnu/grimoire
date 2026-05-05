enum MarkdownScanning {
    /// Applies a transform to wikilink inner text outside fenced and inline code spans.
    static func replaceWikilinksOutsideCode(
        in markdown: String,
        replacement: (String) -> String
    ) -> String {
        markdown
            .components(separatedBy: "\n")
            .enumerated()
            .reduce((lines: [String](), fence: nil as String?)) { state, item in
                var next = state
                let line = item.element
                let marker = fenceDelimiter(in: line)

                if let marker, next.fence == nil {
                    next.fence = marker
                    next.lines.append(line)
                    return next
                }

                if let marker, next.fence == marker {
                    next.fence = nil
                    next.lines.append(line)
                    return next
                }

                next.lines.append(next.fence == nil ? replaceInlineWikilinks(in: line, replacement: replacement) : line)
                return next
            }
            .lines
            .joined(separator: "\n")
    }

    /// Returns the code-fence marker when a line starts a supported fenced code block.
    static func fenceDelimiter(in line: String) -> String? {
        let trimmed = line.drop(while: { $0 == " " || $0 == "\t" })
        if trimmed.hasPrefix("```") { return "```" }
        if trimmed.hasPrefix("~~~") { return "~~~" }
        return nil
    }

    private static func replaceInlineWikilinks(
        in line: String,
        replacement: (String) -> String
    ) -> String {
        var output = ""
        var cursor = line.startIndex

        while cursor < line.endIndex {
            if line[cursor] == "`" {
                cursor = appendCodeSpan(from: line, at: cursor, to: &output)
                continue
            }

            if line[cursor...].hasPrefix("[[") {
                let innerStart = line.index(cursor, offsetBy: 2)
                if let end = line.range(of: "]]", range: innerStart..<line.endIndex) {
                    let inner = String(line[innerStart..<end.lowerBound])
                    output.append(replacement(inner))
                    cursor = end.upperBound
                    continue
                }
            }

            output.append(line[cursor])
            cursor = line.index(after: cursor)
        }

        return output
    }

    private static func appendCodeSpan(
        from line: String,
        at cursor: String.Index,
        to output: inout String
    ) -> String.Index {
        var runEnd = cursor
        while runEnd < line.endIndex, line[runEnd] == "`" {
            runEnd = line.index(after: runEnd)
        }

        let marker = String(line[cursor..<runEnd])
        guard let close = line.range(of: marker, range: runEnd..<line.endIndex) else {
            output.append(contentsOf: line[cursor..<line.endIndex])
            return line.endIndex
        }

        output.append(contentsOf: line[cursor..<close.upperBound])
        return close.upperBound
    }
}
