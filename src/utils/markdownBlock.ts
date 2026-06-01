/** Appends a Markdown block to a note without disturbing frontmatter. */
export function appendMarkdownBlock(content: string, block: string): string {
  const base = content.trimEnd()
  const addition = block.trim()
  return `${base}${base ? '\n\n' : ''}${addition}\n`
}
