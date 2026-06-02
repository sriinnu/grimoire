import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

function writeRequiredGitignore(root, patterns) {
  writeFileSync(resolve(root, '.gitignore'), `${patterns.join('\n')}\n`)
}

function assertIssue(name, result, expectedText) {
  if (result.issues.some((issue) => issue.includes(expectedText))) return
  throw new Error(`${name} expected issue containing "${expectedText}", got:\n${result.issues.join('\n')}`)
}

function assertOk(name, result) {
  if (result.ok) return
  throw new Error(`${name} expected ok, got:\n${result.issues.join('\n')}`)
}

export function runSelfTest({ auditLocalOnly, LOCAL_ONLY_DOCS, REQUIRED_GITIGNORE_PATTERNS }) {
  const root = mkdtempSync(join(tmpdir(), 'grimoire-local-audit-'))
  try {
    mkdirSync(resolve(root, 'docs'), { recursive: true })
    writeRequiredGitignore(root, REQUIRED_GITIGNORE_PATTERNS)
    writeFileSync(resolve(root, 'docs/ARCHITECTURE.md'), 'This public doc mentions local-only product policy.\n')
    assertOk('safe docs', auditLocalOnly(root, {
      trackedFiles: ['docs/ARCHITECTURE.md'],
      worktreeFiles: [],
    }))

    const missingPatterns = REQUIRED_GITIGNORE_PATTERNS.filter((pattern) => pattern !== 'mockups/')
    writeRequiredGitignore(root, missingPatterns)
    assertIssue('missing gitignore pattern', auditLocalOnly(root, {
      trackedFiles: [],
      worktreeFiles: [],
    }), 'mockups/')

    writeRequiredGitignore(root, REQUIRED_GITIGNORE_PATTERNS)
    assertIssue('tracked mockup', auditLocalOnly(root, {
      trackedFiles: ['mockups/wire.png'],
      worktreeFiles: [],
    }), 'mockups/')
    assertIssue('tracked docs mockup', auditLocalOnly(root, {
      trackedFiles: ['docs/mockups/wire.png'],
      worktreeFiles: [],
    }), 'docs/**/mockups/')
    assertIssue('tracked nested codex dir', auditLocalOnly(root, {
      trackedFiles: ['fixtures/.codex/session.json'],
      worktreeFiles: [],
    }), '.codex/')
    assertIssue('tracked env file', auditLocalOnly(root, {
      trackedFiles: ['packages/app/.env'],
      worktreeFiles: [],
    }), '.env*')
    assertIssue('tracked nested docs mockup', auditLocalOnly(root, {
      trackedFiles: ['docs/design/mockups/wire.png'],
      worktreeFiles: [],
    }), 'docs/**/mockups/')
    assertIssue('tracked scratch doc', auditLocalOnly(root, {
      trackedFiles: ['docs/scratch/plan.md'],
      worktreeFiles: [],
    }), 'docs/scratch/')
    assertIssue('tracked local md', auditLocalOnly(root, {
      trackedFiles: ['docs/plan.local.md'],
      worktreeFiles: [],
    }), 'docs/*.local.md')
    assertIssue('tracked generated MCP server bundle', auditLocalOnly(root, {
      trackedFiles: ['src-tauri/gen/apple/assets/mcp-server/index.js'],
      worktreeFiles: [],
    }), 'src-tauri/gen/apple/assets/mcp-server/')
    assertIssue('tracked claude command', auditLocalOnly(root, {
      trackedFiles: ['.claude/commands/grimoire-next-task.md'],
      worktreeFiles: [],
    }), '.claude/')
    assertIssue('tracked local planning doc', auditLocalOnly(root, {
      trackedFiles: ['docs/ACTIVE-WORK.md'],
      worktreeFiles: [],
    }), 'local planning docs')

    writeFileSync(resolve(root, 'chitragupta.vertical.json'), `{"handover":{"sourcePath":"${LOCAL_ONLY_DOCS[0]}"}}\n`)
    assertIssue('tracked local-only doc reference', auditLocalOnly(root, {
      trackedFiles: ['chitragupta.vertical.json'],
      worktreeFiles: [],
    }), LOCAL_ONLY_DOCS[0])

    mkdirSync(resolve(root, 'src-tauri/fixtures/import-corpora/obsidian-vault'), { recursive: true })
    writeFileSync(resolve(root, 'src-tauri/fixtures/import-corpora/obsidian-vault/.env'), 'OBSIDIAN_FIXTURE_ENV=placeholder\n')
    assertIssue('tracked dirty env fixture', auditLocalOnly(root, {
      trackedFiles: ['src-tauri/fixtures/import-corpora/obsidian-vault/.env'],
      worktreeFiles: [],
    }), 'sanitized')

    writeFileSync(resolve(root, 'docs/private-plan.md'), 'DO NOT COMMIT\n')
    assertIssue(
      'strong local marker',
      auditLocalOnly(root, { trackedFiles: ['docs/private-plan.md'], worktreeFiles: [] }),
      'DO NOT COMMIT',
    )
    assertIssue(
      'untracked strong local marker',
      auditLocalOnly(root, { trackedFiles: [], worktreeFiles: ['docs/private-plan.md'] }),
      'DO NOT COMMIT',
    )

    writeFileSync(resolve(root, 'docs/deep-private-plan.md'), `${'x'.repeat(9000)}\nDO NOT COMMIT\n`)
    assertIssue(
      'deep strong local marker',
      auditLocalOnly(root, { trackedFiles: ['docs/deep-private-plan.md'], worktreeFiles: [] }),
      'DO NOT COMMIT',
    )

    console.log('[local-only-audit] self-test ok')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}
