import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SearchPanel } from './SearchPanel'

vi.mock('../mock-tauri', () => ({
  mockInvoke: vi.fn(),
  isTauri: () => false,
}))

import { mockInvoke } from '../mock-tauri'

const mockInvokeFn = vi.mocked(mockInvoke)

describe('SearchPanel Spotlight project results', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows relative path and file kind for project text hits', async () => {
    mockInvokeFn.mockResolvedValue({
      results: [
        {
          title: 'spotlight-proof.ts',
          path: '/vault/docs/reference/spotlight-proof.ts',
          snippet: 'docs/reference/spotlight-proof.ts',
          score: 9,
          note_type: null,
          file_kind: 'text',
        },
      ],
      elapsed_ms: 7,
    })

    render(
      <SearchPanel
        open={true}
        vaultPath="/vault"
        entries={[]}
        onSelectNote={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('Search pages, docs, and project files...'), {
      target: { value: 'docs/reference' },
    })

    await waitFor(() => {
      expect(screen.getByText('spotlight-proof.ts')).toBeInTheDocument()
      expect(screen.getByText('docs/reference/spotlight-proof.ts · Text')).toBeInTheDocument()
    })
  })
})
