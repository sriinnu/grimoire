import { lazy, Suspense, type RefObject } from 'react'
import { Bold, Heading2, List, ListChecks, PenLine, Quote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { DashboardAskContextPreview as DashboardAskContextPreviewModel } from '../../utils/dashboardAskContext'
import { CAPTURE_KIND_CONFIGS, type CaptureKind } from '../../utils/dashboardCapture'
import type { DashboardCaptureTemplateId } from '../../utils/noteTemplates'
import { DashboardCaptureDatePicker } from './DashboardCaptureDatePicker'
import type { CaptureDateOffset } from './DashboardCaptureDatePickerModel'
import { DashboardTemplatePicker } from './DashboardTemplatePicker'

const DashboardAskContextPreview = lazy(async () => ({
  default: (await import('./DashboardAskContextPreview')).DashboardAskContextPreview,
}))

type MarkdownAction = 'bold' | 'bullet' | 'checklist' | 'heading' | 'quote'

const MARKDOWN_ACTIONS: Array<{
  action: MarkdownAction
  label: string
  Icon: typeof Bold
}> = [
  { action: 'bold', label: 'Bold', Icon: Bold },
  { action: 'heading', label: 'Heading', Icon: Heading2 },
  { action: 'bullet', label: 'Bullet list', Icon: List },
  { action: 'checklist', label: 'Checklist', Icon: ListChecks },
  { action: 'quote', label: 'Quote', Icon: Quote },
]

interface DashboardQuickCapturePanelProps {
  askContextPreview: DashboardAskContextPreviewModel | null
  busy: boolean
  captureDateOffset: CaptureDateOffset
  captureDateOverride: Date | null
  input: string
  inputRef: RefObject<HTMLTextAreaElement | null>
  selectedKind: CaptureKind
  selectedTemplateId: DashboardCaptureTemplateId | null
  showAskContextPreview: boolean
  onInputChange: (value: string) => void
  onSelectDateOffset: (offset: CaptureDateOffset) => void
  onSelectKind: (kind: CaptureKind) => void
  onSelectTemplate: (templateId: DashboardCaptureTemplateId) => void
  onSubmit: () => void
}

function CapturePill({
  kind,
  selected,
  onSelect,
}: {
  kind: CaptureKind
  selected: boolean
  onSelect: (kind: CaptureKind) => void
}) {
  const config = CAPTURE_KIND_CONFIGS.find((item) => item.kind === kind)!
  return (
    <Button
      type="button"
      variant={selected ? 'default' : 'outline'}
      size="sm"
      className="vault-dashboard__capture-pill"
      onClick={() => onSelect(kind)}
      data-testid={`dashboard-capture-kind-${kind}`}
    >
      {config.label}
    </Button>
  )
}

function prefixLines(value: string, prefix: string): string {
  const lines = value.length > 0 ? value.split('\n') : ['']
  return lines.map((line) => line.startsWith(prefix) ? line : `${prefix}${line}`).join('\n')
}

function markdownReplacement(action: MarkdownAction, selected: string): string {
  if (action === 'bold') return selected ? `**${selected}**` : '**bold**'
  if (action === 'heading') return prefixLines(selected || 'Heading', '## ')
  if (action === 'bullet') return prefixLines(selected || 'item', '- ')
  if (action === 'checklist') return prefixLines(selected || 'carry this', '- [ ] ')
  return prefixLines(selected || 'note', '> ')
}

/** Date-aware capture form for notes, journals, dreams, tasks, memories, and asks. */
export function DashboardQuickCapturePanel({
  askContextPreview,
  busy,
  captureDateOffset,
  captureDateOverride,
  input,
  inputRef,
  selectedKind,
  selectedTemplateId,
  showAskContextPreview,
  onInputChange,
  onSelectDateOffset,
  onSelectKind,
  onSelectTemplate,
  onSubmit,
}: DashboardQuickCapturePanelProps) {
  const applyMarkdownAction = (action: MarkdownAction) => {
    const textarea = inputRef.current
    const start = textarea?.selectionStart ?? input.length
    const end = textarea?.selectionEnd ?? input.length
    const selected = input.slice(start, end)
    const replacement = markdownReplacement(action, selected)
    const nextValue = `${input.slice(0, start)}${replacement}${input.slice(end)}`

    onInputChange(nextValue)
    requestAnimationFrame(() => {
      const nextTextarea = inputRef.current
      nextTextarea?.focus()
      nextTextarea?.setSelectionRange(start + replacement.length, start + replacement.length)
    })
  }

  return (
    <div className="vault-dashboard__panel vault-dashboard__panel--capture dashboard-capture-card">
      <div className="vault-dashboard__panel-head">
        <div>
          <div className="vault-dashboard__panel-label">Capture a thought</div>
          <h2>Catch it while it is here.</h2>
        </div>
        <PenLine size={18} />
      </div>
      <form
        className="vault-dashboard__capture-form"
        data-has-input={input.trim().length > 0 ? 'true' : 'false'}
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder={CAPTURE_KIND_CONFIGS.find((item) => item.kind === selectedKind)?.prompt}
          className="vault-dashboard__textarea"
          data-testid="dashboard-capture-input"
        />
        <div className="vault-dashboard__markdown-tools" aria-label="Quick capture Markdown tools">
          {MARKDOWN_ACTIONS.map(({ action, label, Icon }) => (
            <Button
              key={action}
              type="button"
              variant="ghost"
              size="icon"
              className="vault-dashboard__markdown-tool"
              aria-label={label}
              title={label}
              onClick={() => applyMarkdownAction(action)}
              data-testid={`dashboard-markdown-${action}`}
            >
              <Icon className="size-3.5" />
            </Button>
          ))}
        </div>
        {showAskContextPreview && askContextPreview ? (
          <Suspense fallback={null}>
            <DashboardAskContextPreview preview={askContextPreview} />
          </Suspense>
        ) : null}
        <DashboardCaptureDatePicker
          customDate={captureDateOverride}
          selectedOffset={captureDateOffset}
          onSelect={onSelectDateOffset}
        />
        <DashboardTemplatePicker
          selectedKind={selectedKind}
          selectedTemplateId={selectedTemplateId}
          onSelect={onSelectTemplate}
        />
        <div className="vault-dashboard__capture-actions">
          <div className="vault-dashboard__capture-kinds">
            {CAPTURE_KIND_CONFIGS.map((config) => (
              <CapturePill
                key={config.kind}
                kind={config.kind}
                selected={selectedKind === config.kind}
                onSelect={onSelectKind}
              />
            ))}
          </div>
          <Button
            type="submit"
            className="vault-dashboard__capture-submit"
            disabled={busy}
            data-testid="dashboard-capture-submit"
          >
            {busy ? 'Capturing...' : 'Capture'}
          </Button>
        </div>
      </form>
    </div>
  )
}
