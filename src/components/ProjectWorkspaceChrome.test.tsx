import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../types'
import type { GrimoireProjectDocument } from '../project-intelligence/grimoireAdapter'
import { ProjectWorkspaceChrome } from './ProjectWorkspaceChrome'

function entry(path: string, title: string): VaultEntry {
  return {
    aliases: [],
    archived: false,
    belongsTo: [],
    color: null,
    createdAt: null,
    favorite: false,
    favoriteIndex: null,
    fileSize: 0,
    filename: path.split('/').pop() ?? 'README.md',
    hasH1: true,
    icon: null,
    isA: 'Note',
    listPropertiesDisplay: [],
    modifiedAt: null,
    order: null,
    organized: false,
    outgoingLinks: [],
    path,
    properties: {},
    relatedTo: [],
    relationships: {},
    sidebarLabel: null,
    snippet: '',
    sort: null,
    status: null,
    template: null,
    title,
    view: null,
    visible: null,
    wordCount: 0,
  }
}

function document(relativePath: string): GrimoireProjectDocument {
  return {
    entry: entry(`/vault/${relativePath}`, 'README'),
    kind: 'readme',
    preview: '',
    relativePath,
    title: 'README',
    updatedAt: 1,
  }
}

describe('ProjectWorkspaceChrome', () => {
  it('adds parent folder context to repeated README chips', () => {
    render(
      <ProjectWorkspaceChrome
        boardAvailable={false}
        canCreateDoc={true}
        copiedBoard={false}
        createdDoc={null}
        documents={[
          document('backend/README.md'),
          document('frontend/rashmi/README.md'),
        ]}
        graphOpen={false}
        includeSource={false}
        loading={false}
        markdownCount={2}
        onCopyBoard={vi.fn()}
        onCreateDoc={vi.fn()}
        onPreviewBoard={vi.fn()}
        onQueryChange={vi.fn()}
        onSaveBoard={vi.fn()}
        onScan={vi.fn()}
        onSelectNote={vi.fn()}
        onToggleGraph={vi.fn()}
        onToggleSource={vi.fn()}
        onToggleTasks={vi.fn()}
        otherCount={0}
        query=""
        savedBoard={false}
        scanEnabled={false}
        skippedCount={0}
        scopeLabel="frontend / rashmi"
        taskCount={0}
        tasksOpen={false}
        urgentCount={0}
      />,
    )

    expect(screen.getByRole('button', { name: 'README / backend' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'README / rashmi' })).toBeInTheDocument()
  })

  it('shows the selected project scope beside the metrics rail', () => {
    render(
      <ProjectWorkspaceChrome
        boardAvailable={false}
        canCreateDoc={true}
        copiedBoard={false}
        createdDoc={null}
        documents={[]}
        graphOpen={false}
        includeSource={false}
        loading={false}
        markdownCount={2}
        onCopyBoard={vi.fn()}
        onCreateDoc={vi.fn()}
        onPreviewBoard={vi.fn()}
        onQueryChange={vi.fn()}
        onSaveBoard={vi.fn()}
        onScan={vi.fn()}
        onSelectNote={vi.fn()}
        onToggleGraph={vi.fn()}
        onToggleSource={vi.fn()}
        onToggleTasks={vi.fn()}
        otherCount={1}
        query=""
        savedBoard={false}
        scanEnabled={false}
        skippedCount={0}
        scopeLabel="astral / frontend / rashmi / elena"
        taskCount={0}
        tasksOpen={false}
        urgentCount={0}
      />,
    )

    expect(screen.getByText('Project')).toBeInTheDocument()
    expect(screen.getByText('astral / frontend / rashmi / elena')).toBeInTheDocument()
  })
})
