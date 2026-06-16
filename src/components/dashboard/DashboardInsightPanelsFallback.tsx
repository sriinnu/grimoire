import './DreamForgePanel.css'

/** Local-only placeholder shown while private notebook insight panels lazy-load. */
export function DashboardInsightPanelsFallback() {
  return (
    <>
      <div
        className="vault-dashboard__panel vault-dashboard__dream-forge"
        data-locality="local-only"
        data-private-surface="dream-forge"
        data-testid="dashboard-insights-fallback"
      >
        <div className="vault-dashboard__panel-label">Dream Review</div>
        <div className="vault-dashboard__insight-badges">
          <span className="vault-dashboard__privacy-chip">Local only</span>
          <span className="vault-dashboard__privacy-chip">No cloud</span>
          <span className="vault-dashboard__privacy-chip">Egress blocked</span>
        </div>
        <div className="vault-dashboard__empty">Preparing private pattern view with dream bodies and paths held.</div>
      </div>
      <div className="vault-dashboard__panel">
        <div className="vault-dashboard__panel-label">Trail</div>
        <div className="vault-dashboard__empty">Preparing local trail.</div>
      </div>
    </>
  )
}
