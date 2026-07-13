import type { ReactNode } from 'react'
import { NotebookTabs } from 'lucide-react'
import './DashboardHero.css'

interface DashboardHeroProps {
  /** Vault/notebook label rendered in the eyebrow row. */
  eyebrowLabel: string
  /** Primary display heading — the living notebook title. */
  title: string
  /** Sub-tagline beneath the heading. */
  tagline: string
  /** Optional control rendered beside the status pill (e.g. New Page). */
  action?: ReactNode
  /** Capture surface anchored under the hero copy. */
  children?: ReactNode
}

/**
 * Full-width hero band: warm card material with an aurora art layer at the
 * top-right, the living notebook title, and a Local & Private status pill.
 */
export function DashboardHero({ eyebrowLabel, title, tagline, action, children }: DashboardHeroProps) {
  return (
    <section className="dashboard-hero" data-testid="dashboard-hero">
      <div className="dashboard-hero__aurora" aria-hidden="true" />
      <div className="dashboard-hero__top">
        <div className="dashboard-hero__copy">
          <div className="dashboard-hero__eyebrow">
            <NotebookTabs size={14} aria-hidden="true" />
            <span>{eyebrowLabel}</span>
          </div>
          <h1 className="dashboard-hero__title">{title}</h1>
          <p className="dashboard-hero__tagline">{tagline}</p>
        </div>
        <div className="dashboard-hero__controls">
          <span className="dashboard-hero__pill" data-testid="dashboard-hero-privacy">
            <span className="dashboard-hero__pill-dot" aria-hidden="true" />
            Local &amp; Private
          </span>
          {action}
        </div>
      </div>
      {children ? <div className="dashboard-hero__capture-slot">{children}</div> : null}
    </section>
  )
}
