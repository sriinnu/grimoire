#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const DEFAULT_ROOTS = [
  '.github/pull_request_template.md',
  'CONTRIBUTING.md',
  'LICENSING.md',
  'README.md',
  'SECURITY.md',
  'TRADEMARKS.md',
  'certs/README.md',
  'docs',
  'markdown-editor/README.md',
]
const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx'])

function parseArgs(argv) {
  return {
    roots: argv.length > 0 ? argv.filter((arg) => arg !== '--') : DEFAULT_ROOTS,
    selfTest: argv.includes('--self-test'),
  }
}

async function collectMarkdownFiles(roots, rootDir = REPO_ROOT) {
  const files = []
  for (const root of roots) {
    await collectPath(resolve(rootDir, root), files)
  }
  return files.filter((file) => !isGitIgnored(file, rootDir)).sort()
}

async function collectPath(path, files) {
  if (!existsSync(path)) return
  const extension = extname(path).toLowerCase()
  if (MARKDOWN_EXTENSIONS.has(extension)) {
    files.push(path)
    return
  }
  const entries = await readdir(path, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    const child = join(path, entry.name)
    if (entry.isDirectory()) {
      await collectPath(child, files)
    } else if (entry.isFile() && MARKDOWN_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push(child)
    }
  }
}

function stripFencedBlocks(markdown) {
  const lines = markdown.split('\n')
  const output = []
  let fence = null

  for (const line of lines) {
    const match = line.match(/^\s*(`{3,}|~{3,})/)
    if (match) {
      const marker = match[1][0]
      const length = match[1].length
      if (!fence) {
        fence = { length, marker }
        output.push('')
        continue
      }
      if (marker === fence.marker && length >= fence.length) {
        fence = null
      }
      output.push('')
      continue
    }
    output.push(fence ? '' : line)
  }

  return output.join('\n')
}

function publicLinks(markdown) {
  const text = stripFencedBlocks(markdown)
  return [
    ...markdownLinks(text),
    ...htmlLinks(text),
  ]
}

function markdownLinks(text) {
  const links = []
  const pattern = /!?\[[^\]\n]*\]\(([^)\n]+)\)/gu
  for (const match of text.matchAll(pattern)) {
    links.push(cleanLink(match[1]))
  }
  return links
}

function htmlLinks(text) {
  const links = []
  const pattern = /\b(?:href|src)=["']([^"']+)["']/giu
  for (const match of text.matchAll(pattern)) {
    links.push(cleanLink(match[1]))
  }
  return links
}

function cleanLink(rawLink) {
  const trimmed = rawLink.trim()
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed.split(/\s+["'][^"']*["']$/u)[0]
}

function isExternal(link) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu.test(link)
}

function localTarget(link) {
  if (!link || link.startsWith('#') || isExternal(link)) return null
  const withoutAnchor = link.split('#')[0]
  if (!withoutAnchor) return null
  return decodeURIComponent(withoutAnchor)
}

async function verifyLinks(files, rootDir = REPO_ROOT) {
  const issues = []
  for (const file of files) {
    const markdown = await readFile(file, 'utf8')
    for (const link of publicLinks(markdown)) {
      const target = localTarget(link)
      if (!target) continue
      const targetPath = resolve(dirname(file), target)
      if (!isInsideRoot(targetPath, rootDir)) {
        issues.push(`${relativePath(file, rootDir)} links outside repo: ${link}`)
        continue
      }
      if (!existsSync(targetPath)) {
        issues.push(`${relativePath(file, rootDir)} has missing local link: ${link}`)
      }
    }
  }
  return issues
}

function isInsideRoot(path, rootDir = REPO_ROOT) {
  const relativeTarget = relative(rootDir, path)
  return relativeTarget !== '' && !relativeTarget.startsWith('..') && !isAbsolute(relativeTarget)
}

function relativePath(path, rootDir = REPO_ROOT) {
  const relativeTarget = relative(rootDir, path)
  if (relativeTarget !== '' && !relativeTarget.startsWith('..') && !isAbsolute(relativeTarget)) {
    return relativeTarget.replaceAll('\\', '/')
  }
  return path.replaceAll('\\', '/')
}

function isGitIgnored(path, rootDir = REPO_ROOT) {
  const result = spawnSync('git', ['check-ignore', '--quiet', '--', relativePath(path, rootDir)], {
    cwd: rootDir,
    stdio: 'ignore',
  })
  return result.status === 0
}

async function runSelfTest() {
  const tempRoot = mkdtempSync(join(tmpdir(), 'grimoire-doc-links-'))
  try {
    writeFileSync(resolve(tempRoot, 'README.md'), [
      '# Demo',
      '[Guide](docs/GUIDE.md)',
      '<img src="assets/icon.png" />',
      '```markdown',
      '![Example](missing-inside-fence.png)',
      '```',
      '',
    ].join('\n'))
    await readdir(resolve(tempRoot, 'docs')).catch(() => {
      mkdirSync(resolve(tempRoot, 'docs'), { recursive: true })
      mkdirSync(resolve(tempRoot, 'assets'), { recursive: true })
    })
    writeFileSync(resolve(tempRoot, 'docs/GUIDE.md'), 'Guide\n')
    writeFileSync(resolve(tempRoot, 'assets/icon.png'), 'png\n')

    const files = await collectMarkdownFiles(['README.md'], tempRoot)
    const okIssues = await verifyLinks(files, tempRoot)
    if (okIssues.length !== 0) throw new Error(`expected clean fixture, got ${okIssues.join(', ')}`)

    writeFileSync(resolve(tempRoot, 'BROKEN.md'), '[Missing](NOPE.md)\n')
    const brokenIssues = await verifyLinks(await collectMarkdownFiles(['BROKEN.md'], tempRoot), tempRoot)
    if (brokenIssues.length !== 1 || !brokenIssues[0].includes('NOPE.md')) {
      throw new Error('broken fixture should report one missing link')
    }

    spawnSync('git', ['init'], { cwd: tempRoot, stdio: 'ignore' })
    writeFileSync(resolve(tempRoot, '.gitignore'), 'docs/local-only.md\n')
    writeFileSync(resolve(tempRoot, 'docs/local-only.md'), '[Ignored broken link](MISSING.md)\n')
    const publicFiles = await collectMarkdownFiles(['docs'], tempRoot)
    if (publicFiles.some((file) => file.endsWith('local-only.md'))) {
      throw new Error('ignored markdown should not be collected as a public doc')
    }
    const ignoredIssues = await verifyLinks(publicFiles, tempRoot)
    if (ignoredIssues.some((issue) => issue.includes('local-only.md'))) {
      throw new Error('ignored markdown should not affect public doc link checks')
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
  console.log('[public-doc-links] self-test ok')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) {
    await runSelfTest()
    return
  }

  const files = await collectMarkdownFiles(args.roots)
  const issues = await verifyLinks(files)
  if (issues.length > 0) {
    console.error(`[public-doc-links] ${issues.length} issue(s):`)
    for (const issue of issues) console.error(`- ${issue}`)
    process.exit(1)
  }
  console.log(`[public-doc-links] ok (${files.length} file(s))`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
