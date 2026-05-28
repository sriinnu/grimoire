import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { parseMarkdownDocumentSemantics } from '@grimoire/markdown-editor'
import { describe, expect, it, vi } from 'vitest'
import { makeEntry } from '../../test-utils/noteListTestUtils'
import { MemoryPanel } from './MemoryPanel'

const activeEntry = makeEntry({
  path: '/vault/project/test-project.md',
  filename: 'test-project.md',
  title: 'Test Project',
  isA: 'Project',
})

const semantics = parseMarkdownDocumentSemantics(`---
title: Test Project
---

# Test Project
`)

describe('MemoryPanel', () => {
  it('stages source-backed memory rows with the memory-trace motion primitive', () => {
    render(
      <MemoryPanel
        entry={activeEntry}
        entries={[
          activeEntry,
          makeEntry({
            path: '/vault/memory/test-project-memory.md',
            filename: 'test-project-memory.md',
            title: 'Test Project Memory',
            isA: 'Memory',
            snippet: 'Remember the project launch constraints.',
            properties: {
              source_note: '[[Test Project]]',
              confidence: 'high',
              reviewed_at: '2026-05-22T10:00:00.000Z',
            },
          }),
        ]}
        semantics={semantics}
      />,
    )

    const record = screen.getByTestId('memory-ledger-record')
    const panel = screen.getByTestId('memory-panel')
    expect(panel).toHaveAttribute('data-locality', 'source-safe')
    expect(panel).toHaveAttribute('data-private-surface', 'memory-ledger')
    expect(record).toHaveClass('grimoire-memory-trace')
    expect(record).toHaveTextContent('Test Project Memory')

    const evidence = screen.getByTestId('memory-ledger-evidence-strip')
    expect(evidence).toHaveTextContent('1 record')
    expect(evidence).toHaveTextContent('1 source')
    expect(evidence).toHaveTextContent('0 contradictions')
    expect(evidence).toHaveTextContent('0 flags')
  })

  it('opens memory records and saves editable ledger metadata with a version stamp', async () => {
    const memoryPath = '/vault/memory/test-project-memory.md'
    const onNavigate = vi.fn()
    const onUpdateRecordProperty = vi.fn()
    const onDeleteRecordProperty = vi.fn()

    render(
      <MemoryPanel
        entry={activeEntry}
        entries={[
          activeEntry,
          makeEntry({
            path: memoryPath,
            filename: 'test-project-memory.md',
            title: 'Test Project Memory',
            isA: 'Memory',
            snippet: 'Remember the project launch constraints.',
            properties: {
              source_note: '[[Test Project]]',
              confidence: 'high',
              expires_at: '2026-06-01',
              contradicts: ['[[Old Plan]]'],
              memory_version: 2,
              reviewed_at: '2026-05-22T10:00:00.000Z',
            },
          }),
        ]}
        semantics={semantics}
        onNavigate={onNavigate}
        onUpdateRecordProperty={onUpdateRecordProperty}
        onDeleteRecordProperty={onDeleteRecordProperty}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open memory Test Project Memory' }))
    expect(onNavigate).toHaveBeenCalledWith(memoryPath)

    fireEvent.click(screen.getByRole('button', { name: 'Edit memory metadata Test Project Memory' }))
    fireEvent.change(screen.getByLabelText('Confidence'), { target: { value: 'verified' } })
    fireEvent.change(screen.getByLabelText('Expires'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Contradicts'), { target: { value: '[[Old Plan]], [[New Conflict]]' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save memory metadata' }))

    await waitFor(() => expect(onUpdateRecordProperty).toHaveBeenCalledWith(memoryPath, 'reviewed_at', expect.any(String)))

    expect(onUpdateRecordProperty).toHaveBeenCalledWith(memoryPath, 'confidence', 'verified')
    expect(onDeleteRecordProperty).toHaveBeenCalledWith(memoryPath, 'expires_at')
    expect(onUpdateRecordProperty).toHaveBeenCalledWith(memoryPath, 'contradicts', ['[[Old Plan]]', '[[New Conflict]]'])
    expect(onUpdateRecordProperty).toHaveBeenCalledWith(memoryPath, 'memory_version', 3)
  })

  it('shows source, expiry, and contradiction state as navigable ledger chips', () => {
    const onNavigate = vi.fn()

    render(
      <MemoryPanel
        entry={activeEntry}
        entries={[
          activeEntry,
          makeEntry({
            path: '/vault/memory/test-project-memory.md',
            filename: 'test-project-memory.md',
            title: 'Test Project Memory',
            isA: 'Memory',
            snippet: 'Remember the project launch constraints.',
            properties: {
              source_notes: ['[[Test Project]]', 'Research/Trail.md'],
              confidence: 0.9,
              expires_at: '2000-01-01',
              contradicts: ['[[Old Plan]]'],
              handoff: 'agent_council',
              handoff_mode: 'review-gated',
              handoff_ready_lanes: 3,
              handoff_source_count: 2,
              handoff_local_hold: false,
            },
          }),
        ]}
        semantics={semantics}
        onNavigate={onNavigate}
      />,
    )

    expect(screen.getByText('90%')).toBeInTheDocument()
    expect(screen.getByText('Expired 2000-01-01')).toBeInTheDocument()
    expect(screen.getAllByText('1 contradiction').length).toBeGreaterThan(0)
    expect(screen.getByText('Council 3 ready · 2 sources')).toBeInTheDocument()
    const evidence = screen.getByTestId('memory-ledger-evidence-strip')
    expect(evidence).toHaveTextContent('2 sources')
    expect(evidence).toHaveTextContent('1 flag')

    fireEvent.click(screen.getByRole('button', { name: 'Test Project' }))
    expect(onNavigate).toHaveBeenCalledWith('Test Project')
    fireEvent.click(screen.getByRole('button', { name: 'Old Plan' }))
    expect(onNavigate).toHaveBeenCalledWith('Old Plan')
  })

  it('shows the next ledger audit item without reading private note content', () => {
    const onNavigate = vi.fn()
    const memoryPath = '/vault/memory/test-project-memory.md'

    render(
      <MemoryPanel
        entry={activeEntry}
        entries={[
          activeEntry,
          makeEntry({
            path: memoryPath,
            filename: 'test-project-memory.md',
            title: 'Test Project Memory',
            isA: 'Memory',
            snippet: 'Remember the project launch constraints.',
            properties: {
              source_note: '[[Test Project]]',
              expires_at: '2000-01-01',
              reviewed_at: '2026-05-22T10:00:00.000Z',
            },
          }),
        ]}
        semantics={semantics}
        onNavigate={onNavigate}
      />,
    )

    const audit = screen.getByTestId('memory-ledger-audit-strip')
    expect(audit).toHaveTextContent('Test Project Memory')
    expect(audit).toHaveTextContent('Expired 2000-01-01')
    expect(audit).not.toHaveTextContent('/vault/memory/test-project-memory.md')

    fireEvent.click(screen.getByRole('button', { name: 'Open memory audit item Test Project Memory' }))
    expect(onNavigate).toHaveBeenCalledWith(memoryPath)
  })

  it('withholds ledger evidence for local-only notes', () => {
    render(
      <MemoryPanel
        entry={makeEntry({
          ...activeEntry,
          isA: 'Dream',
          properties: { local_only: true },
        })}
        entries={[
          activeEntry,
          makeEntry({
            path: '/vault/memory/test-project-memory.md',
            filename: 'test-project-memory.md',
            title: 'Test Project Memory',
            isA: 'Memory',
            snippet: 'Remember the project launch constraints.',
            properties: {
              source_note: '[[Test Project]]',
              confidence: 'high',
            },
          }),
        ]}
        semantics={semantics}
      />,
    )

    const panel = screen.getByTestId('memory-panel')
    expect(panel).toHaveAttribute('data-locality', 'local-only')
    expect(panel).toHaveAttribute('data-private-surface', 'memory-protected')
    expect(screen.queryByTestId('memory-ledger-evidence-strip')).not.toBeInTheDocument()
    expect(screen.queryByTestId('memory-ledger-audit-strip')).not.toBeInTheDocument()
    expect(screen.getAllByText('Withheld').length).toBeGreaterThan(0)
  })
})
