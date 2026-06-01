import { FileCheck2, ShieldCheck, Sparkles } from 'lucide-react'
import type { DashboardAskContextPreview as DashboardAskContextPreviewModel } from '../../utils/dashboardAskContext'
import './DashboardAskContextPreview.css'

interface DashboardAskContextPreviewProps {
  preview: DashboardAskContextPreviewModel
}

/** Shows the exact safe local context attached to a dashboard ask. */
export function DashboardAskContextPreview({ preview }: DashboardAskContextPreviewProps) {
  const visibleLabel = preview.references.length === 1 ? '1 public note' : `${preview.references.length} public notes`
  const protectedLabel = preview.protectedCount === 1
    ? '1 protected note withheld'
    : `${preview.protectedCount} protected notes withheld`
  const protectedMemoryLabel = preview.protectedMemoryCount === 1
    ? '1 protected memory withheld'
    : `${preview.protectedMemoryCount} protected memories withheld`

  return (
    <div className="vault-dashboard__ask-preview" data-testid="dashboard-ask-context-preview">
      <div className="vault-dashboard__ask-preview-head">
        <span>
          <Sparkles size={13} />
          Agent Context
        </span>
        <span>{visibleLabel}</span>
      </div>
      {preview.references.length > 0 ? (
        <div className="vault-dashboard__ask-preview-chips" aria-label="Attached public notes">
          {preview.references.map((reference) => (
            <span key={reference.path} className="vault-dashboard__ask-preview-chip">
              {reference.title}
            </span>
          ))}
        </div>
      ) : (
        <p className="vault-dashboard__ask-preview-copy">No public notes are attached yet.</p>
      )}
      {preview.memoryReferences.length > 0 ? (
        <div className="vault-dashboard__ask-preview-chips" aria-label="Attached memory records">
          {preview.memoryReferences.slice(0, 2).map((memory) => (
            <span key={memory.path} className="vault-dashboard__ask-preview-chip">
              {memory.title}
            </span>
          ))}
        </div>
      ) : null}
      {preview.intent ? (
        <div className="vault-dashboard__ask-preview-intent" aria-label="Ask intent">
          <FileCheck2 size={13} />
          <span>
            <strong>{preview.intent.label}</strong>
            Review-before-write Markdown memory; public references only.
          </span>
        </div>
      ) : null}
      <div className="vault-dashboard__ask-preview-rule">
        <ShieldCheck size={13} />
        {protectedLabel}; {protectedMemoryLabel}. Only listed public references can travel.
      </div>
    </div>
  )
}
