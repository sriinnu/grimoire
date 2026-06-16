import { Check } from '@phosphor-icons/react'
import type { ThemePreset } from '../lib/appearance'
import { Button } from './ui/button'
import type { PresetOption } from './appearanceSettingsOptions'
import { buildProfileTraitViews } from './appearanceProfileTraits'

interface AppearanceProfileCardProps {
  option: PresetOption
  selected: boolean
  onSelect: (value: ThemePreset) => void
}

/** Radio-card for choosing a complete shell, writing, graph, and canvas profile. */
export function AppearanceProfileCard({ option, selected, onSelect }: AppearanceProfileCardProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      role="radio"
      aria-checked={selected}
      data-testid={`settings-theme-preset-${option.value}`}
      data-canvas={option.canvasStyle}
      data-code-block={option.codeBlockStyle}
      data-density={option.densityScale}
      data-group={option.group}
      data-graph={option.graphStyle}
      data-motion={option.motionProfile}
      data-selected={selected ? 'true' : 'false'}
      data-shell={option.shellStyle}
      data-writing={option.writingStyle}
      className={
        selected
          ? 'settings-theme-preset-card h-auto min-w-0 justify-start whitespace-normal rounded-md border p-3 text-left shadow-xs'
          : 'settings-theme-preset-card h-auto min-w-0 justify-start whitespace-normal rounded-md border p-3 text-left'
      }
      onClick={() => onSelect(option.value)}
    >
      <span className="flex min-w-0 w-full flex-col gap-2">
        <span className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 break-words" style={{ fontSize: 12, fontWeight: 600 }}>
            {option.label}
          </span>
          {selected ? <Check size={14} weight="bold" /> : null}
        </span>
        <span className="flex gap-1">
          {option.swatches.map((swatch) => (
            <span
              key={swatch}
              className="h-4 flex-1 rounded-sm border border-border"
              style={{ background: swatch }}
            />
          ))}
        </span>
        <ProfileTraits option={option} />
        <span className="min-w-0 break-words" style={{ color: 'var(--muted-foreground)', fontSize: 11, lineHeight: 1.35 }}>
          {option.description}
        </span>
      </span>
    </Button>
  )
}

function ProfileTraits({ option }: { option: PresetOption }) {
  return (
    <span
      className="settings-theme-preset-card__traits"
      data-testid={`settings-theme-preset-${option.value}-traits`}
    >
      {buildProfileTraitViews(option).map((trait) => (
        <span
          key={trait.key}
          className="settings-theme-preset-card__trait"
          aria-label={`${trait.label}: ${trait.value}`}
        >
          {trait.icon}
          <span>{trait.value}</span>
        </span>
      ))}
    </span>
  )
}
