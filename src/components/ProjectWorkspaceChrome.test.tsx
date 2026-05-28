import { fireEvent, render, screen, within } from '@testing-library/react'
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
        onRevealProjectDocs={vi.fn()}
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

  it('shows the selected project scope as breadcrumbs beside the metrics rail', () => {
    render(
      <ProjectWorkspaceChrome
        boardAvailable={false}
        canCreateDoc={true}
        copiedBoard={false}
        createdDoc={null}
        documents={[]}
        filterNode={<div data-testid="project-filter-node">Filters</div>}
        graphOpen={false}
        includeSource={false}
        loading={false}
        markdownCount={2}
        onCopyBoard={vi.fn()}
        onCreateDoc={vi.fn()}
        onPreviewBoard={vi.fn()}
        onQueryChange={vi.fn()}
        onRevealProjectDocs={vi.fn()}
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
    expect(screen.getByLabelText('Project astral / frontend / rashmi / elena')).toBeInTheDocument()
    expect(screen.getByTestId('project-scope-breadcrumb')).toHaveTextContent('astral/frontend/rashmi/elena')
    const controls = screen.getByLabelText('Project workspace controls')
    expect(within(controls).getByLabelText('Search project docs')).toBeInTheDocument()
    expect(within(controls).getByLabelText('Project actions')).toBeInTheDocument()
    expect(screen.getByTestId('project-workspace-filters')).toContainElement(screen.getByTestId('project-filter-node'))
  })

  it('uses docs and source language for project metrics', () => {
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
        markdownCount={8}
        onCopyBoard={vi.fn()}
        onCreateDoc={vi.fn()}
        onPreviewBoard={vi.fn()}
        onQueryChange={vi.fn()}
        onRevealProjectDocs={vi.fn()}
        onSaveBoard={vi.fn()}
        onScan={vi.fn()}
        onSelectNote={vi.fn()}
        onToggleGraph={vi.fn()}
        onToggleSource={vi.fn()}
        onToggleTasks={vi.fn()}
        otherCount={42}
        query=""
        savedBoard={false}
        scanEnabled={false}
        skippedCount={3}
        scopeLabel="astral / frontend"
        taskCount={0}
        tasksOpen={false}
        urgentCount={0}
      />,
    )

    const metrics = screen.getByLabelText('Project metrics')
    expect(within(metrics).getByLabelText('8 Markdown documents')).toHaveTextContent('8 docs')
    expect(within(metrics).getByLabelText('42 source or non-Markdown files')).toHaveTextContent('42 source')
    expect(within(metrics).getByLabelText('3 files skipped by project scan policy')).toHaveTextContent('3 skipped')
  })

  it('keeps keyboard order aligned with the visual search-to-filters-to-docs cockpit', () => {
    render(
      <ProjectWorkspaceChrome
        boardAvailable={false}
        canCreateDoc={true}
        copiedBoard={false}
        createdDoc={null}
        documents={[document('docs/README.md')]}
        filterNode={<div data-testid="project-filter-node">Filters</div>}
        graphOpen={false}
        includeSource={false}
        loading={false}
        markdownCount={2}
        onCopyBoard={vi.fn()}
        onCreateDoc={vi.fn()}
        onPreviewBoard={vi.fn()}
        onQueryChange={vi.fn()}
        onRevealProjectDocs={vi.fn()}
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
        scopeLabel="astral / frontend"
        taskCount={0}
        tasksOpen={false}
        urgentCount={0}
      />,
    )

    const search = screen.getByLabelText('Search project docs')
    const filters = screen.getByTestId('project-workspace-filters')
    const docs = screen.getByTestId('project-document-rail')

    expect(search.compareDocumentPosition(filters)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(filters.compareDocumentPosition(docs)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('keeps the project document rail inside the main control cockpit', () => {
    render(
      <ProjectWorkspaceChrome
        boardAvailable={false}
        canCreateDoc={true}
        copiedBoard={false}
        createdDoc={null}
        documents={[document('docs/README.md')]}
        graphOpen={false}
        includeSource={false}
        loading={false}
        markdownCount={2}
        onCopyBoard={vi.fn()}
        onCreateDoc={vi.fn()}
        onPreviewBoard={vi.fn()}
        onQueryChange={vi.fn()}
        onRevealProjectDocs={vi.fn()}
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
        scopeLabel="astral / frontend"
        taskCount={0}
        tasksOpen={false}
        urgentCount={0}
      />,
    )

    expect(screen.getByLabelText('Project workspace controls')).toContainElement(screen.getByTestId('project-document-rail'))
  })

  it('caps the project document rail so noisy folders stay compact', () => {
    render(
      <ProjectWorkspaceChrome
        boardAvailable={false}
        canCreateDoc={true}
        copiedBoard={false}
        createdDoc={null}
        documents={[
          document('docs/README.md'),
          document('backend/README.md'),
          document('frontend/README.md'),
          document('frontend/rashmi/README.md'),
          document('frontend/rashmi/elena/README.md'),
          document('frontend/rashmi/elena/todo.md'),
          document('frontend/rashmi/elena/review.md'),
        ]}
        graphOpen={false}
        includeSource={false}
        loading={false}
        markdownCount={2}
        onCopyBoard={vi.fn()}
        onCreateDoc={vi.fn()}
        onPreviewBoard={vi.fn()}
        onQueryChange={vi.fn()}
        onRevealProjectDocs={vi.fn()}
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

    const docRail = within(screen.getByTestId('project-document-rail'))

    expect(docRail.getByLabelText('7 project docs')).toHaveTextContent('7')
    expect(docRail.getAllByRole('button')).toHaveLength(4)
    expect(docRail.getByRole('button', { name: 'README / frontend' })).toBeInTheDocument()
    expect(docRail.getByRole('button', { name: '4 more project docs' })).toHaveTextContent('+4')
  })

  it('opens the full project docs result rail from the hidden-docs affordance', () => {
    const onRevealProjectDocs = vi.fn()
    render(
      <ProjectWorkspaceChrome
        boardAvailable={false}
        canCreateDoc={true}
        copiedBoard={false}
        createdDoc={null}
        documents={[
          document('docs/README.md'),
          document('backend/README.md'),
          document('frontend/README.md'),
          document('frontend/rashmi/README.md'),
        ]}
        graphOpen={false}
        includeSource={false}
        loading={false}
        markdownCount={4}
        onCopyBoard={vi.fn()}
        onCreateDoc={vi.fn()}
        onPreviewBoard={vi.fn()}
        onQueryChange={vi.fn()}
        onRevealProjectDocs={onRevealProjectDocs}
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

    fireEvent.click(screen.getByRole('button', { name: '1 more project docs' }))
    expect(onRevealProjectDocs).toHaveBeenCalledTimes(1)
  })
})
