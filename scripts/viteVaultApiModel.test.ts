import { describe, expect, it } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { classifyFileKind, findVaultFiles, parseVaultFile } from './viteVaultApiModel'

function withTempVault(run: (dir: string) => void) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grimoire-vite-vault-api-'))
  try {
    run(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

describe('vite vault api model', () => {
  it('classifies editable project files as text', () => {
    expect(classifyFileKind('src/app.ts')).toBe('text')
    expect(classifyFileKind('README.md')).toBe('markdown')
    expect(classifyFileKind('assets/logo.png')).toBe('binary')
  })

  it('finds markdown and editable text while skipping dependency folders', () => {
    withTempVault((dir) => {
      fs.mkdirSync(path.join(dir, 'src'), { recursive: true })
      fs.mkdirSync(path.join(dir, 'node_modules/pkg'), { recursive: true })
      fs.writeFileSync(path.join(dir, 'note.md'), '# Note\n')
      fs.writeFileSync(path.join(dir, 'src/app.ts'), 'export const sentinel = true\n')
      fs.writeFileSync(path.join(dir, 'node_modules/pkg/readme.md'), '# Dependency\n')
      fs.writeFileSync(path.join(dir, 'image.png'), 'binary-ish')

      const relativeFiles = findVaultFiles(dir).map((file) => path.relative(dir, file)).sort()

      expect(relativeFiles).toEqual(['note.md', 'src/app.ts'])
    })
  })

  it('parses text files as vault entries', () => {
    withTempVault((dir) => {
      const filePath = path.join(dir, 'docs/spotlight-proof.ts')
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, 'export const spotlightSentinel = "project docs searchable";\n')

      const entry = parseVaultFile(filePath)

      expect(entry).toMatchObject({
        path: filePath,
        filename: 'spotlight-proof.ts',
        title: 'spotlight-proof.ts',
        fileKind: 'text',
        isA: null,
      })
      expect(entry?.snippet).toContain('spotlightSentinel')
    })
  })
})
