import type { ExtractedProjectIssue, ProjectIssuePriority, ProjectIssueType } from './types'

const PRIORITY_KEYWORDS: Record<string, ProjectIssuePriority> = {
  critical: 'critical',
  urgent: 'critical',
  important: 'high',
  high: 'high',
  medium: 'medium',
  low: 'low',
  later: 'low',
}

const CODE_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.py',
  '.pyw',
  '.java',
  '.kt',
  '.kts',
  '.c',
  '.cpp',
  '.cc',
  '.cxx',
  '.h',
  '.hpp',
  '.go',
  '.rs',
  '.rb',
  '.php',
  '.swift',
  '.scala',
  '.cs',
  '.vue',
  '.svelte',
  '.sh',
  '.bash',
  '.zsh',
  '.sql',
])

/**
 * Parses markdown tasks and code comments from already-loaded text content.
 */
export function parseProjectIssuesFromContent(
  content: string,
  sourceFile: string,
): ExtractedProjectIssue[] {
  const ext = extensionOf(sourceFile)
  const issues: ExtractedProjectIssue[] = []

  if (isMarkdownLikeFile(ext)) {
    issues.push(...parseMarkdownTodos(content, sourceFile))
  }

  if (isCodeFileExtension(ext)) {
    issues.push(...parseCodeComments(content, sourceFile))
  }

  return issues
}

/**
 * Returns whether this extension should be scanned for code comment tasks.
 */
export function isCodeFileExtension(ext: string): boolean {
  return CODE_EXTENSIONS.has(ext.toLowerCase())
}

/**
 * Determines whether a project file should be scanned, using Karya's defaults.
 */
export function shouldScanProjectFile(
  filePath: string,
  options: { include?: string[]; exclude?: string[] } = {},
): boolean {
  const include = options.include ?? ['**/*.md', '**/*.ts', '**/*.js', '**/*.py']
  const exclude = options.exclude ?? ['node_modules', '.git', 'dist', 'build']
  const name = basename(filePath)

  for (const pattern of exclude) {
    if (pattern.startsWith('**/')) {
      const globPart = pattern.slice(3)
      if (name === globPart || filePath.includes(globPart)) {
        return false
      }
      continue
    }

    if (name === pattern || filePath.includes(`/${pattern}/`) || filePath.startsWith(`${pattern}/`)) {
      return false
    }
  }

  for (const pattern of include) {
    if (pattern.startsWith('**/*.')) {
      const ext = pattern.slice(4)
      if (name.endsWith(ext)) {
        return true
      }
      continue
    }

    if (name === pattern || filePath.includes(pattern)) {
      return true
    }
  }

  return isCodeFileExtension(extensionOf(filePath))
}

/**
 * Infers task priority from Karya's urgency keywords.
 */
export function inferProjectIssuePriority(text: string): ProjectIssuePriority {
  const lowerText = text.toLowerCase()
  for (const [keyword, priority] of Object.entries(PRIORITY_KEYWORDS)) {
    if (lowerText.includes(keyword)) {
      return priority
    }
  }
  return 'medium'
}

function parseMarkdownTodos(content: string, sourceFile: string): ExtractedProjectIssue[] {
  return content
    .split(/\r?\n/)
    .map((line, index) => ({ match: line.match(/^\s*[-*]\s+\[\s\]\s+(.+)$/), lineNumber: index + 1 }))
    .filter((result): result is { match: RegExpMatchArray; lineNumber: number } => Boolean(result.match))
    .map(({ match, lineNumber }) => {
      const title = match[1].trim()
      return {
        title,
        description: null,
        priority: inferProjectIssuePriority(title),
        sourceFile,
        sourceLine: lineNumber,
        type: 'todo',
      }
    })
}

function parseCodeComments(content: string, sourceFile: string): ExtractedProjectIssue[] {
  const issues: ExtractedProjectIssue[] = []
  const singleLinePattern =
    /(?:^|\s)(?:\/\/|#|;;|--|<!--)\s*(TODO|FIXME|HACK|XXX|NOTE):?\s*(.+)$/gim

  let match: RegExpExecArray | null
  while ((match = singleLinePattern.exec(content)) !== null) {
    const title = match[2].trim()
    if (!title) {
      continue
    }

    issues.push({
      title,
      description: null,
      priority: inferProjectIssuePriority(title),
      sourceFile,
      sourceLine: lineNumberFromIndex(content, match.index),
      type: inferProjectIssueType(match[1]),
    })
  }

  const multiLinePattern = /\/\*\*?\s*(TODO|FIXME|HACK|XXX|NOTE):?\s*([\s\S]*?)\*\//gi
  while ((match = multiLinePattern.exec(content)) !== null) {
    const title = match[2].replace(/\n\s*\*\s*/g, ' ').trim()
    if (!title) {
      continue
    }

    issues.push({
      title,
      description: null,
      priority: inferProjectIssuePriority(title),
      sourceFile,
      sourceLine: lineNumberFromIndex(content, match.index),
      type: inferProjectIssueType(match[1]),
    })
  }

  return issues
}

function inferProjectIssueType(source: string): ProjectIssueType {
  const lower = source.toLowerCase()
  if (lower.includes('fixme') || lower.includes('xxx')) return 'fixme'
  if (lower.includes('hack')) return 'hack'
  if (lower.includes('todo')) return 'todo'
  return 'note'
}

function isMarkdownLikeFile(ext: string): boolean {
  return ['.md', '.markdown', '.todo', '.todos'].includes(ext)
}

function extensionOf(filePath: string): string {
  const fileName = basename(filePath)
  const dotIndex = fileName.lastIndexOf('.')
  return dotIndex === -1 ? '' : fileName.slice(dotIndex).toLowerCase()
}

function basename(filePath: string): string {
  return filePath.split(/[\\/]/).pop() ?? filePath
}

function lineNumberFromIndex(content: string, index: number): number {
  return content.slice(0, index).split(/\r?\n/).length
}
