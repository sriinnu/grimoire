import Foundation
import MarkdownEditor

@main
struct MarkdownEditorTool {
    static func main() throws {
        var arguments = Array(CommandLine.arguments.dropFirst())
        guard let command = arguments.first else {
            printUsage()
            Foundation.exit(64)
        }
        arguments.removeFirst()

        let input = readStandardInput()

        switch command {
        case "compact":
            printWithoutExtraNewline(MarkdownCompactor.compact(input))
        case "preprocess-wikilinks":
            printWithoutExtraNewline(Wikilinks.preprocess(input))
        case "preprocess-math":
            printWithoutExtraNewline(MathMarkdown.preprocess(input))
        case "outgoing-links":
            try printJSON(Wikilinks.extractOutgoingLinks(from: input))
        case "snippet":
            printWithoutExtraNewline(Wikilinks.extractSnippet(from: input))
        case "count-words":
            print(Wikilinks.countWords(in: input))
        case "split-frontmatter":
            try printJSON(SplitOutput(Frontmatter.split(input)))
        case "render-math-html":
            let displayMode = arguments.contains("--display")
            printWithoutExtraNewline(MathMarkdown.renderEscapedHTML(latex: input, displayMode: displayMode))
        case "backlink-context":
            let maxLength = readMaxLength(from: arguments) ?? 120
            let targets = Set(arguments.filter { !$0.hasPrefix("--") && Int($0) == nil })
            if let context = Wikilinks.extractBacklinkContext(from: input, matching: targets, maxLength: maxLength) {
                printWithoutExtraNewline(context)
            }
        default:
            printUsage()
            Foundation.exit(64)
        }
    }

    private struct SplitOutput: Encodable {
        let frontmatter: String
        let body: String

        init(_ split: FrontmatterSplit) {
            self.frontmatter = split.frontmatter
            self.body = split.body
        }
    }

    private static func readStandardInput() -> String {
        let data = FileHandle.standardInput.readDataToEndOfFile()
        return String(data: data, encoding: .utf8) ?? ""
    }

    private static func printWithoutExtraNewline(_ output: String) {
        FileHandle.standardOutput.write(Data(output.utf8))
    }

    private static func printJSON<T: Encodable>(_ value: T) throws {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        let data = try encoder.encode(value)
        FileHandle.standardOutput.write(data)
        FileHandle.standardOutput.write(Data("\n".utf8))
    }

    private static func readMaxLength(from arguments: [String]) -> Int? {
        guard let marker = arguments.firstIndex(of: "--max"), marker + 1 < arguments.count else {
            return nil
        }

        return Int(arguments[marker + 1])
    }

    private static func printUsage() {
        let usage = """
        Usage: markdown-editor-tool <command> < input.md

        Commands:
          compact
          preprocess-wikilinks
          preprocess-math
          outgoing-links
          snippet
          count-words
          split-frontmatter
          render-math-html [--display]
          backlink-context <target>... [--max N]
        """
        FileHandle.standardError.write(Data(usage.utf8))
        FileHandle.standardError.write(Data("\n".utf8))
    }
}
