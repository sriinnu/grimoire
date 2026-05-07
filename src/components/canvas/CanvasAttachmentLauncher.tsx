import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react'
import { PenLine, Shapes } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  canvasAttachmentForImageSrc,
  parseCanvasAttachments,
  type CanvasAttachment,
} from '../../utils/canvasAttachments'
import { CanvasAttachmentDialog } from './CanvasAttachmentDialog'

interface CanvasAttachmentLauncherProps {
  containerRef: RefObject<HTMLDivElement | null>
  markdown: string
  vaultPath?: string
}

function attachmentIcon(attachment: CanvasAttachment) {
  return attachment.kind === 'whiteboard' ? <Shapes /> : <PenLine />
}

function clickedImageAttachment(
  target: EventTarget | null,
  attachments: CanvasAttachment[],
): CanvasAttachment | null {
  const element = target instanceof HTMLElement ? target : null
  const image = element?.closest('img') as HTMLImageElement | null
  return image ? canvasAttachmentForImageSrc(attachments, image.currentSrc || image.src) : null
}

/** Shows and opens editable Grimoire canvas attachments referenced by the active Markdown note. */
export function CanvasAttachmentLauncher({
  containerRef,
  markdown,
  vaultPath,
}: CanvasAttachmentLauncherProps) {
  const attachments = useMemo(() => parseCanvasAttachments(markdown), [markdown])
  const [selectedAttachment, setSelectedAttachment] = useState<CanvasAttachment | null>(null)
  const [open, setOpen] = useState(false)

  const openAttachment = useCallback((attachment: CanvasAttachment) => {
    setSelectedAttachment(attachment)
    setOpen(true)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || attachments.length === 0) return

    const handleClick = (event: MouseEvent) => {
      const attachment = clickedImageAttachment(event.target, attachments)
      if (!attachment) return
      event.preventDefault()
      event.stopPropagation()
      openAttachment(attachment)
    }

    container.addEventListener('click', handleClick, true)
    return () => container.removeEventListener('click', handleClick, true)
  }, [attachments, containerRef, openAttachment])

  if (attachments.length === 0) return null

  return (
    <div className="canvas-attachment__launcher" aria-label="Canvas attachments">
      {attachments.map((attachment) => (
        <Button
          key={`${attachment.source}-${attachment.preview}`}
          className="canvas-attachment__launcher-button"
          onClick={() => openAttachment(attachment)}
          size="sm"
          type="button"
          variant="outline"
        >
          {attachmentIcon(attachment)}
          {attachment.title}
        </Button>
      ))}
      <CanvasAttachmentDialog
        attachment={selectedAttachment}
        onOpenChange={setOpen}
        open={open}
        vaultPath={vaultPath}
      />
    </div>
  )
}
