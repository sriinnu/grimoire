import { TrashSimple } from '@phosphor-icons/react'
import { Glyph } from '@/components/glyphs/Glyph'

export function EmptyMessage({ text }: { text: string }) {
  const lower = text.toLowerCase()
  const glyphName =
    lower.includes('archived') ? 'archive' as const
    : lower.includes('changes') ? 'gitHistory' as const
    : lower.includes('inbox') ? 'inbox' as const
    : 'notebook' as const

  return (
    <div className="flex flex-col items-center px-4 py-8 text-center text-[13px] text-muted-foreground">
      <Glyph name={glyphName} size={40} className="text-muted-foreground/30 mb-3" />
      {text}
    </div>
  )
}

export function DeletedNotesBanner({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-2 border-b border-[var(--border)] opacity-60" style={{ padding: '14px 16px' }} data-testid="deleted-notes-banner">
      <TrashSimple size={14} className="shrink-0 text-muted-foreground" />
      <span className="text-[13px] text-muted-foreground">{count} {count === 1 ? 'note' : 'notes'} deleted</span>
    </div>
  )
}
