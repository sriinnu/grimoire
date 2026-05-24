import type { ReactNode } from 'react'
import { Checkbox, type CheckedState } from '../ui/checkbox'
import { Input } from '../ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Switch } from '../ui/switch'
import { sanitizePositiveInteger } from './settingsDraft'

function isChecked(checked: CheckedState): boolean {
  return checked === true
}

/** Wraps one settings group with consistent spacing and optional divider. */
export function SettingsSection({
  children,
  id,
  showDivider = true,
}: {
  children: ReactNode
  id?: string
  showDivider?: boolean
}) {
  return (
    <section id={id} className="settings-section flex scroll-mt-6 flex-col gap-4 py-5">
      {showDivider ? <Divider /> : null}
      {children}
    </section>
  )
}

/** Renders a compact section title and explanatory line. */
export function SectionHeading({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[11px] font-bold uppercase text-muted-foreground">
        {title}
      </div>
      <div className="max-w-[560px] text-xs leading-relaxed text-muted-foreground">
        {description}
      </div>
    </div>
  )
}

/** Hairline divider used between settings groups. */
export function Divider() {
  return <div className="h-px bg-[color-mix(in_srgb,var(--border)_82%,transparent)]" />
}

/** Labelled shadcn Select wrapper with test-friendly metadata. */
export function LabeledSelect({
  label,
  value,
  onValueChange,
  options,
  testId,
  autoFocus = false,
}: {
  label: string
  value: string
  onValueChange: (value: string) => void
  options: Array<{ value: string; label: string; disabled?: boolean }>
  testId: string
  autoFocus?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-foreground">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          className="w-full bg-transparent"
          data-testid={testId}
          data-value={value}
          data-settings-autofocus={autoFocus ? 'true' : undefined}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" data-anchor-strategy="popper">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** Labelled numeric Input wrapper that clamps invalid values to the last good value. */
export function LabeledNumberInput({
  label,
  value,
  onValueChange,
  testId,
  disabled = false,
}: {
  label: string
  value: number
  onValueChange: (value: number) => void
  testId: string
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-foreground" htmlFor={testId}>{label}</label>
      <Input
        id={testId}
        type="number"
        min={1}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange(sanitizePositiveInteger(Number(event.target.value), value))}
        data-testid={testId}
        className="w-full bg-transparent"
      />
    </div>
  )
}

/** Switch row for binary settings. */
export function SettingsSwitchRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  testId,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  testId?: string
}) {
  return (
    <label
      className="flex items-start justify-between gap-3"
      style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
      data-testid={testId}
    >
      <div className="space-y-1">
        <div className="text-[13px] font-medium text-foreground">{label}</div>
        <div className="text-[11px] leading-relaxed text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} disabled={disabled} />
    </label>
  )
}

/** Checkbox-style telemetry toggle. */
export function TelemetryToggle({
  label,
  description,
  checked,
  onChange,
  testId,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
  testId: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3" data-testid={testId}>
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(isChecked(value))} />
      <div>
        <div className="text-[13px] font-medium text-foreground">{label}</div>
        <div className="text-[11px] leading-relaxed text-muted-foreground">{description}</div>
      </div>
    </label>
  )
}
