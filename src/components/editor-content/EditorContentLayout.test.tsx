import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EditorContentLayout } from './EditorContentLayout'

vi.mock('../BreadcrumbBar', () => ({
  BreadcrumbBar: ({ noteLayout }: { noteLayout?: string }) => <div data-testid="breadcrumb-bar" data-note-layout={noteLayout} />,
}))

vi.mock('../ArchivedNoteBanner', () => ({
  ArchivedNoteBanner: () => <div data-testid="archived-banner" />,
}))

vi.mock('../ConflictNoteBanner', () => ({
  ConflictNoteBanner: () => <div data-testid="conflict-banner" />,
}))

vi.mock('../RawEditorView', () => ({
  RawEditorView: () => <div data-testid="raw-editor-view" />,
}))

vi.mock('../SingleEditorView', () => ({
  SingleEditorView: () => (
    <div className="editor__blocknote-container" data-testid="single-editor-view">
      <div className="bn-editor" data-testid="blocknote-editor-core" />
    </div>
  ),
}))

vi.mock('../DiffView', () => ({
  DiffView: () => <div data-testid="diff-view" />,
}))

function createModel(overrides: Record<string, unknown> = {}) {
  return {
    activeTab: {
      entry: {
        path: '/vault/project/demo.md',
        filename: 'demo.md',
        title: 'Demo Note',
      },
      content: 'Body',
    },
    isLoadingNewTab: false,
    entries: [],
    editor: {},
    diffMode: false,
    diffContent: null,
    diffLoading: false,
    onToggleDiff: vi.fn(),
    effectiveRawMode: false,
    onToggleRaw: vi.fn(),
    onRawContentChange: vi.fn(),
    onSave: vi.fn(),
    showEditor: true,
    isHtmlPreview: false,
    isImagePreview: false,
    isArchived: false,
    onUnarchiveNote: undefined,
    path: '/vault/project/demo.md',
    isConflicted: false,
    onKeepMine: vi.fn(),
    onKeepTheirs: vi.fn(),
    breadcrumbBarRef: createRef<HTMLDivElement>(),
    wordCount: 12,
    vaultPath: '/vault',
    cssVars: {},
    onNavigateWikilink: vi.fn(),
    onEditorChange: vi.fn(),
    isDeletedPreview: false,
    rawLatestContentRef: { current: null },
    noteLayout: 'centered',
    onToggleNoteLayout: vi.fn(),
    forceRawMode: false,
    showAIChat: false,
    onToggleAIChat: vi.fn(),
    inspectorCollapsed: true,
    onToggleInspector: vi.fn(),
    showDiffToggle: false,
    onToggleFavorite: vi.fn(),
    onToggleOrganized: vi.fn(),
    onDeleteNote: vi.fn(),
    onArchiveNote: vi.fn(),
    ...overrides,
  } as never
}

describe('EditorContentLayout', () => {
  it('never renders the legacy title section', () => {
    const { container } = render(<EditorContentLayout {...createModel()} />)

    expect(container.querySelector('.title-section')).toBeNull()
    expect(screen.queryByTestId('title-field-input')).not.toBeInTheDocument()
    expect(screen.getByTestId('single-editor-view')).toBeInTheDocument()
  })

  it('shows the loading skeleton instead of stale editor chrome while switching tabs', () => {
    render(
      <EditorContentLayout
        {...createModel({
          activeTab: null,
          isLoadingNewTab: true,
        })}
      />,
    )

    expect(screen.getByTestId('editor-loading-state')).toBeInTheDocument()
    expect(screen.queryByTestId('title-field-input')).not.toBeInTheDocument()
  })

  it('marks the editor content root and breadcrumb with the note layout preference', () => {
    const { container } = render(<EditorContentLayout {...createModel({ noteLayout: 'left' })} />)

    expect(container.firstElementChild).toHaveClass('editor-content-layout--left')
    expect(screen.getByTestId('breadcrumb-bar')).toHaveAttribute('data-note-layout', 'left')
    expect(container.querySelector('.editor-scroll-area')).toHaveClass('grimoire-ink-settle')
  })

  it('keeps note-arrival motion on the shell instead of the typing surface', () => {
    const { container } = render(<EditorContentLayout {...createModel()} />)

    expect(container.querySelector('.editor-scroll-area')).toHaveClass('grimoire-ink-settle')

    for (const element of [
      container.querySelector('.editor-content-wrapper'),
      screen.getByTestId('single-editor-view'),
      screen.getByTestId('blocknote-editor-core'),
    ]) {
      expect(element).not.toHaveClass('grimoire-ink-settle')
      expect(element).not.toHaveClass('grimoire-page-arrive')
      expect(element).not.toHaveClass('grimoire-state-pulse')
    }
  })

  it('does not remount the typing surface when an untitled note is renamed', () => {
    const { container, rerender } = render(<EditorContentLayout {...createModel()} />)
    const initialScrollArea = container.querySelector('.editor-scroll-area')

    rerender(
      <EditorContentLayout
        {...createModel({
          activeTab: {
            entry: {
              path: '/vault/project/renamed.md',
              filename: 'renamed.md',
              title: 'Renamed',
            },
            content: 'Body',
          },
          path: '/vault/project/renamed.md',
        })}
      />,
    )

    expect(container.querySelector('.editor-scroll-area')).toBe(initialScrollArea)
  })
})
