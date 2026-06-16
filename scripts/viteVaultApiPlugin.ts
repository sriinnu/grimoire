import type { IncomingMessage, ServerResponse } from 'http'
import fs from 'fs'
import path from 'path'
import type { Plugin } from 'vite'
import {
  classifyFileKind,
  findMarkdownFiles,
  findVaultFiles,
  parseMarkdownFile,
  parseVaultFile,
} from './viteVaultApiModel'
import { findVaultEntryFiles, parseVaultEntryFile } from './viteVaultApiEntryModel'

const IMAGE_MIME_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.webp': 'image/webp',
}

function sendJson(res: ServerResponse, payload: unknown, statusCode = 200): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function readExistingQueryPath(url: URL, res: ServerResponse, key: string): string | null {
  const filePath = url.searchParams.get(key)
  if (!filePath || !fs.existsSync(filePath)) {
    sendJson(res, { error: 'Invalid or missing path' }, 400)
    return null
  }
  return filePath
}

function vaultFileMimeType(filePath: string): string {
  return IMAGE_MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

function updateTitleWikilinks(vaultPath: string, oldTitle: string, _newTitle: string, excludePath: string): number {
  const newPathStem = path.relative(vaultPath, excludePath).replace(/\.md$/i, '')
  const oldTargets = collectLegacyWikilinkTargets(oldTitle, excludePath, vaultPath)
  return updateWikilinksForTargets(vaultPath, oldTargets, newPathStem, excludePath)
}

function collectLegacyWikilinkTargets(oldTitle: string, oldPath: string, vaultPath: string): string[] {
  const oldRelativeStem = path.relative(vaultPath, oldPath).replace(/\.md$/i, '')
  const oldFilenameStem = path.basename(oldPath, '.md')
  return [...new Set([oldTitle, oldRelativeStem, oldFilenameStem].filter(Boolean))]
}

function updateWikilinksForTargets(vaultPath: string, oldTargets: string[], newTarget: string, excludePath: string): number {
  if (oldTargets.length === 0) return 0
  const allFiles = findMarkdownFiles(vaultPath)
  const escaped = oldTargets.map(target => target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`\\[\\[(?:${escaped.join('|')})(\\|[^\\]]*?)?\\]\\]`, 'g')
  let updatedFiles = 0
  for (const filePath of allFiles) {
    if (filePath === excludePath) continue
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const replaced = content.replace(pattern, (_m: string, pipe: string | undefined) =>
        pipe ? `[[${newTarget}${pipe}]]` : `[[${newTarget}]]`
      )
      if (replaced !== content) {
        fs.writeFileSync(filePath, replaced, 'utf-8')
        updatedFiles++
      }
    } catch {
      // Skip unreadable files in the dev vault API.
    }
  }
  return updatedFiles
}

function updatePathWikilinks(vaultPath: string, oldPath: string, newPath: string, oldTitle: string): number {
  const newRelativeStem = path.relative(vaultPath, newPath).replace(/\.md$/i, '')
  const oldTargets = collectLegacyWikilinkTargets(oldTitle, oldPath, vaultPath)
  return updateWikilinksForTargets(vaultPath, oldTargets, newRelativeStem, newPath)
}

function handleVaultPing(url: URL, res: ServerResponse): boolean {
  if (url.pathname !== '/api/vault/ping') return false
  sendJson(res, { ok: true })
  return true
}

function handleVaultList(url: URL, res: ServerResponse): boolean {
  if (url.pathname !== '/api/vault/list') return false
  const dirPath = readExistingQueryPath(url, res, 'path')
  if (!dirPath) return true
  const entries = findVaultEntryFiles(dirPath).map(parseVaultEntryFile).filter(Boolean)
  sendJson(res, entries)
  return true
}

function handleVaultFile(url: URL, res: ServerResponse): boolean {
  if (url.pathname !== '/api/vault/file') return false
  const filePath = readExistingQueryPath(url, res, 'path')
  if (!filePath) return true
  if (!fs.statSync(filePath).isFile()) {
    sendJson(res, { error: 'Path is not a file' }, 400)
    return true
  }

  res.statusCode = 200
  res.setHeader('Content-Type', vaultFileMimeType(filePath))
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  fs.createReadStream(filePath).pipe(res)
  return true
}

