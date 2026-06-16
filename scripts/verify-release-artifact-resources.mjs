import { existsSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const REQUIRED_APP_RESOURCE_FILES = [
  { label: 'starter vault manifest', path: 'starter-vault/.fixture-manifest.json' },
  { label: 'starter vault entry note', path: 'starter-vault/grimoire-start-here.md' },
  { label: 'starter vault type fixture', path: 'starter-vault/type/project.md' },
  { label: 'starter vault saved view fixture', path: 'starter-vault/views/active-projects.yml' },
  { label: 'starter vault attachment fixture', path: 'starter-vault/attachments/grimoire-reference.png' },
  { label: 'MCP server entrypoint', path: 'mcp-server/index.js' },
  { label: 'MCP WebSocket bridge', path: 'mcp-server/ws-bridge.js' },
  { label: 'MCP package manifest', path: 'mcp-server/package.json' },
]

function formatPath(path) {
  const relativePath = relative(process.cwd(), path)
  return relativePath.startsWith('..') ? path : relativePath
}

function assertRequiredFile(path, label) {
  if (!existsSync(path)) throw new Error(`${label} is missing: ${formatPath(path)}`)
  if (!statSync(path).isFile()) throw new Error(`${label} is not a file: ${formatPath(path)}`)
  if (statSync(path).size === 0) throw new Error(`${label} is empty: ${formatPath(path)}`)
}

/**
 * Verifies resources that packaged Grimoire apps need for offline onboarding and AI bridge startup.
 */
export function assertRequiredAppResources(appPath) {
  const resourceRoot = join(appPath, 'Contents/Resources')
  for (const resource of REQUIRED_APP_RESOURCE_FILES) {
    assertRequiredFile(join(resourceRoot, resource.path), resource.label)
  }
}
