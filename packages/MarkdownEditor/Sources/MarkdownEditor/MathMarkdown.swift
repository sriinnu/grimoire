import Foundation

public enum MathMarkdown {
    /// Inline math block type identifier used by editor adapters.
    public static let inlineType = "mathInline"

    /// Display math block type identifier used by editor adapters.
    public static let blockType = "mathBlock"

    /// Prefix for inline math placeholder tokens.
    public static let inlineTokenPrefix = "@@GRIMOIRE_MATH_INLINE:"

    /// Prefix for display math placeholder tokens.
    public static let blockTokenPrefix = "@@GRIMOIRE_MATH_BLOCK:"

    /// Suffix shared by all math placeholder tokens.
    public static let tokenSuffix = "@@"

    /// Replaces inline and display math with parser-safe placeholder tokens.
    public static func preprocess(_ markdown: String) -> String {
        let lines = markdown.components(separatedBy: "\n")
        var result: [String] = []
        var inFence = false
        var index = 0

        while index < lines.count {
            let line = lines[index]

            if isCodeFence(line) {
                inFence.toggle()
                result.append(line)
                index += 1
                continue
            }

            if inFence {
                result.append(line)
                index += 1
                continue
            }

            if let displayMath = readDisplayMath(lines: lines, start: index) {
                result.append(mathToken(prefix: blockTokenPrefix, latex: displayMath.latex))
                index = displayMath.end + 1
                continue
            }

            result.append(replaceInlineMath(in: line))
            index += 1
        }

        return result.joined(separator: "\n")
    }

    /// Decodes a math placeholder token when it matches the supplied prefix.
    public static func decodeToken(_ text: String, prefix: String) -> String? {
        guard text.hasPrefix(prefix), text.hasSuffix(tokenSuffix) else { return nil }

        let start = text.index(text.startIndex, offsetBy: prefix.count)
        let end = text.index(text.endIndex, offsetBy: -tokenSuffix.count)
        return decodeLatex(String(text[start..<end]))
    }

    /// Returns escaped fallback HTML for rendering environments without a math renderer.
    public static func renderEscapedHTML(latex: String, displayMode: Bool) -> String {
        let escaped = escapeHTML(latex)
        if displayMode {
            return #"<div class="math math-block">\#(escaped)</div>"#
        }

        return #"<span class="math math-inline">\#(escaped)</span>"#
    }

    private struct DisplayMath {
        let latex: String
        let end: Int
    }

    private static func mathToken(prefix: String, latex: String) -> String {
        "\(prefix)\(encodeLatex(latex))\(tokenSuffix)"
    }

    private static func encodeLatex(_ latex: String) -> String {
        var allowed = CharacterSet.alphanumerics
        allowed.insert(charactersIn: "-_.!~*'()")
        return latex.addingPercentEncoding(withAllowedCharacters: allowed) ?? latex
    }

    private static func decodeLatex(_ encoded: String) -> String {
        encoded.removingPercentEncoding ?? encoded
    }

    private static func isCodeFence(_ line: String) -> Bool {
        let trimmed = String(line.drop(while: { $0 == " " || $0 == "\t" }))
        return trimmed.hasPrefix("```") || trimmed.hasPrefix("~~~")
    }

    private static func readDisplayMath(lines: [String], start: Int) -> DisplayMath? {
        let trimmed = lines[start].trimmingCharacters(in: .whitespacesAndNewlines)

        if trimmed == "$$" {
            guard let end = lines.indices.first(where: { $0 > start && lines[$0].trimmingCharacters(in: .whitespacesAndNewlines) == "$$" }) else {
                return nil
            }

            return DisplayMath(latex: lines[(start + 1)..<end].joined(separator: "\n"), end: end)
        }

        guard trimmed.hasPrefix("$$"), trimmed.hasSuffix("$$"), trimmed.count > 4 else {
            return nil
        }

        let innerStart = trimmed.index(trimmed.startIndex, offsetBy: 2)
        let innerEnd = trimmed.index(trimmed.endIndex, offsetBy: -2)
        let latex = trimmed[innerStart..<innerEnd].trimmingCharacters(in: .whitespacesAndNewlines)
        return latex.isEmpty ? nil : DisplayMath(latex: latex, end: start)
    }

    private static func replaceInlineMath(in line: String) -> String {
        let characters = Array(line)
        var result = ""
        var index = 0
        var inCodeSpan = false

        while index < characters.count {
            let character = characters[index]

            if character == "`" {
                inCodeSpan.toggle()
                result.append(character)
                index += 1
                continue
            }

            if !inCodeSpan, let inlineMath = readInlineMath(in: characters, at: index) {
                result.append(mathToken(prefix: inlineTokenPrefix, latex: inlineMath.latex))
                index = inlineMath.end + 1
                continue
            }

            result.append(character)
            index += 1
        }

        return result
    }

    private struct InlineMath {
        let latex: String
        let end: Int
    }

    private static func readInlineMath(in characters: [Character], at index: Int) -> InlineMath? {
        guard isSingleDollar(in: characters, at: index), !isEscaped(in: characters, at: index) else {
            return nil
        }

        guard let end = findInlineMathEnd(in: characters, start: index) else {
            return nil
        }

        let latex = String(characters[(index + 1)..<end])
        return isValidInlineLatex(latex) ? InlineMath(latex: latex, end: end) : nil
    }

    private static func findInlineMathEnd(in characters: [Character], start: Int) -> Int? {
        guard start + 1 < characters.count else { return nil }

        for index in (start + 1)..<characters.count {
            if isSingleDollar(in: characters, at: index), !isEscaped(in: characters, at: index) {
                return index
            }
        }

        return nil
    }

    private static func isSingleDollar(in characters: [Character], at index: Int) -> Bool {
        characters[index] == "$" && (index + 1 >= characters.count || characters[index + 1] != "$")
    }

    private static func isEscaped(in characters: [Character], at index: Int) -> Bool {
        var slashCount = 0
        var cursor = index - 1

        while cursor >= 0, characters[cursor] == "\\" {
            slashCount += 1
            cursor -= 1
        }

        return slashCount % 2 == 1
    }

    private static func isValidInlineLatex(_ latex: String) -> Bool {
        !latex.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && latex == latex.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func escapeHTML(_ text: String) -> String {
        text
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
    }
}
