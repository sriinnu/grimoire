/**
 * Project intelligence helpers for Grimoire MCP tools.
 *
 * Project task writes are intentionally stored in Markdown `BOARD.md` files so
 * agents and users see the same durable artifact on disk.
 */
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

const BOARD_FILE = 'BOARD.md'
const DEFAULT_TASK_HEADING = '## Tasks'
const TASK_ID_PATTERN = /<!--\s*grimoire-task:([a-zA-Z0-9_-]+)([^>]*)-->\s*-\s*\[([ xX])\]\s*(.+)/
const TODO_PATTERN = /\b(TODO|FIXME|HACK|NOTE):\s*(.+)$/i

/**
 * List likely project documents with markdown-first roles.
 * @param {string} vaultPath
 * @param {string} folder
 * @returns {Promise<Array<{path: string, title: string, role: string}>>}
 */
export async function listProjectDocs(vaultPath, folder = '') {
  const projectRoot = await resolveProjectRoot(vaultPath, folder)
  const files = await findMarkdownFiles(projectRoot)
  const docs = []

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf-8')
    const parsed = matter(raw)
    const relativePath = path.relative(await fs.realpath(vaultPath), filePath)
    docs.push({
      path: relativePath,
      title: parsed.data.title || extractTitle(raw, path.basename(filePath, '.md')),
      role: classifyDoc(relativePath, raw),
    })
  }

  return docs.sort((a, b) => roleRank(a.role) - roleRank(b.role) || a.path.localeCompare(b.path))
}

/**
 * Read a project's durable board, if one exists.
 * @param {string} vaultPath
 * @param {string} folder
 * @returns {Promise<{path: string, exists: boolean, content: string}>}
 */
export async function readProjectBoard(vaultPath, folder = '') {
  const boardPath = await resolveBoardPath(vaultPath, folder)
  try {
    return {
      path: await relativeToVault(vaultPath, boardPath),
      exists: true,
      content: await fs.readFile(boardPath, 'utf-8'),
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return {
      path: await relativeToVault(vaultPath, boardPath),
      exists: false,
      content: '',
    }
  }
}

/**
 * List persisted board tasks and TODO-like markers found in project docs.
 * @param {string} vaultPath
 * @param {string} folder
 * @returns {Promise<Array<{id: string, title: string, status: string, path: string, line: number, source: string}>>}
 */
export async function listProjectTasks(vaultPath, folder = '') {
  const projectRoot = await resolveProjectRoot(vaultPath, folder)
  const files = await findMarkdownFiles(projectRoot)
  const tasks = []

  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf-8')
    tasks.push(...extractTasks(vaultPath, filePath, content))
  }

  return tasks
}

/**
 * Append a durable board task to `BOARD.md`.
 * @param {string} vaultPath
 * @param {{folder?: string, title: string, status?: string, priority?: string}} args
 * @returns {Promise<{id: string, path: string, task: string}>}
 */
export async function createProjectTask(vaultPath, args) {
  const boardPath = await resolveBoardPath(vaultPath, args.folder || '')
  const id = crypto.randomUUID()
  const checked = normalizeStatus(args.status) === 'done' ? 'x' : ' '
  const suffix = args.priority ? ` #${sanitizeToken(args.priority)}` : ''
  const task = `<!-- grimoire-task:${id} --> - [${checked}] ${args.title.trim()}${suffix}`
  const content = await ensureTaskSection(boardPath)
  await fs.writeFile(boardPath, appendTask(content, task), 'utf-8')

  return {
    id,
    path: await relativeToVault(vaultPath, boardPath),
    task,
  }
}

/**
 * Update a durable board task by id.
 * @param {string} vaultPath
 * @param {{folder?: string, id: string, title?: string, status?: string, priority?: string}} args
 * @returns {Promise<{id: string, path: string, task: string}>}
 */
export async function updateProjectTask(vaultPath, args) {
  return mutateBoardTask(vaultPath, args.folder || '', args.id, (task) => ({
    ...task,
    title: args.title ? args.title.trim() : task.title,
    status: args.status ? normalizeStatus(args.status) : task.status,
    priority: args.priority === undefined ? task.priority : sanitizeToken(args.priority),
  }))
}

