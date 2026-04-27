import type { FrontmatterValue } from '../components/Inspector'

function formatYamlValue(value: FrontmatterValue): string {
  if (Array.isArray(value)) return '\n' + value.map(v => `  - "${v}"`).join('\n')
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (value === null) return 'null'
  return String(value)
}

function formatYamlKey(key: string): string {
  return key.includes(' ') ? `"${key}"` : key
}

function buildKeyPattern(key: string): RegExp {
  return new RegExp(`^["']?${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']?\\s*:`, 'm')
}

function parseFrontmatter(content: string): { fm: string; rest: string } | null {
  if (!content.startsWith('---\n')) return null
  const fmEnd = content.indexOf('\n---', 4)
  if (fmEnd === -1) return null
  return { fm: content.slice(4, fmEnd), rest: content.slice(fmEnd + 4) }
}

function formatKeyValue(yamlKey: string, yamlValue: string, isArray: boolean): string {
  return isArray ? `${yamlKey}:${yamlValue}` : `${yamlKey}: ${yamlValue}`
}

function processKeyInLines(lines: string[], keyPattern: RegExp, replacement: string | null): string[] {
  const newLines: string[] = []
  let i = 0
  while (i < lines.length) {
    if (keyPattern.test(lines[i])) {
      i++
      while (i < lines.length && lines[i].startsWith('  - ')) i++
      if (replacement !== null) newLines.push(replacement)
      continue
    }
    newLines.push(lines[i])
    i++
  }
  return newLines
}

export function updateMockFrontmatter(path: string, key: string, value: FrontmatterValue): string {
  const content = window.__mockContent?.[path] || ''
  const yamlKey = formatYamlKey(key)
  const yamlValue = formatYamlValue(value)
  const isArray = Array.isArray(value)

  const parsed = parseFrontmatter(content)
  if (!parsed) {
    return `---\n${formatKeyValue(yamlKey, yamlValue, isArray)}\n---\n${content}`
  }

  const { fm, rest } = parsed
  const keyPattern = buildKeyPattern(key)

  if (keyPattern.test(fm)) {
    const newLines = processKeyInLines(fm.split('\n'), keyPattern, formatKeyValue(yamlKey, yamlValue, isArray))
    return `---\n${newLines.join('\n')}\n---${rest}`
  }

  return `---\n${fm}\n${formatKeyValue(yamlKey, yamlValue, isArray)}\n---${rest}`
}

export function deleteMockFrontmatterProperty(path: string, key: string): string {
  const content = window.__mockContent?.[path] || ''
  const parsed = parseFrontmatter(content)
  if (!parsed) return content

  const { fm, rest } = parsed
  const keyPattern = buildKeyPattern(key)
  const newLines = processKeyInLines(fm.split('\n'), keyPattern, null)
  return `---\n${newLines.join('\n')}\n---${rest}`
}
