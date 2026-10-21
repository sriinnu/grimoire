import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { APP_STORAGE_KEYS } from '../constants/appStorage'
import { QuickCaptureSheet } from './QuickCaptureSheet'

const DRAFT_KEY = APP_STORAGE_KEYS.quickCaptureDraft

function renderSheet(onSave = vi.fn(async () => true), onClose = vi.fn(), onPromote?: (text: string, lane: string) => Promise<boolean>) {
  render(<QuickCaptureSheet open onClose={onClose} onSave={onSave} onPromote={onPromote} />)
  return { onSave, onClose, onPromote, textarea: screen.getByPlaceholderText('Capture a thought…') as HTMLTextAreaElement }
}

describe('QuickCaptureSheet', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('renders a focused composer', async () => {
    const { textarea } = renderSheet()
    expect(screen.getByTestId('quick-capture-sheet')).toBeInTheDocument()
    await waitFor(() => expect(textarea).toHaveFocus())
  })

  it('saves on Cmd+Enter and Ctrl+Enter, then clears the draft and closes', async () => {
    const { textarea, onSave, onClose } = renderSheet()
    fireEvent.change(textarea, { target: { value: 'buy oat milk' } })
    expect(localStorage.getItem(DRAFT_KEY)).toBe('buy oat milk')

    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true })

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(onSave).toHaveBeenCalledWith('buy oat milk')
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
  })

  it('accepts Ctrl+Enter too', async () => {
    const { textarea, onSave } = renderSheet()
    fireEvent.change(textarea, { target: { value: 'x' } })
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('x'))
  })

  it('leaves plain Enter for new lines and ignores blank submits', () => {
    const { textarea, onSave } = renderSheet()
    fireEvent.keyDown(textarea, { key: 'Enter' })
    fireEvent.change(textarea, { target: { value: '   ' } })
    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true })
    expect(onSave).not.toHaveBeenCalled()
  })

  it('keeps the sheet and draft when saving fails', async () => {
    const onSave = vi.fn(async () => false)
    const { textarea, onClose } = renderSheet(onSave)
    fireEvent.change(textarea, { target: { value: 'keep me' } })
    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true })

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onClose).not.toHaveBeenCalled()
    expect(textarea.value).toBe('keep me')
    expect(localStorage.getItem(DRAFT_KEY)).toBe('keep me')
  })

  it('closes on Escape and restores the unsent draft next time', () => {
    localStorage.setItem(DRAFT_KEY, 'half a thought')
    const { textarea, onClose } = renderSheet()
    expect(textarea.value).toBe('half a thought')

    fireEvent.keyDown(textarea, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(DRAFT_KEY)).toBe('half a thought')
  })

  it('still works when storage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    const { textarea, onSave } = renderSheet()
    expect(textarea.value).toBe('')
    fireEvent.change(textarea, { target: { value: 'still here' } })
    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true })
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('still here'))
  })

  const TASK_DRAFT = '- [ ] buy oat milk and also pick up the dry cleaning and finish the draft proposal notes before the standup'

  it('shows the promotion strip past the threshold with the inferred lane, without stealing focus', async () => {
    const { textarea } = renderSheet(vi.fn(async () => true), vi.fn(), vi.fn(async () => true))
    expect(TASK_DRAFT.length).toBeGreaterThanOrEqual(100)
    fireEvent.change(textarea, { target: { value: TASK_DRAFT } })

    const strip = await screen.findByTestId('quick-capture-promotion', {}, { timeout: 2000 })
    expect(strip).toHaveTextContent('Looks like:')
    expect(strip).toHaveTextContent('Next')
    expect(strip).toHaveTextContent('local only')
    expect(textarea).toHaveFocus()
  })

  it('does not show the strip below the threshold', async () => {
    const { textarea } = renderSheet()
    fireEvent.change(textarea, { target: { value: '- [ ] buy oat milk' } })
    await new Promise((resolve) => setTimeout(resolve, 600))
    expect(screen.queryByTestId('quick-capture-promotion')).not.toBeInTheDocument()
  })

  it('promote invokes the creation handler with the lane, clears the draft, and closes', async () => {
    const onPromote = vi.fn(async () => true)
    const onClose = vi.fn()
    const { textarea } = renderSheet(vi.fn(async () => true), onClose, onPromote)
    fireEvent.change(textarea, { target: { value: TASK_DRAFT } })
    await screen.findByTestId('quick-capture-promotion', {}, { timeout: 2000 })

    fireEvent.click(screen.getByTestId('quick-capture-promote'))

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(onPromote).toHaveBeenCalledWith(TASK_DRAFT, 'task')
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
  })

  it('Cmd+Enter promotes when the strip is visible', async () => {
    const onPromote = vi.fn(async () => true)
    const onSave = vi.fn(async () => true)
    const { textarea } = renderSheet(onSave, vi.fn(), onPromote)
    fireEvent.change(textarea, { target: { value: TASK_DRAFT } })
    await screen.findByTestId('quick-capture-promotion', {}, { timeout: 2000 })

    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true })

    await waitFor(() => expect(onPromote).toHaveBeenCalledWith(TASK_DRAFT, 'task'))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('stays dismissed for the draft once the suggestion is closed', async () => {
    const { textarea } = renderSheet(vi.fn(async () => true), vi.fn(), vi.fn(async () => true))
    fireEvent.change(textarea, { target: { value: TASK_DRAFT } })
    await screen.findByTestId('quick-capture-promotion', {}, { timeout: 2000 })

    fireEvent.click(screen.getByTestId('quick-capture-dismiss'))
    expect(screen.queryByTestId('quick-capture-promotion')).not.toBeInTheDocument()

    fireEvent.change(textarea, { target: { value: `${TASK_DRAFT} and a little more` } })
    await new Promise((resolve) => setTimeout(resolve, 600))
    expect(screen.queryByTestId('quick-capture-promotion')).not.toBeInTheDocument()

    fireEvent.change(textarea, { target: { value: '' } })
    fireEvent.change(textarea, { target: { value: TASK_DRAFT } })
    await screen.findByTestId('quick-capture-promotion', {}, { timeout: 2000 })
  })
})
