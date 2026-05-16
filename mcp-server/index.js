#!/usr/bin/env node
/**
 * Grimoire MCP Server — lightweight vault tools for AI agents.
 *
 * The agent has full shell access (bash, read, write, edit).
 * These MCP tools provide Grimoire-specific capabilities that
 * native tools cannot replace:
 *
 *   - search_notes: full-text search across vault notes
 *   - get_vault_context: vault structure overview (types, note count, folders)
 *   - get_note: parsed frontmatter + content (convenience over raw cat)
 *   - open_note: signal Grimoire UI to open a note as a tab
 *   - highlight_editor: visually highlight a UI element (editor, tab, etc.)
 *   - refresh_vault: trigger vault rescan so new/modified files appear
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import WebSocket from 'ws'
import { searchNotes, getNote, vaultContext } from './vault.js'
import {
  createProjectTask,
  deleteProjectTask,
  listProjectDocs,
  listProjectTasks,
  projectGraph,
  readProjectBoard,
  updateProjectTask,
} from './project-intelligence.js'

const VAULT_PATH = process.env.VAULT_PATH || process.env.HOME + '/Grimoire'
const WS_UI_PORT = parseInt(process.env.WS_UI_PORT || '9711', 10)
const WS_UI_URL = `ws://localhost:${WS_UI_PORT}`

// Connect as a WebSocket CLIENT to the UI bridge (run by ws-bridge.js).
// The bridge relays messages to all other clients (the React frontend).
let uiSocket = null
const RECONNECT_INTERVAL_MS = 3000

function connectUiBridge() {
  try {
    const ws = new WebSocket(WS_UI_URL)
    ws.on('open', () => {
      uiSocket = ws
      console.error(`[mcp] Connected to UI bridge at ${WS_UI_URL}`)
    })
    ws.on('close', () => {
      uiSocket = null
      setTimeout(connectUiBridge, RECONNECT_INTERVAL_MS)
    })
    ws.on('error', () => {
      // Silent — bridge may not be running yet, will retry
    })
  } catch {
    setTimeout(connectUiBridge, RECONNECT_INTERVAL_MS)
  }
}
connectUiBridge()

function broadcastUiAction(action, payload) {
  if (!uiSocket || uiSocket.readyState !== WebSocket.OPEN) return
  uiSocket.send(JSON.stringify({ type: 'ui_action', action, ...payload }))
}

const TOOLS = [
  {
    name: 'search_notes',
    description: 'Full-text search across vault notes by title or content. Returns matching paths, titles, and snippets.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query string' },
        limit: { type: 'number', description: 'Maximum number of results (default: 10)' },
        allowLocalOnly: { type: 'boolean', description: 'Explicit one-call override for protected local-only notes' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_vault_context',
    description: 'Get vault orientation: entity types, total note count, top-level folders, and 20 most recently modified notes.',
    inputSchema: {
      type: 'object',
      properties: {
        allowLocalOnly: { type: 'boolean', description: 'Explicit one-call override for protected local-only notes' },
      },
    },
  },
  {
    name: 'get_note',
    description: 'Read a note with parsed YAML frontmatter and markdown content. Returns {path, frontmatter, content}.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the note (e.g. "project/my-project.md")' },
        allowLocalOnly: { type: 'boolean', description: 'Explicit one-call override for protected local-only notes' },
      },
      required: ['path'],
    },
  },
  {
    name: 'open_note',
    description: 'Open a note in the Grimoire UI as a new tab. Use after creating or editing a note so the user can see it.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the note' },
      },
      required: ['path'],
    },
  },
  {
    name: 'highlight_editor',
    description: 'Visually highlight a UI element in Grimoire (editor, tab, properties panel, or note list). The highlight auto-clears after a short delay.',
    inputSchema: {
      type: 'object',
      properties: {
        element: { type: 'string', enum: ['editor', 'tab', 'properties', 'notelist'], description: 'Which UI element to highlight' },
        path: { type: 'string', description: 'Optional note path to associate with the highlight' },
      },
      required: ['element'],
    },
  },
  {
    name: 'refresh_vault',
    description: 'Trigger a vault rescan so new or modified files appear immediately in the Grimoire note list.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Optional specific note path that changed' },
      },
    },
  },
  {
    name: 'list_project_docs',
    description: 'List Markdown docs in a project/folder with roles like readme, architecture, spec, tasks, board, and review.',
    inputSchema: projectFolderSchema(),
  },
  {
    name: 'read_project_board',
    description: 'Read the durable Markdown BOARD.md for a project/folder.',
    inputSchema: projectFolderSchema(),
  },
  {
    name: 'list_project_tasks',
    description: 'List persisted BOARD.md tasks and TODO/FIXME/HACK/NOTE markers found in project Markdown docs.',
    inputSchema: projectFolderSchema(),
  },
  {
    name: 'create_project_task',
    description: 'Append a durable Markdown task to a project/folder BOARD.md file.',
    inputSchema: {
      type: 'object',
      properties: {
        folder: { type: 'string', description: 'Project folder relative to the vault root' },
        title: { type: 'string', description: 'Task title' },
        status: { type: 'string', enum: ['open', 'done'], description: 'Task status' },
        priority: { type: 'string', description: 'Optional priority token, such as p1 or urgent' },
        allowLocalOnly: { type: 'boolean', description: 'Explicit one-call override for protected local-only project boards' },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_project_task',
    description: 'Update a durable Markdown task in project/folder BOARD.md by Grimoire task id.',
    inputSchema: {
      type: 'object',
      properties: {
        folder: { type: 'string', description: 'Project folder relative to the vault root' },
        id: { type: 'string', description: 'Task id from list_project_tasks or create_project_task' },
        title: { type: 'string', description: 'Replacement task title' },
        status: { type: 'string', enum: ['open', 'done'], description: 'Replacement task status' },
        priority: { type: 'string', description: 'Replacement priority token, or empty string to clear' },
        allowLocalOnly: { type: 'boolean', description: 'Explicit one-call override for protected local-only project boards' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_project_task',
    description: 'Delete a durable Markdown task from project/folder BOARD.md by Grimoire task id.',
    inputSchema: {
      type: 'object',
      properties: {
        folder: { type: 'string', description: 'Project folder relative to the vault root' },
        id: { type: 'string', description: 'Task id from list_project_tasks or create_project_task' },
        allowLocalOnly: { type: 'boolean', description: 'Explicit one-call override for protected local-only project boards' },
      },
      required: ['id'],
    },
  },
  {
    name: 'project_graph',
    description: 'Return project Markdown nodes and wikilink edges for graph/navigation use.',
    inputSchema: projectFolderSchema(),
  },
]

const TOOL_HANDLERS = {
  search_notes: handleSearchNotes,
  get_vault_context: handleVaultContext,
  get_note: handleGetNote,
  open_note: handleOpenNote,
  highlight_editor: handleHighlightEditor,
  refresh_vault: handleRefreshVault,
  list_project_docs: handleListProjectDocs,
  read_project_board: handleReadProjectBoard,
  list_project_tasks: handleListProjectTasks,
  create_project_task: handleCreateProjectTask,
  update_project_task: handleUpdateProjectTask,
  delete_project_task: handleDeleteProjectTask,
  project_graph: handleProjectGraph,
}

async function handleSearchNotes(args) {
  const results = await searchNotes(VAULT_PATH, args.query, args.limit, { allowLocalOnly: args.allowLocalOnly })
  const text = results.length === 0
    ? 'No matching notes found.'
    : results.map(r => `**${r.title}** (${r.path})\n${r.snippet}`).join('\n\n')
  return { content: [{ type: 'text', text }] }
}

async function handleVaultContext(args = {}) {
  const ctx = await vaultContext(VAULT_PATH, { allowLocalOnly: args.allowLocalOnly })
  return { content: [{ type: 'text', text: JSON.stringify(ctx, null, 2) }] }
}

async function handleGetNote(args) {
  const note = await getNote(VAULT_PATH, args.path, { allowLocalOnly: args.allowLocalOnly })
  return { content: [{ type: 'text', text: JSON.stringify(note, null, 2) }] }
}

function handleOpenNote(args) {
  // Refresh vault first so the new/modified note appears in the note list,
  // then signal the UI to open it in a tab.
  broadcastUiAction('vault_changed', { path: args.path })
  broadcastUiAction('open_tab', { path: args.path })
  return { content: [{ type: 'text', text: `Opening ${args.path} in Grimoire` }] }
}

function handleHighlightEditor(args) {
  broadcastUiAction('highlight', { element: args.element, path: args.path })
  return { content: [{ type: 'text', text: `Highlighting ${args.element}` }] }
}

function handleRefreshVault(args) {
  broadcastUiAction('vault_changed', { path: args?.path })
  return { content: [{ type: 'text', text: 'Vault refresh triggered' }] }
}

async function handleListProjectDocs(args = {}) {
  return jsonToolResponse(await listProjectDocs(VAULT_PATH, args.folder, { allowLocalOnly: args.allowLocalOnly }))
}

async function handleReadProjectBoard(args = {}) {
  return jsonToolResponse(await readProjectBoard(VAULT_PATH, args.folder, { allowLocalOnly: args.allowLocalOnly }))
}

async function handleListProjectTasks(args = {}) {
  return jsonToolResponse(await listProjectTasks(VAULT_PATH, args.folder, { allowLocalOnly: args.allowLocalOnly }))
}

async function handleCreateProjectTask(args) {
  const result = await createProjectTask(VAULT_PATH, args)
  broadcastUiAction('vault_changed', { path: result.path })
  return jsonToolResponse(result)
}

async function handleUpdateProjectTask(args) {
  const result = await updateProjectTask(VAULT_PATH, args)
  broadcastUiAction('vault_changed', { path: result.path })
  return jsonToolResponse(result)
}

async function handleDeleteProjectTask(args) {
  const result = await deleteProjectTask(VAULT_PATH, args)
  broadcastUiAction('vault_changed', { path: result.path })
  return jsonToolResponse(result)
}

async function handleProjectGraph(args = {}) {
  return jsonToolResponse(await projectGraph(VAULT_PATH, args.folder, { allowLocalOnly: args.allowLocalOnly }))
}

function projectFolderSchema() {
  return {
    type: 'object',
    properties: {
      folder: { type: 'string', description: 'Project folder relative to the vault root. Empty means the vault root.' },
      allowLocalOnly: { type: 'boolean', description: 'Explicit one-call override for protected local-only project docs' },
    },
  }
}

function jsonToolResponse(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] }
}

// --- Server setup ---

const server = new Server(
  { name: 'grimoire-mcp-server', version: '0.3.0' },
  { capabilities: { tools: {} } },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  const handler = TOOL_HANDLERS[name]
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`)
  }
  try {
    return await handler(args)
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    }
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error(`Grimoire MCP server running (vault: ${VAULT_PATH})`)
}

main().catch(console.error)
