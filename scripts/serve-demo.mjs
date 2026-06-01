#!/usr/bin/env node
/**
 * Production static server for Grimoire App demo.
 * Serves dist/ + handles /api/vault/* routes for browser testing.
 */

import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.join(__dirname, '..', 'dist')
const REPO_DIR = path.resolve(__dirname, '..')
const DEFAULT_VAULT_DIR = path.join(REPO_DIR, 'demo-vault-v2')
const PORT = Number(process.env.PORT ?? 5173)
const HOST = process.env.GRIMOIRE_DEMO_PUBLIC === '1' ? '0.0.0.0' : '127.0.0.1'

function realpathIfExists(p) {
  try {
    return fs.realpathSync.native(p)
  } catch {
    return null
  }
}

function isPathInside(root, candidate) {
  const relative = path.relative(root, candidate)
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative))
}

function resolveAllowedVaultRoots() {
  const roots = [DEFAULT_VAULT_DIR]
  const explicitVault = process.env.GRIMOIRE_DEMO_VAULT_DIR
  if (explicitVault) roots.push(explicitVault)
  return roots
    .map((root) => realpathIfExists(root))
    .filter(Boolean)
}

const ALLOWED_VAULT_ROOTS = resolveAllowedVaultRoots()

function allowedVaultPath(p, kind = 'any') {
  const resolved = realpathIfExists(p)
  if (!resolved) return null
  if (!ALLOWED_VAULT_ROOTS.some((root) => isPathInside(root, resolved))) return null
  if (kind === 'dir' && !fs.statSync(resolved).isDirectory()) return null
  if (kind === 'file' && !fs.statSync(resolved).isFile()) return null
  if (kind === 'markdown' && (!fs.statSync(resolved).isFile() || !/\.m(?:d|arkdown)$/iu.test(resolved))) return null
  return resolved
}

function resolveStaticPath(urlPath) {
  let decodedPath
  try {
    decodedPath = decodeURIComponent(urlPath.split('?')[0] ?? '/')
  } catch {
    return path.join(DIST_DIR, 'index.html')
  }
  const requested = path.resolve(DIST_DIR, decodedPath === '/' ? 'index.html' : `.${decodedPath}`)
  if (!isPathInside(DIST_DIR, requested)) return path.join(DIST_DIR, 'index.html')
  if (!fs.existsSync(requested) || fs.statSync(requested).isDirectory()) {
    return path.join(DIST_DIR, 'index.html')
  }
  return requested
}

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.json': 'application/json',
}

function findMarkdownFiles(dir) {
  const results = []
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) results.push(...findMarkdownFiles(full))
      else if (entry.name.endsWith('.md')) results.push(full)
    }
  } catch {}
  return results
}

function extractWikiLinks(value) {
  if (!value) return []
  const str = Array.isArray(value) ? value.join(' ') : String(value)
  return [...str.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => `[[${m[1]}]]`)
}

function parseMarkdownFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const { data: fm, content } = matter(raw)
    const stat = fs.statSync(filePath)

    const DEDICATED = new Set(['aliases','Is A','Belongs to','Related to','Status','Owner','Cadence','Created at'])
    const relationships = {}
    for (const [k, v] of Object.entries(fm)) {
      if (DEDICATED.has(k)) continue
      const links = extractWikiLinks(v)
      if (links.length) relationships[k] = links
    }

    const bodyText = content.replace(/---[\s\S]*?---/, '').trim()
    const h1 = bodyText.match(/^#\s+(.+)/m)?.[1]
    const aliases = Array.isArray(fm.aliases) ? fm.aliases : fm.aliases ? [fm.aliases] : []

    return {
      path: filePath,
      filename: path.basename(filePath),
      title: h1 || aliases[0] || path.basename(filePath, '.md'),
      isA: fm['Is A'] ?? null,
      aliases,
      belongsTo: extractWikiLinks(fm['Belongs to']),
      relatedTo: extractWikiLinks(fm['Related to']),
      status: fm['Status'] ?? null,
      owner: fm['Owner'] ?? null,
      cadence: fm['Cadence'] ?? null,
      modifiedAt: stat.mtimeMs,
      createdAt: fm['Created at'] ? new Date(fm['Created at']).getTime() : null,
      fileSize: stat.size,
      snippet: bodyText.replace(/^#+\s+.+/gm, '').replace(/\n+/g, ' ').trim().slice(0, 200),
      relationships,
    }
  } catch { return null }
}

function serveVaultApi(url, res) {
  const params = new URL(url, 'http://localhost')

  if (params.pathname === '/api/vault/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
    return true
  }

  if (params.pathname === '/api/vault/list') {
    const dir = params.searchParams.get('path')
    const vaultDir = dir ? allowedVaultPath(dir, 'dir') : null
    if (!vaultDir) {
      res.writeHead(400); res.end(JSON.stringify({ error: 'bad path' })); return true
    }
    const entries = findMarkdownFiles(vaultDir).map(parseMarkdownFile).filter(Boolean)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(entries))
    return true
  }

  if (params.pathname === '/api/vault/content') {
    const file = params.searchParams.get('path')
    const vaultFile = file ? allowedVaultPath(file, 'markdown') : null
    if (!vaultFile) {
      res.writeHead(400); res.end(JSON.stringify({ error: 'bad path' })); return true
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ content: fs.readFileSync(vaultFile, 'utf-8') }))
    return true
  }

  if (params.pathname === '/api/vault/all-content') {
    const dir = params.searchParams.get('path')
    const vaultDir = dir ? allowedVaultPath(dir, 'dir') : null
    if (!vaultDir) {
      res.writeHead(400); res.end(JSON.stringify({ error: 'bad path' })); return true
    }
    const map = {}
    for (const f of findMarkdownFiles(vaultDir)) {
      try { map[f] = fs.readFileSync(f, 'utf-8') } catch {}
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(map))
    return true
  }

  return false
}

const server = http.createServer((req, res) => {
  const url = req.url ?? '/'

  // API routes
  if (url.startsWith('/api/vault/')) {
    if (!serveVaultApi(url, res)) {
      res.writeHead(404); res.end()
    }
    return
  }

  // Static files
  const filePath = resolveStaticPath(url)
  const ext = path.extname(filePath)
  res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' })
  fs.createReadStream(filePath).pipe(res)
})

server.listen(PORT, HOST, () => {
  console.log(`✅ Grimoire demo server running on http://${HOST}:${PORT}`)
  console.log(`   Vault API roots: ${ALLOWED_VAULT_ROOTS.join(', ') || 'none'}`)
  if (HOST === '0.0.0.0') {
    console.warn('⚠️  Public bind enabled by GRIMOIRE_DEMO_PUBLIC=1; vault API remains restricted to allowed demo roots.')
  }
})
