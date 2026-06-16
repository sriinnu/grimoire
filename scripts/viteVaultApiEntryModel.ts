import fs from 'fs'
import path from 'path'
import {
  classifyFileKind,
  parseMarkdownFile,
  parseTextFile,
  shouldEnterDir,
  type VaultEntry,
} from './viteVaultApiModel'

/** Parse binary vault files into lightweight entries for browser dev mode. */
export function parseBinaryFile(filePath: string): VaultEntry | null {
  try {
    const stats = fs.statSync(filePath)
    const filename = path.basename(filePath)

    return {
      path: filePath,
      filename,
      title: filename,
      isA: null,
      aliases: [],
      belongsTo: [],
      relatedTo: [],
      status: null,
      archived: false,
      trashed: false,
      trashedAt: null,
      modifiedAt: stats.mtimeMs,
      createdAt: stats.birthtimeMs,
      fileSize: stats.size,
      snippet: '',
      wordCount: 0,
      relationships: {},
      icon: null,
      color: null,
      order: null,
      sidebarLabel: null,
      template: null,
      sort: null,
      view: null,
      visible: null,
      organized: false,
      favorite: false,
      favoriteIndex: null,
      listPropertiesDisplay: [],
      outgoingLinks: [],
      properties: {},
      hasH1: false,
      fileKind: 'binary',
    }
  } catch {
    return null
  }
}

/** Parse any vault file kind, including binary assets listed beside notes. */
export function parseVaultEntryFile(filePath: string): VaultEntry | null {
  const fileKind = classifyFileKind(filePath)
  if (fileKind === 'markdown') return parseMarkdownFile(filePath)
  if (fileKind === 'text') return parseTextFile(filePath)
  return parseBinaryFile(filePath)
}

/** Find every visible vault entry, including binary assets for attachment previews. */
export function findVaultEntryFiles(dir: string): string[] {
  const results: string[] = []
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true })
    for (const item of items) {
      const full = path.join(dir, item.name)
      if (item.isDirectory()) {
        if (shouldEnterDir(item.name)) results.push(...findVaultEntryFiles(full))
      } else if (!item.name.startsWith('.')) {
        results.push(full)
      }
    }
  } catch {
    // skip unreadable dirs
  }
  return results
}