function handleVaultContent(url: URL, res: ServerResponse): boolean {
  if (url.pathname !== '/api/vault/content') return false
  const filePath = readExistingQueryPath(url, res, 'path')
  if (!filePath) return true
  sendJson(res, { content: fs.readFileSync(filePath, 'utf-8') })
  return true
}

function handleVaultAllContent(url: URL, res: ServerResponse): boolean {
  if (url.pathname !== '/api/vault/all-content') return false
  const dirPath = readExistingQueryPath(url, res, 'path')
  if (!dirPath) return true
  const contentMap: Record<string, string> = {}
  for (const filePath of findVaultFiles(dirPath)) {
    try {
      contentMap[filePath] = fs.readFileSync(filePath, 'utf-8')
    } catch {
      // Skip unreadable files.
    }
  }
  sendJson(res, contentMap)
  return true
}

function handleVaultEntry(url: URL, res: ServerResponse): boolean {
  if (url.pathname !== '/api/vault/entry') return false
  const filePath = readExistingQueryPath(url, res, 'path')
  if (!filePath) return true
  sendJson(res, parseVaultEntryFile(filePath))
  return true
}

function handleVaultSearch(url: URL, res: ServerResponse): boolean {
  if (url.pathname !== '/api/vault/search') return false
  const vaultPath = url.searchParams.get('vault_path')
  const query = (url.searchParams.get('query') ?? '').toLowerCase()
  const mode = url.searchParams.get('mode') ?? 'all'
  if (!vaultPath || !query) {
    sendJson(res, { results: [], elapsed_ms: 0, query, mode })
    return true
  }
  if (!fs.existsSync(vaultPath)) {
    sendJson(res, { error: 'Invalid vault path' }, 400)
    return true
  }

  const results: {
    title: string
    path: string
    snippet: string
    score: number
    note_type: string | null
    file_kind: 'markdown' | 'text' | 'binary'
  }[] = []
  for (const filePath of findVaultFiles(vaultPath)) {
    const entry = parseVaultFile(filePath)
    if (!entry || entry.trashed) continue
    const raw = fs.readFileSync(filePath, 'utf-8')
    const relativePath = path.relative(vaultPath, filePath).replaceAll(path.sep, '/')
    const titleMatch = entry.title.toLowerCase().includes(query)
    const pathMatch = relativePath.toLowerCase().includes(query)
    const bodyMatch = raw.toLowerCase().includes(query)
    if (titleMatch || pathMatch || bodyMatch) {
      const score = (titleMatch ? 10 : 0) + (pathMatch ? 6 : 0) + (bodyMatch ? 1 : 0)
      results.push({
        title: entry.title,
        path: entry.path,
        snippet: bodyMatch ? entry.snippet : relativePath,
        score,
        note_type: entry.isA,
        file_kind: classifyFileKind(filePath),
      })
    }
  }
  results.sort((a, b) => b.score - a.score)
  sendJson(res, { results: results.slice(0, 20), elapsed_ms: 1, query, mode })
  return true
}

async function handleVaultSave(url: URL, req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (url.pathname !== '/api/vault/save' || req.method !== 'POST') return false
  try {
    const body = await readRequestBody(req)
    const { path: filePath, content } = JSON.parse(body)
    if (!filePath || content === undefined) {
      sendJson(res, { error: 'Missing path or content' }, 400)
      return true
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, content, 'utf-8')
    sendJson(res, null)
  } catch (err: unknown) {
    sendJson(res, { error: err instanceof Error ? err.message : 'Save failed' }, 500)
  }
  return true
}

