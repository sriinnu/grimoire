import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChitraguptaRecallSection } from './ChitraguptaRecallSection'

const { buildChitraguptaContextMock, createAttachmentMock } = vi.hoisted(() => ({
  buildChitraguptaContextMock: vi.fn(),
  createAttachmentMock: vi.fn(),
}))

vi.mock('../lib/tauriRuntime', () => ({ isTauriRuntimeAvailable: () => true }))
vi.mock('../lib/chitraguptaContext', () => ({
  buildChitraguptaContext: buildChitraguptaContextMock,
  createChitraguptaRecallAttachment: createAttachmentMock,
}))

describe('ChitraguptaRecallSection', () => {
  it('requires a visible build and a separate user approval before request handoff', async () => {
    const attachment = {
      degraded: true,
      guidance: 'Use the reviewed manifest.',
      items: [{ answer: 'Keep the vault local-first.', primarySource: 'Smriti', score: 0.9, snippet: null }],
      predictions: null,
      recalledCount: 2,
      requestId: 'grimoire:pkg-1',
      warnings: ['Lucy offline'],
    }
    const onUseRecall = vi.fn()
    buildChitraguptaContextMock.mockResolvedValue({
      schemaVersion: 'chitragupta.context-build.v1',
      recalled: [{ id: 'one' }, { id: 'two' }],
      degraded: true,
      warnings: ['Lucy offline'],
      live: { predictions: [], guidanceBlock: 'Use the reviewed manifest.', predictionsBlock: null },
    })
    createAttachmentMock.mockReturnValue(attachment)

    render(
      <ChitraguptaRecallSection
        protectedContext={false}
        reviewReceipt="pkg-1"
        vaultPath="/vault"
        onUseRecall={onUseRecall}
      />,
    )

    expect(screen.getByTestId('chitragupta-recall')).toHaveTextContent('On demand')
    fireEvent.change(screen.getByRole('textbox', { name: 'Question for Chitragupta recall' }), {
      target: { value: 'What is the plan?' },
    })
    fireEvent.click(screen.getByTestId('chitragupta-recall-build'))

    await waitFor(() => expect(buildChitraguptaContextMock).toHaveBeenCalledWith({
      query: 'What is the plan?',
      project: '/vault',
      requestId: 'grimoire:pkg-1',
    }))
    expect(screen.getByTestId('chitragupta-recall-result')).toHaveTextContent('2 memories')
    expect(screen.getByTestId('chitragupta-recall-result')).toHaveTextContent('Degraded')

    expect(screen.getByText('Review 1 memory excerpt')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Use reviewed recall in next request' }))
    expect(onUseRecall).toHaveBeenCalledWith(attachment)
  })

  it('keeps protected context local and removes the build control', () => {
    render(<ChitraguptaRecallSection protectedContext reviewReceipt="pkg-1" vaultPath="/vault" />)

    expect(screen.getByTestId('chitragupta-recall')).toHaveTextContent('Held local')
    expect(screen.getByTestId('chitragupta-recall')).toHaveTextContent('Protected context stays on this device')
    expect(screen.queryByRole('textbox', { name: 'Question for Chitragupta recall' })).toBeNull()
    expect(screen.queryByTestId('chitragupta-recall-build')).toBeNull()
  })
})
