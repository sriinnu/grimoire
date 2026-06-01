import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MemoryLedgerAuditItem } from '../../lib/memoryLedger'
import { MemoryLedgerAuditStrip } from './MemoryLedgerAuditStrip'

const item: MemoryLedgerAuditItem = {
  label: 'Expired 2026-05-01',
  path: '/vault/memory/thread.md',
  reason: 'expired',
  title: 'Thread Memory',
  tone: 'danger',
}

describe('MemoryLedgerAuditStrip', () => {
  it('shows the next owner-visible memory review item', () => {
    render(<MemoryLedgerAuditStrip items={[item, { ...item, path: '/vault/memory/other.md' }]} />)

    const strip = screen.getByTestId('memory-ledger-audit-strip')
    expect(strip).toHaveAttribute('data-memory-tone', 'danger')
    expect(strip).toHaveTextContent('Thread Memory')
    expect(strip).toHaveTextContent('Expired 2026-05-01')
    expect(strip).toHaveTextContent('1 more review item')
  })

  it('opens the memory note through normal navigation', () => {
    const onNavigate = vi.fn()
    render(<MemoryLedgerAuditStrip items={[item]} onNavigate={onNavigate} />)

    fireEvent.click(screen.getByRole('button', { name: 'Open memory audit item Thread Memory' }))
    expect(onNavigate).toHaveBeenCalledWith('/vault/memory/thread.md')
  })
})
