#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(SCRIPT_DIR, '..')
const SOURCE = join(REPO_ROOT, 'demo-vault-v2')
const OUT = join(REPO_ROOT, 'src-tauri', 'resources', 'starter-vault')

if (!existsSync(SOURCE)) {
  throw new Error(`Starter vault source is missing: ${SOURCE}`)
}

rmSync(OUT, { recursive: true, force: true })
mkdirSync(dirname(OUT), { recursive: true })
cpSync(SOURCE, OUT, {
  filter(sourcePath) {
    const name = sourcePath.split(/[\\/]/u).at(-1)
    return name !== '.DS_Store' && name !== '.git'
  },
  recursive: true,
  verbatimSymlinks: true,
})

writeFileSync(
  join(OUT, '.fixture-manifest.json'),
  `${JSON.stringify({
    name: 'Grimoire Getting Started',
    purpose: 'Packaged local-first starter vault fallback.',
    start_note: 'grimoire-start-here.md',
  }, null, 2)}\n`,
)

console.log('starter-vault bundled -> src-tauri/resources/starter-vault/')
