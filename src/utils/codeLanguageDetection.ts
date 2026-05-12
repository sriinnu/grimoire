const MIN_CODE_LENGTH = 10

type LanguageRule = {
  language: string
  test: (source: string, lines: string[]) => boolean
}

function hasPattern(source: string, pattern: RegExp): boolean {
  return pattern.test(source)
}

function hasLine(lines: string[], pattern: RegExp): boolean {
  return lines.some((line) => pattern.test(line))
}

function isJson(source: string): boolean {
  if (!/^[{[]/.test(source)) return false
  try {
    JSON.parse(source)
    return true
  } catch {
    return false
  }
}

function hasYamlShape(lines: string[]): boolean {
  const keyedLines = lines.filter((line) => /^[A-Za-z0-9_-]+:\s+\S/.test(line))
  return keyedLines.length >= 2 && !lines.some((line) => /[{};]/.test(line))
}

const LANGUAGE_RULES: LanguageRule[] = [
  { language: 'json', test: isJson },
  { language: 'mermaid', test: source => /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram-v2|erDiagram|gantt|journey|pie)\b/u.test(source) },
  { language: 'html', test: source => /^<(?:!doctype|html|head|body|div|section|article|svg|template|script)\b/iu.test(source) },
  { language: 'sql', test: source => /^(select|insert|update|delete|create|alter|drop)\b[\s\S]+\b(from|table|into|set|where)\b/iu.test(source) },
  { language: 'rust', test: source => /\b(fn main|let mut|use std::|impl\s+\w+|pub struct|println!)\b/u.test(source) },
  { language: 'go', test: source => /\b(package main|func main\(|fmt\.Println|:=|import\s*\()/u.test(source) },
  { language: 'swift', test: source => /\b(import SwiftUI|struct\s+\w+:\s*View|var body:\s*some View|guard let|@State)\b/u.test(source) },
  { language: 'java', test: source => /\b(public class|private final|static void main|System\.out\.println|new\s+\w+\()/u.test(source) },
  { language: 'kotlin', test: source => /\b(fun main|data class|val\s+\w+|companion object|println\()/u.test(source) },
  { language: 'tsx', test: source => /\b(import React|ReactNode|JSX\.Element)\b/u.test(source) || /<[A-Z][A-Za-z0-9]*(?:\s|>)/u.test(source) },
  { language: 'typescript', test: source => /\b(import type|interface\s+\w+|type\s+\w+\s*=|enum\s+\w+|as const|Promise<|:\s*(?:string|number|boolean|unknown)\b)/u.test(source) },
  { language: 'javascript', test: source => /\b(const|let|function|console\.log|module\.exports|require\(|=>)\b/u.test(source) },
  { language: 'python', test: source => /\b(def\s+\w+\(|from\s+\w+\s+import|if __name__ ==|print\(|self\b)/u.test(source) || hasPattern(source, /^\s{4}\w+.+:/mu) },
  { language: 'css', test: source => /[{][\s\S]*(?:color|display|font|margin|padding|border|background)[\w-]*\s*:/u.test(source) },
  { language: 'bash', test: (_source, lines) => hasLine(lines, /^(?:#!\/.*sh|pnpm|npm|yarn|git|cd|export|curl|docker|brew|sudo|ssh|echo|mkdir|rm)\b/u) },
  { language: 'toml', test: source => /^\[[^\]]+\]\s*$/mu.test(source) && /^\w+\s*=/mu.test(source) },
  { language: 'yaml', test: (_source, lines) => hasYamlShape(lines) },
]

/** Infers a code-fence language from source text without loading a highlighter. */
export function detectCodeLanguage(source: string): string | null {
  const trimmed = source.trim()
  if (trimmed.length < MIN_CODE_LENGTH) return null

  const lines = trimmed.split(/\r?\n/u)
  return LANGUAGE_RULES.find((rule) => rule.test(trimmed, lines))?.language ?? null
}
