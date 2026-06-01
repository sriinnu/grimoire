import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AudioRecordingDialog } from './AudioRecordingDialog'
import { saveVoiceRecordingToVault } from '../utils/audioRecording'

vi.mock('../utils/audioRecording', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/audioRecording')>()
  return {
    ...actual,
    saveVoiceRecordingToVault: vi.fn(async () => (
      '/vault/Private/attachments/recordings/voice-note.webm'
    )),
  }
})

const trackStop = vi.fn()

class MockMediaRecorder {
  static isTypeSupported = vi.fn((mimeType: string) => mimeType === 'audio/webm')

  mimeType = 'audio/webm'
  state: RecordingState = 'inactive'
  ondataavailable: ((event: BlobEvent) => void) | null = null
  onstop: (() => void) | null = null

  start() {
    this.state = 'recording'
  }

  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['voice'], { type: 'audio/webm' }) } as BlobEvent)
    this.onstop?.()
  }
}

type RecordingState = 'inactive' | 'recording'

function installMediaMocks(getUserMedia: () => Promise<MediaStream>) {
  Object.defineProperty(globalThis, 'MediaRecorder', {
    configurable: true,
    value: MockMediaRecorder,
  })
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(getUserMedia) },
  })
}

function mockStream(): MediaStream {
  return {
    getTracks: () => [{ stop: trackStop }],
  } as unknown as MediaStream
}

describe('AudioRecordingDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    installMediaMocks(async () => mockStream())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('records, saves locally, and transcribes the saved file', async () => {
    const onRecordingSaved = vi.fn(async () => {})
    const onClose = vi.fn()

    render(
      <AudioRecordingDialog
        open={true}
        vaultPath="/vault"
        onClose={onClose}
        onRecordingSaved={onRecordingSaved}
      />,
    )

    fireEvent.click(screen.getByTestId('start-recording'))
    await screen.findByTestId('stop-recording')
    fireEvent.click(screen.getByTestId('stop-recording'))
    await screen.findByTestId('save-recording')
    fireEvent.click(screen.getByTestId('save-recording'))

    await waitFor(() => {
      expect(saveVoiceRecordingToVault).toHaveBeenCalledWith(expect.objectContaining({
        vaultPath: '/vault',
        filename: expect.stringMatching(/^voice-note-\d{4}-\d{2}-\d{2}-\d{6}\.webm$/u),
      }))
    })
    expect(onRecordingSaved).toHaveBeenCalledWith('/vault/Private/attachments/recordings/voice-note.webm')
    expect(onClose).toHaveBeenCalled()
    expect(trackStop).toHaveBeenCalled()
  })

  it('shows microphone permission failures', async () => {
    installMediaMocks(async () => {
      throw new Error('Permission denied')
    })

    render(
      <AudioRecordingDialog
        open={true}
        vaultPath="/vault"
        onClose={() => {}}
        onRecordingSaved={async () => {}}
      />,
    )

    fireEvent.click(screen.getByTestId('start-recording'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Permission denied')
  })
})
