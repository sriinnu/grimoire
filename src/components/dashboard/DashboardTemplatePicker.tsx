import { Button } from '@/components/ui/button'
import type { CaptureKind } from '../../utils/dashboardCapture'
import {
  DREAM_TEMPLATE_OPTIONS,
  JOURNAL_TEMPLATE_OPTIONS,
  type DashboardCaptureTemplateId,
} from '../../utils/noteTemplates'
import './DashboardTemplatePicker.css'

interface DashboardTemplatePickerProps {
  selectedKind: CaptureKind
  selectedTemplateId: DashboardCaptureTemplateId | null
  onSelect: (templateId: DashboardCaptureTemplateId) => void
}

/** Compact template selector for date-oriented dashboard captures. */
export function DashboardTemplatePicker({
  selectedKind,
  selectedTemplateId,
  onSelect,
}: DashboardTemplatePickerProps) {
  const options = selectedKind === 'journal'
    ? JOURNAL_TEMPLATE_OPTIONS
    : selectedKind === 'dream'
      ? DREAM_TEMPLATE_OPTIONS
      : []

  if (options.length === 0) return null

  return (
    <div className="vault-dashboard__template-picker" aria-label={`${selectedKind} template`}>
      <span className="vault-dashboard__template-label">Template</span>
      <div className="vault-dashboard__template-options">
        {options.map((option) => (
          <Button
            key={option.id}
            type="button"
            variant={selectedTemplateId === option.id ? 'secondary' : 'ghost'}
            className="vault-dashboard__template-option"
            aria-pressed={selectedTemplateId === option.id}
            data-testid={`dashboard-template-${option.id}`}
            onClick={() => onSelect(option.id)}
          >
            <strong>{option.label}</strong>
            <span>{option.detail}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
