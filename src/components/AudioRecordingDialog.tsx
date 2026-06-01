import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Mic, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  buildVoiceRecordingFilename,
  pickSupportedRecordingMimeType,
  recordingExtension,
  saveVoiceRecordingToVault,
} from '../utils/audioRecording'

type RecordingState = 'idle' | 'requesting' | 'recording' | 'ready' | 'saving'

interface AudioRecordingDialogProps {
  open: boolean
  vaultPath: string
  onClose: () => void
  onRecordingSaved: (audioPath: string) => Promise<void>
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}

/** Records microphone audio, saves it locally, and hands the file to transcription. */
export function AudioRecordingDialog({
  open,
  vaultPath,
  onClose,
  onRecordingSaved,
}: AudioRecordingDialogProps) {
  const [state, setState] = useState<RecordingState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const mimeTypeRef = useRef('')

  const discardRecorderResources = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder?.state === 'recording') {
      recorder.ondataavailable = null
      recorder.onstop = null
      recorder.stop()
    }
    stopStream(streamRef.current)
    recorderRef.current = null
    streamRef.current = null
    chunksRef.current = []
    startedAtRef.current = 0
    mimeTypeRef.current = ''
  }, [])

  const resetRecording = useCallback(() => {
    discardRecorderResources()
    setRecordingBlob(null)
    setElapsedMs(0)
    setState('idle')
  }, [discardRecorderResources])

  useEffect(() => {
    return () => discardRecorderResources()
  }, [discardRecorderResources])

  useEffect(() => {
    if (state !== 'recording') return undefined
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current)
    }, 250)
    return () => window.clearInterval(timer)
  }, [state])

  const startRecording = async () => {
    setError(null)
    setRecordingBlob(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Audio recording is not available in this runtime.')
      return
    }

    setState('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = pickSupportedRecordingMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      streamRef.current = stream
      recorderRef.current = recorder
      chunksRef.current = []
      mimeTypeRef.current = mimeType || recorder.mimeType
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const blobType = mimeTypeRef.current || 'audio/webm'
        setRecordingBlob(new Blob(chunksRef.current, { type: blobType }))
        stopStream(streamRef.current)
        streamRef.current = null
        recorderRef.current = null
        setState('ready')
      }
      recorder.start()
      startedAtRef.current = Date.now()
      setElapsedMs(0)
      setState('recording')
    } catch (err) {
      stopStream(streamRef.current)
      streamRef.current = null
      setState('idle')
      setError(err instanceof Error ? err.message : 'Microphone permission was denied.')
    }
  }

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  const saveRecording = async () => {
    if (!recordingBlob) return
    if (!vaultPath.trim()) {
      setError('Open a vault before recording audio.')
      return
    }

    setError(null)
    setState('saving')
    try {
      const extension = recordingExtension(recordingBlob.type || mimeTypeRef.current)
      const filename = buildVoiceRecordingFilename(new Date(), extension)
      const audioPath = await saveVoiceRecordingToVault({ vaultPath, blob: recordingBlob, filename })
      await onRecordingSaved(audioPath)
      resetRecording()
      onClose()
    } catch (err) {
      setState('ready')
      setError(err instanceof Error ? err.message : 'Failed to save recording.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && state !== 'saving') onClose() }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic size={18} />
            Record audio
          </DialogTitle>
          <DialogDescription>
            Captures a local voice note, saves it privately, then creates transcript notes.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border bg-muted/30 px-4 py-5 text-center">
          <div className="text-3xl font-semibold tabular-nums" data-testid="recording-elapsed">
            {formatElapsed(elapsedMs)}
          </div>
          <div className="mt-2 text-sm text-muted-foreground" role="status">
            {state === 'recording' ? 'Recording locally' : recordingBlob ? 'Recording ready' : 'Ready'}
          </div>
        </div>

        {error ? <div className="text-sm text-destructive" role="alert">{error}</div> : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={state === 'saving'}>
            Cancel
          </Button>
          {state === 'recording' ? (
            <Button onClick={stopRecording} data-testid="stop-recording">
              <Square size={14} />
              Stop
            </Button>
          ) : recordingBlob ? (
            <Button onClick={() => { void saveRecording() }} disabled={state === 'saving'} data-testid="save-recording">
              {state === 'saving' ? <Loader2 className="animate-spin" size={14} /> : <Mic size={14} />}
              {state === 'saving' ? 'Saving…' : 'Save and transcribe'}
            </Button>
          ) : (
            <Button onClick={() => { void startRecording() }} disabled={state === 'requesting'} data-testid="start-recording">
              {state === 'requesting' ? <Loader2 className="animate-spin" size={14} /> : <Mic size={14} />}
              {state === 'requesting' ? 'Requesting…' : 'Start recording'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
