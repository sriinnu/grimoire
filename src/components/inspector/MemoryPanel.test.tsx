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
            },
          }),
        ]}
        semantics={semantics}
      />,
    )

    const record = screen.getByTestId('memory-ledger-record')
    expect(record).toHaveClass('grimoire-memory-trace')
    expect(record).toHaveTextContent('Test Project Memory')
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
})
