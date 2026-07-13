import { useCallback, useMemo } from 'react'
import { useBulkActions } from '../hooks/useBulkActions'
import { useGitHistory } from '../hooks/useGitHistory'
import { planNewTypeCreation, slugify } from '../hooks/useNoteCreation'
import { trackEvent } from '../lib/telemetry'
import type { ViewDefinition } from '../types'
import { invokeAppCommand } from './appRuntimeSupport'
import type { GitWorkflow } from './useGitWorkflow'
import type { NoteWorkspace } from './useNoteWorkspace'
import type { VaultFoundation } from './useVaultFoundation'

export function useKnowledgeOrganization(
  foundation: VaultFoundation,
  workspace: NoteWorkspace,
  gitWorkflow: GitWorkflow,
) {
  const {
    dialogs, handleSetSelection, isGitVault, layout, resolvedPath, selection, setToastMessage,
    showAIChat, vault,
  } = foundation
  const { notes } = workspace
  const { entryActions } = gitWorkflow
  const shouldLoadGitHistory = isGitVault && !layout.inspectorCollapsed && !showAIChat
  const gitHistory = useGitHistory(notes.activeTabPath, vault.loadGitHistory, shouldLoadGitHistory)
  const handleCreateType = useCallback(async (name: string, icon?: string) => {
    const created = await notes.handleCreateType(name)
    if (created && icon) {
      await notes.handleUpdateFrontmatter(`${resolvedPath}/${slugify(name)}.md`, 'icon', icon)
    }
    if (created) setToastMessage(`Type "${name}" created`)
    return created
  }, [notes, resolvedPath, setToastMessage])

  const handleCreateMissingType = useCallback(async (path: string, missingType: string, nextTypeName: string) => {
    const trimmed = nextTypeName.trim()
    if (!trimmed) return false

    const plan = planNewTypeCreation({ entries: vault.entries, typeName: trimmed, vaultPath: resolvedPath })
    if (plan.status === 'blocked') {
      setToastMessage(plan.message)
      return false
    }

    let resolvedTypeName = plan.status === 'existing' ? plan.entry.title : trimmed

    if (plan.status === 'create') {
      try {
        resolvedTypeName = (await notes.createTypeEntrySilent(trimmed)).title
      } catch {
        return false
      }
    }

    await notes.handleUpdateFrontmatter(path, 'type', resolvedTypeName)
    setToastMessage(
      plan.status === 'create' && resolvedTypeName === missingType
        ? `Type "${resolvedTypeName}" created`
        : `Type set to "${resolvedTypeName}"`,
    )
    return true
  }, [notes, resolvedPath, setToastMessage, vault.entries])

  const handleCreateOrUpdateView = useCallback(async (definition: ViewDefinition) => {
    const editing = dialogs.editingView
    const filename = editing
      ? editing.filename
      : definition.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '.yml'
    const nextDefinition = editing ? { ...editing.definition, ...definition } : definition
    await invokeAppCommand('save_view_cmd', { vaultPath: resolvedPath, filename, definition: nextDefinition })
    trackEvent(editing ? 'view_updated' : 'view_created')
    await vault.reloadViews()
    await vault.reloadVault()
    vault.reloadFolders()
    setToastMessage(editing ? `View "${nextDefinition.name}" updated` : `View "${nextDefinition.name}" created`)
    handleSetSelection({ kind: 'view', filename })
  }, [resolvedPath, vault, handleSetSelection, dialogs.editingView, setToastMessage])

  const handleUpdateViewDefinition = useCallback(async (filename: string, patch: Partial<ViewDefinition>) => {
    const existing = vault.views.find((view) => view.filename === filename)
    if (!existing) return

    await invokeAppCommand('save_view_cmd', {
      vaultPath: resolvedPath,
      filename,
      definition: { ...existing.definition, ...patch },
    })
    await vault.reloadViews()
  }, [resolvedPath, vault])

  const handleEditView = useCallback((filename: string) => {
    const view = vault.views.find((v) => v.filename === filename)
    if (view) dialogs.openEditView(filename, view.definition)
  }, [vault.views, dialogs])

  const handleDeleteView = useCallback(async (filename: string) => {
    await invokeAppCommand('delete_view_cmd', { vaultPath: resolvedPath, filename })
    await vault.reloadViews()
    await vault.reloadVault()
    vault.reloadFolders()
    if (selection.kind === 'view' && selection.filename === filename) {
      handleSetSelection({ kind: 'filter', filter: 'all' })
    }
    setToastMessage('View deleted')
  }, [resolvedPath, vault, selection, handleSetSelection, setToastMessage])

  const availableFields = useMemo(() => {
    const builtIn = ['type', 'status', 'title', 'favorite', 'body']
    if (!vault.entries?.length) return builtIn
    const customFields = new Set<string>()
    for (const e of vault.entries) {
      if (e.properties) {
        for (const key of Object.keys(e.properties)) customFields.add(key)
      }
      if (e.relationships) {
        for (const key of Object.keys(e.relationships)) customFields.add(key)
      }
    }
    return [...builtIn, ...Array.from(customFields).sort()]
  }, [vault.entries])

  const bulkActions = useBulkActions(entryActions, vault.entries, setToastMessage)

  return {
    gitHistory, handleCreateType, handleCreateMissingType, handleCreateOrUpdateView,
    handleUpdateViewDefinition, handleEditView, handleDeleteView, availableFields, bulkActions,
  }
}

export type KnowledgeOrganization = ReturnType<typeof useKnowledgeOrganization>
