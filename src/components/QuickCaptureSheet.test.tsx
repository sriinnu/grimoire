import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { APP_STORAGE_KEYS } from '../constants/appStorage'
import { QuickCaptureSheet } from './QuickCaptureSheet'

const DRAFT_KEY = APP_STORAGE_KEYS.quickCaptureDraft

function renderSheet(onSave = vi.fn(async () => true), onClose = vi.fn()) {
  render(<QuickCaptureSheet open onClose={onClose} onSave={onSave} />)
  return { onSave, onClose, textarea: screen.getByPlaceholderText('Capture a thought…') as HTMLTextAreaElement }
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
})
