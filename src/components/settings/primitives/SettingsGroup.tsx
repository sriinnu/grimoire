import type { ReactNode } from 'react'

/**
 * macOS System Settings-style grouped-form primitives.
 *
 * Composition model:
 * - `SettingsSectionTitle` — one 15px semibold title at the top of a pane.
 * - `SettingsGroup` — the inset grouped container; children render as rows
 *   separated by inset hairline dividers (CSS-owned, no divider elements).
 * - `SettingsRow` — label/description left, control pinned right; or
 *   `fullWidth` for the rare picker/preview/key-field content.
 * - `SettingsActionRow` — label/description left, small trailing buttons right.
 *
 * Styling lives in src/theme-settings-groups.css.
 */

/** 15px semibold title that sits at the top of a settings pane. */
export function SettingsSectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="settings-section-title">{children}</h2>
}

/**
 * Inset grouped container: hairline border, one surface step from the panel.
 * `title` sits above the group; `footnote` carries explanatory prose below it.
 */
export function SettingsGroup({
  title,
  footnote,
  children,
  testId,
}: {
  title?: ReactNode
  footnote?: ReactNode
  children: ReactNode
  testId?: string
}) {
  return (
    <section className="settings-group-block" data-testid={testId}>
      {title != null ? <h3 className="settings-group-title">{title}</h3> : null}
      <div className="settings-group" role="group">
        {children}
      </div>
      {footnote != null ? (
        <div className="settings-group-footnote">{footnote}</div>
      ) : null}
    </section>
  )
}

/**
 * One setting: label (plus optional description) left, control pinned right.
 * `fullWidth` stacks label above full-width content for pickers and previews.
 */
export function SettingsRow({
  label,
  description,
  children,
  fullWidth = false,
  testId,
}: {
  label?: ReactNode
  description?: ReactNode
  children?: ReactNode
  fullWidth?: boolean
  testId?: string
}) {
  if (fullWidth) {
    return (
      <div className="settings-row" data-variant="full" data-testid={testId}>
        {label != null || description != null ? (
          <SettingsRowText label={label} description={description} />
        ) : null}
        {children != null ? (
          <div className="settings-row__content">{children}</div>
        ) : null}
      </div>
    )
  }
  return (
    <div className="settings-row" data-testid={testId}>
      <SettingsRowText label={label} description={description} />
      <div className="settings-row__control">{children}</div>
    </div>
  )
}

/** Label/description left with one or two small trailing action buttons. */
export function SettingsActionRow({
  label,
  description,
  actions,
  testId,
}: {
  label: ReactNode
  description?: ReactNode
  actions: ReactNode
  testId?: string
}) {
  return (
    <div className="settings-row" data-testid={testId}>
      <SettingsRowText label={label} description={description} />
      <div className="settings-row__actions">{actions}</div>
    </div>
  )
}

function SettingsRowText({
  label,
  description,
}: {
  label?: ReactNode
  description?: ReactNode
}) {
  return (
    <div className="settings-row__text">
      {label != null ? <div className="settings-row__label">{label}</div> : null}
      {description != null ? (
        <div className="settings-row__description">{description}</div>
      ) : null}
    </div>
  )
}