/**
 * Delete a durable board task by id.
 * @param {string} vaultPath
 * @param {{folder?: string, id: string}} args
 * @returns {Promise<{id: string, path: string, deleted: boolean}>}
 */
export async function deleteProjectTask(vaultPath, args) {
  const boardPath = await resolveBoardPath(vaultPath, args.folder || '')
  const content = await fs.readFile(boardPath, 'utf-8')
  const lines = content.split('\n')
  const nextLines = lines.filter(line => !line.includes(`grimoire-task:${args.id}`))
  if (nextLines.length === lines.length) throw new Error(`Task not found: ${args.id}`)
  await fs.writeFile(boardPath, nextLines.join('\n'), 'utf-8')
  return { id: args.id, path: await relativeToVault(vaultPath, boardPath), deleted: true }
}

/**
 * Return wikilink edges among project documents.
 * @param {string} vaultPath
 * @param {string} folder
 * @returns {Promise<{nodes: Array<{id: string, title: string}>, edges: Array<{from: string, to: string, label: string}>}>}
 */
export async function projectGraph(vaultPath, folder = '') {
  const docs = await listProjectDocs(vaultPath, folder)
  const nodes = docs.map(doc => ({ id: doc.path, title: doc.title }))
  const aliases = new Map(nodes.flatMap(node => [
    [stripMarkdownExtension(node.id), node.id],
    [path.basename(node.id, '.md'), node.id],
    [node.title, node.id],
  ]))
  const edges = []

  for (const doc of docs) {
    const raw = await fs.readFile(path.join(await fs.realpath(vaultPath), doc.path), 'utf-8')
    for (const target of extractWikilinks(raw)) {
      const resolved = aliases.get(target) || aliases.get(stripMarkdownExtension(target))
      if (resolved) edges.push({ from: doc.path, to: resolved, label: target })
    }
  }

  return { nodes, edges }
}

async function resolveProjectRoot(vaultPath, folder) {
  const vaultRoot = await fs.realpath(vaultPath)
  const projectRoot = path.resolve(vaultRoot, folder || '.')
  const realProjectRoot = await fs.realpath(projectRoot)
  if (!isInside(realProjectRoot, vaultRoot)) throw new Error('Project path must stay inside the active vault')
  return realProjectRoot
}

async function resolveBoardPath(vaultPath, folder) {
  const projectRoot = await resolveProjectRoot(vaultPath, folder)
  return path.join(projectRoot, BOARD_FILE)
}

async function relativeToVault(vaultPath, filePath) {
  return path.relative(await fs.realpath(vaultPath), filePath)
}

async function findMarkdownFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await findMarkdownFiles(fullPath))
    if (entry.isFile() && entry.name.endsWith('.md')) files.push(fullPath)
  }
  return files
}

function extractTasks(vaultPath, filePath, content) {
  return content.split('\n').flatMap((line, index) => {
    const boardTask = TASK_ID_PATTERN.exec(line)
    if (boardTask) return [formatTask(vaultPath, filePath, index, boardTask)]

    const marker = TODO_PATTERN.exec(line)
    if (!marker) return []
    return [{
      id: `${path.basename(filePath)}:${index + 1}`,
      title: marker[2].trim(),
      status: marker[1].toUpperCase() === 'FIXME' ? 'urgent' : 'open',
      path: path.relative(vaultPath, filePath),
      line: index + 1,
      source: marker[1].toUpperCase(),
    }]
  })
}

