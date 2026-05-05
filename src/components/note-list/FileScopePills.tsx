import { FileCode2, FileText, Files } from 'lucide-react'
import { memo, type ComponentType } from 'react'
import { Button } from '@/components/ui/button'
import type { NoteFileScope } from '../../utils/noteListHelpers'

interface FileScopePillsProps {
  active: NoteFileScope
  counts: Record<NoteFileScope, number>
  onChange: (scope: NoteFileScope) => void
}

const SCOPES: Array<{ value: NoteFileScope; label: string; Icon: ComponentType<{ className?: string }> }> = [
  { value: 'markdown', label: 'Markdown', Icon: FileText },
  { value: 'other', label: 'Other', Icon: FileCode2 },
  { value: 'all', label: 'All', Icon: Files },
]

const BASE_CLASSNAME = 'h-7 rounded-full px-2.5 text-[12px] font-medium'

function scopeClassName(active: boolean): string {
  return active
    ? `${BASE_CLASSNAME} border border-foreground/20 bg-foreground/10 text-foreground hover:bg-foreground/10`
    : `${BASE_CLASSNAME} border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground`
}

function FileScopePillsInner({ active, counts, onChange }: FileScopePillsProps) {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-1.5"
      data-testid="file-scope-pills"
    >
      {SCOPES.map(({ value, label, Icon }) => (
        <Button
          key={value}
          type="button"
          variant="ghost"
          size="xs"
          role="tab"
          aria-selected={active === value}
          className={scopeClassName(active === value)}
          onClick={() => onChange(value)}
          data-testid={`file-scope-pill-${value}`}
        >
          <Icon className="size-3.5" />
          <span>{label}</span>
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {counts[value]}
          </span>
        </Button>
      ))}
    </div>
  )
}

export const FileScopePills = memo(FileScopePillsInner)