async function handleVaultSaveBinary(url: URL, req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (url.pathname !== '/api/vault/save-binary' || req.method !== 'POST') return false
  try {
    const body = await readRequestBody(req)
    const { path: filePath, data } = JSON.parse(body)
    if (!filePath || typeof data !== 'string') {
      sendJson(res, { error: 'Missing path or data' }, 400)
      return true
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'))
    sendJson(res, null)
  } catch (err: unknown) {
    sendJson(res, { error: err instanceof Error ? err.message : 'Binary save failed' }, 500)
  }
  return true
}

async function handleVaultRename(url: URL, req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (url.pathname !== '/api/vault/rename' || req.method !== 'POST') return false
  try {
    const body = await readRequestBody(req)
    const { vault_path: vaultPath, old_path: oldPath, new_title: newTitle } = JSON.parse(body)
    const oldContent = fs.readFileSync(oldPath, 'utf-8')
    const oldTitle = oldContent.match(/^# (.+)$/m)?.[1]?.trim() ?? ''
    const slug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const newPath = path.join(path.dirname(oldPath), `${slug}.md`)
    const newContent = oldContent.replace(/^# .+$/m, `# ${newTitle}`)

    fs.writeFileSync(newPath, newContent, 'utf-8')
    if (newPath !== oldPath) fs.unlinkSync(oldPath)

    const updatedFiles = vaultPath ? updateTitleWikilinks(vaultPath, oldTitle, newTitle, newPath) : 0
    sendJson(res, { new_path: newPath, updated_files: updatedFiles })
  } catch (err: unknown) {
    sendJson(res, { error: err instanceof Error ? err.message : 'Rename failed' }, 500)
  }
  return true
}

type FilenameStemValidation =
  | { ok: true; stem: string }
  | { ok: false; error: string }

function validateMarkdownFilenameStem(value: unknown): FilenameStemValidation {
  const stem = String(value ?? '').trim().replace(/\.md$/i, '').trim()
  if (!stem) return { ok: false, error: 'New filename cannot be empty' }
  if (isUnsafeMarkdownFilenameStem(stem)) return { ok: false, error: 'Invalid filename' }
  return { ok: true, stem }
}

function isUnsafeMarkdownFilenameStem(stem: string): boolean {
  return stem === '.' || stem === '..' || stem.includes('/') || stem.includes('\\')
}

async function handleVaultRenameFilename(url: URL, req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (url.pathname !== '/api/vault/rename-filename' || req.method !== 'POST') return false
  try {
    const body = await readRequestBody(req)
    const {
      vault_path: vaultPath,
      old_path: oldPath,
      new_filename_stem: newFilenameStem,
    } = JSON.parse(body)
    const filename = validateMarkdownFilenameStem(newFilenameStem)
    if (!filename.ok) {
      sendJson(res, { error: filename.error }, 400)
      return true
    }

    const newPath = path.join(path.dirname(oldPath), `${filename.stem}.md`)
    const oldTitle = parseMarkdownFile(oldPath)?.title ?? path.basename(oldPath, '.md')
    if (newPath !== oldPath && fs.existsSync(newPath)) {
      sendJson(res, { error: 'A note with that name already exists' }, 409)
      return true
    }

    fs.renameSync(oldPath, newPath)
    const updatedFiles = vaultPath ? updatePathWikilinks(vaultPath, oldPath, newPath, oldTitle) : 0
    sendJson(res, { new_path: newPath, updated_files: updatedFiles })
  } catch (err: unknown) {
    sendJson(res, { error: err instanceof Error ? err.message : 'Rename failed' }, 500)
  }
  return true
}

async function handleVaultDelete(url: URL, req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (url.pathname !== '/api/vault/delete' || req.method !== 'POST') return false
  try {
    const body = await readRequestBody(req)
    const { path: filePath } = JSON.parse(body)
    if (!filePath) {
      sendJson(res, { error: 'Missing path' }, 400)
      return true
    }
    fs.unlinkSync(filePath)
    sendJson(res, filePath)
  } catch (err: unknown) {
    sendJson(res, { error: err instanceof Error ? err.message : 'Delete failed' }, 500)
  }
  return true
}

async function handleVaultApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
  const handlers = [
    () => Promise.resolve(handleVaultPing(url, res)),
    () => Promise.resolve(handleVaultList(url, res)),
    () => Promise.resolve(handleVaultFile(url, res)),
    () => Promise.resolve(handleVaultContent(url, res)),
    () => Promise.resolve(handleVaultAllContent(url, res)),
    () => Promise.resolve(handleVaultEntry(url, res)),
    () => Promise.resolve(handleVaultSearch(url, res)),
    () => handleVaultSave(url, req, res),
    () => handleVaultSaveBinary(url, req, res),
    () => handleVaultRename(url, req, res),
    () => handleVaultRenameFilename(url, req, res),
    () => handleVaultDelete(url, req, res),
  ]

  for (const handler of handlers) {
    if (await handler()) return true
  }

  return false
}

/** Vite middleware exposing a small local vault API for browser dev mode. */
export function vaultApiPlugin(): Plugin {
  return {
    name: 'vault-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (await handleVaultApiRequest(req, res)) return
        next()
      })
    },
  }
}


function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => resolve(body))
  })
}