function formatTask(vaultPath, filePath, index, match) {
  const metadata = parseTaskMetadata(match[2])
  const title = match[4].trim()
  return {
    id: match[1],
    title: title.replace(/\s+#[^\s#]+$/, ''),
    status: match[3].toLowerCase() === 'x' ? 'done' : 'open',
    priority: metadata.priority || extractPriority(title),
    path: path.relative(vaultPath, filePath),
    line: index + 1,
    source: metadata.source || 'BOARD',
    sourceFile: metadata.sourceFile || null,
    sourceLine: metadata.sourceLine || null,
  }
}

function appendTask(content, task) {
  if (content.includes(DEFAULT_TASK_HEADING)) return `${content.trimEnd()}\n${task}\n`
  return `${content.trimEnd()}\n\n${DEFAULT_TASK_HEADING}\n${task}\n`
}

async function ensureTaskSection(boardPath) {
  try {
    return await fs.readFile(boardPath, 'utf-8')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    await fs.mkdir(path.dirname(boardPath), { recursive: true })
    return '# Project Board\n\n## Overview\n\n'
  }
}

async function mutateBoardTask(vaultPath, folder, id, mutate) {
  const boardPath = await resolveBoardPath(vaultPath, folder)
  const lines = (await fs.readFile(boardPath, 'utf-8')).split('\n')
  let updatedTask = null
  const nextLines = lines.map((line) => {
    const match = TASK_ID_PATTERN.exec(line)
    if (!match || match[1] !== id) return line
    const current = parseBoardLine(match)
    updatedTask = mutate(current)
    return renderBoardTask(id, updatedTask)
  })
  if (!updatedTask) throw new Error(`Task not found: ${id}`)
  await fs.writeFile(boardPath, nextLines.join('\n'), 'utf-8')
  return { id, path: await relativeToVault(vaultPath, boardPath), task: renderBoardTask(id, updatedTask) }
}

function parseBoardLine(match) {
  const metadata = parseTaskMetadata(match[2])
  const title = match[4].trim()
  return {
    title: title.replace(/\s+#[^\s#]+$/, ''),
    status: match[3].toLowerCase() === 'x' ? 'done' : 'open',
    priority: metadata.priority || extractPriority(title),
  }
}

function renderBoardTask(id, task) {
  const checked = task.status === 'done' ? 'x' : ' '
  const priority = task.priority ? ` #${sanitizeToken(task.priority)}` : ''
  return `<!-- grimoire-task:${id} --> - [${checked}] ${task.title}${priority}`
}

function classifyDoc(relativePath, content) {
  const lower = relativePath.toLowerCase()
  if (lower.endsWith('/board.md') || lower === 'board.md') return 'board'
  if (lower.includes('readme')) return 'readme'
  if (lower.includes('architecture') || lower.includes('adr/')) return 'architecture'
  if (lower.includes('spec') || lower.includes('requirements')) return 'spec'
  if (lower.includes('todo') || content.match(TODO_PATTERN)) return 'tasks'
  if (lower.includes('review') || lower.includes('retro')) return 'review'
  return 'note'
}

function roleRank(role) {
  return ['readme', 'architecture', 'spec', 'tasks', 'board', 'review', 'note'].indexOf(role)
}

function extractTitle(content, fallback) {
  const h1 = content.match(/^#\s+(.+)$/m)
  return h1 ? h1[1].trim() : fallback
}

function extractWikilinks(content) {
  return [...content.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map(match => match[1].trim())
}

function stripMarkdownExtension(value) {
  return value.replace(/\.md$/i, '')
}

function extractPriority(title) {
  return title.match(/\s+#([^\s#]+)$/)?.[1] || null
}

function normalizeStatus(status = 'open') {
  return status.toLowerCase() === 'done' ? 'done' : 'open'
}

function sanitizeToken(value) {
  return String(value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '-')
}

function parseTaskMetadata(rawMetadata = '') {
  const metadata = {}
  for (const token of rawMetadata.trim().split(/\s+/).filter(Boolean)) {
    const [key, ...rest] = token.split(':')
    const value = rest.join(':')
    if (!key || !value) continue
    if (key === 'source-file') metadata.sourceFile = decodeURIComponent(value)
    if (key === 'source-line') metadata.sourceLine = Number.parseInt(value, 10) || null
    if (key === 'priority') metadata.priority = sanitizeToken(value)
    if (key === 'source') metadata.source = sanitizeToken(value).toUpperCase()
  }
  return metadata
}

function isInside(child, parent) {
  const relativePath = path.relative(parent, child)
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
}
