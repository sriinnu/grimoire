import { Files } from 'lucide-react'
import { memo, type ComponentType } from 'react'
import { Glyph } from '../glyphs/Glyph'
import type { NoteFileScope } from '../../utils/noteListHelpers'
import { NoteListSegmentedPills } from './NoteListSegmentedPills'

interface FileScopePillsProps {
  active: NoteFileScope
  counts: Record<NoteFileScope, number>
  onChange: (scope: NoteFileScope) => void
}

const FileGlyph = ({ className }: { className?: string }) => <Glyph name="file" size={14} className={className} />
const CodeGlyph = ({ className }: { className?: string }) => <Glyph name="code" size={14} className={className} />

const SCOPES: Array<{ value: NoteFileScope; label: string; Icon: ComponentType<{ className?: string }>; title: string }> = [
  { value: 'markdown', label: 'Docs', Icon: FileGlyph, title: 'Markdown documents' },
  { value: 'other', label: 'Source', Icon: CodeGlyph, title: 'Source and non-Markdown files' },
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
