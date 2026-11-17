import { useEffect, useState } from 'react'
import { MarkdownContent } from '../MarkdownContent'
import { getFileContentAtCommit } from '../../lib/noteHistory'
import { stripFrontmatter } from '../../lib/exportNote/renderNoteHtml'
import { getCurrentVaultPath } from '../../utils/currentVaultPath'

type PreviewState = 'loading' | 'error' | 'ready'

const PREVIEW_DEBOUNCE_MS = 150

/**
 * Read-only rendered preview of the note body at a past commit. Fetch is
 * debounced per commit hash and out-of-order responses are discarded.
 */
export function TimeTravelPreview({ notePath, commitHash }: {
  notePath: string
  commitHash: string
}) {
  const [state, setState] = useState<PreviewState>('loading')
  const [content, setContent] = useState('')

  useEffect(() => {
    if (!notePath || !commitHash) return
    let cancelled = false
    setState('loading')
    const timer = setTimeout(() => {
      const vaultPath = getCurrentVaultPath()
      if (!vaultPath) {
        if (!cancelled) setState('error')
        return
      }
      getFileContentAtCommit(vaultPath, notePath, commitHash)
        .then((raw) => {
          if (cancelled) return
          const body = stripFrontmatter(raw).trim()
          if (!body) {
            setState('error')
            return
          }
          setContent(body)
          setState('ready')
        })
        .catch(() => {
          if (!cancelled) setState('error')
        })
    }, PREVIEW_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [notePath, commitHash])

  return (
    <div className="sb-tt__preview" aria-live="polite" data-testid="history-version-preview">
      {state === 'loading' && (
        <p className="sb-tt__preview-status">Reading this version…</p>
      )}
      {state === 'error' && (
        <p className="sb-tt__preview-status">This note didn&apos;t exist at this commit.</p>
      )}
      {state === 'ready' && <MarkdownContent content={content} />}
    </div>
  )
}
