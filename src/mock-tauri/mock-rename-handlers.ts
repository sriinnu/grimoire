import { MOCK_CONTENT } from './mock-content'
import { MOCK_ENTRIES } from './mock-entries'

function syncWindowContent(): void {
  if (typeof window !== 'undefined') {
    window.__mockContent = MOCK_CONTENT
  }
}

function escapeRegex({ text }: { text: string }) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function relativePathStem({ path, vaultPath }: { path: string; vaultPath: string }) {
  const prefix = vaultPath.endsWith('/') ? vaultPath : `${vaultPath}/`
  if (path.startsWith(prefix)) return path.slice(prefix.length).replace(/\.md$/, '')
  return (path.split('/').pop() ?? path).replace(/\.md$/, '')
}

function canonicalRenameTargets({ oldTitle, oldPathStem }: { oldTitle: string; oldPathStem: string }) {
  const oldFilenameStem = oldPathStem.split('/').pop() ?? oldPathStem
  return [...new Set([oldTitle, oldPathStem, oldFilenameStem].filter(Boolean))]
}

function slugifyMockTitle({ title }: { title: string }) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function buildRenamedMockPath({ oldPath, newTitle }: { oldPath: string; newTitle: string }) {
  const parentDir = oldPath.replace(/\/[^/]+$/, '')
  return `${parentDir}/${slugifyMockTitle({ title: newTitle })}.md`
}

function replaceMockTitleFrontmatter({ content, newTitle }: { content: string; newTitle: string }) {
  return /^title:\s*/m.test(content)
    ? content.replace(/^title:\s*.*$/m, `title: ${newTitle}`)
    : content
}

function replaceRenamedWikilinks({ content, oldTargets, newPathStem }: {
  content: string
  oldTargets: string[]
  newPathStem: string
}) {
  if (oldTargets.length === 0) return content
  const pattern = new RegExp(`\\[\\[(?:${oldTargets.map((target) => escapeRegex({ text: target })).join('|')})(\\|[^\\]]*?)?\\]\\]`, 'g')
  return content.replace(pattern, (_match: string, pipe: string | undefined) =>
    pipe ? `[[${newPathStem}${pipe}]]` : `[[${newPathStem}]]`
  )
}

function updateMockRenameReferences({ newPath, newPathStem, oldTargets }: {
  newPath: string
  newPathStem: string
  oldTargets: string[]
}) {
  let updatedFiles = 0
  for (const [path, content] of Object.entries(MOCK_CONTENT)) {
    if (path === newPath) continue
    const replaced = replaceRenamedWikilinks({ content, oldTargets, newPathStem })
    if (replaced === content) continue
    MOCK_CONTENT[path] = replaced
    updatedFiles += 1
  }
  return updatedFiles
}

/** Mock implementation of the backend title rename command. */
export function handleRenameNote(args: { vault_path: string; old_path: string; new_title: string; old_title?: string | null }) {
  const oldEntry = MOCK_ENTRIES.find(e => e.path === args.old_path)
  const oldTitle = args.old_title ?? oldEntry?.title ?? ''
  const oldContent = MOCK_CONTENT[args.old_path] ?? ''
  const newPath = buildRenamedMockPath({ oldPath: args.old_path, newTitle: args.new_title })
  const oldPathStem = relativePathStem({ path: args.old_path, vaultPath: args.vault_path })
  const newPathStem = relativePathStem({ path: newPath, vaultPath: args.vault_path })

  if (oldTitle === args.new_title && newPath === args.old_path) {
    return { new_path: args.old_path, updated_files: 0, failed_updates: 0 }
  }

  const newContent = replaceMockTitleFrontmatter({ content: oldContent, newTitle: args.new_title })
  delete MOCK_CONTENT[args.old_path]
  MOCK_CONTENT[newPath] = newContent
  const oldTargets = canonicalRenameTargets({ oldTitle, oldPathStem })
  const updatedFiles = updateMockRenameReferences({ newPath, newPathStem, oldTargets })

  syncWindowContent()
  return { new_path: newPath, updated_files: updatedFiles, failed_updates: 0 }
}

/** Mock implementation of the backend filename rename command. */
export function handleRenameNoteFilename(args: {
  vault_path: string
  old_path: string
  new_filename_stem: string
}) {
  const oldEntry = MOCK_ENTRIES.find(e => e.path === args.old_path)
  const oldContent = MOCK_CONTENT[args.old_path] ?? ''
  const oldTitle = oldEntry?.title ?? ''
  const normalizedStem = args.new_filename_stem.trim().replace(/\.md$/, '')
  const oldFilename = args.old_path.split('/').pop() ?? ''
  const newFilename = `${normalizedStem}.md`

  if (!normalizedStem) {
    throw new Error('Invalid filename')
  }
  if (oldFilename === newFilename) {
    return { new_path: args.old_path, updated_files: 0, failed_updates: 0 }
  }

  const parentDir = args.old_path.replace(/\/[^/]+$/, '')
  const newPath = `${parentDir}/${newFilename}`
  if (newPath !== args.old_path && Object.prototype.hasOwnProperty.call(MOCK_CONTENT, newPath)) {
    throw new Error('A note with that name already exists')
  }

  delete MOCK_CONTENT[args.old_path]
  MOCK_CONTENT[newPath] = oldContent

  const oldPathStem = relativePathStem({ path: args.old_path, vaultPath: args.vault_path })
  const newPathStem = relativePathStem({ path: newPath, vaultPath: args.vault_path })
  const oldTargets = canonicalRenameTargets({ oldTitle, oldPathStem })
  const updatedFiles = updateMockRenameReferences({ newPath, newPathStem, oldTargets })

  syncWindowContent()
  return { new_path: newPath, updated_files: updatedFiles, failed_updates: 0 }
}

/** Mock implementation of moving a note file into another vault folder. */
export function handleMoveNoteToFolder(args: {
  vault_path: string
  old_path: string
  folder_path: string
}) {
  const oldEntry = MOCK_ENTRIES.find(e => e.path === args.old_path)
  const oldContent = MOCK_CONTENT[args.old_path] ?? ''
  const oldTitle = oldEntry?.title ?? ''
  const oldFilename = args.old_path.split('/').pop() ?? ''
  const normalizedFolderPath = args.folder_path.trim().replace(/^\/+|\/+$/g, '')

  if (!normalizedFolderPath) {
    throw new Error('Folder path cannot be empty')
  }

  const vaultRoot = args.vault_path.replace(/\/+$/, '')
  const newPath = `${vaultRoot}/${normalizedFolderPath}/${oldFilename}`
  if (newPath === args.old_path) {
    return { new_path: args.old_path, updated_files: 0, failed_updates: 0 }
  }
  if (Object.prototype.hasOwnProperty.call(MOCK_CONTENT, newPath)) {
    throw new Error('A note with that name already exists')
  }

  delete MOCK_CONTENT[args.old_path]
  MOCK_CONTENT[newPath] = oldContent

  const oldPathStem = relativePathStem({ path: args.old_path, vaultPath: args.vault_path })
  const newPathStem = relativePathStem({ path: newPath, vaultPath: args.vault_path })
  const oldTargets = canonicalRenameTargets({ oldTitle, oldPathStem })
  const updatedFiles = updateMockRenameReferences({ newPath, newPathStem, oldTargets })

  syncWindowContent()
  return { new_path: newPath, updated_files: updatedFiles, failed_updates: 0 }
}
