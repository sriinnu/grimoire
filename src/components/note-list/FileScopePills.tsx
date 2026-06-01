import { FileCode2, FileText, Files } from 'lucide-react'
import { memo, type ComponentType } from 'react'
import type { NoteFileScope } from '../../utils/noteListHelpers'
import { NoteListSegmentedPills } from './NoteListSegmentedPills'

interface FileScopePillsProps {
  active: NoteFileScope
  counts: Record<NoteFileScope, number>
  onChange: (scope: NoteFileScope) => void
}

const SCOPES: Array<{ value: NoteFileScope; label: string; Icon: ComponentType<{ className?: string }>; title: string }> = [
  { value: 'markdown', label: 'Docs', Icon: FileText, title: 'Markdown documents' },
  { value: 'other', label: 'Source', Icon: FileCode2, title: 'Source and non-Markdown files' },
  { value: 'all', label: 'All', Icon: Files, title: 'All files' },
]

function FileScopePillsInner({ active, counts, onChange }: FileScopePillsProps) {
  return (
    <NoteListSegmentedPills
      active={active}
      ariaLabel="File type scope"
      counts={counts}
      itemTestId={(value) => `file-scope-pill-${value}`}
      onChange={onChange}
      options={SCOPES}
      testId="file-scope-pills"
    />
  )
}

export const FileScopePills = memo(FileScopePillsInner)
