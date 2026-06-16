import { Check, Palette } from 'lucide-react'
import { DEFAULT_THEME_PRESET, type ThemePreset } from '@/lib/appearance'
import { createTranslator } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { buildPresetOptions, type PresetOption } from './appearanceSettingsOptions'
import './create-vault-dialog.css'

const EXPERIENCE_PROFILE_OPTIONS = buildPresetOptions(createTranslator('en'))

function getExperienceProfileOption(profile: ThemePreset): PresetOption {
  const option = EXPERIENCE_PROFILE_OPTIONS.find((candidate) => candidate.value === profile)
    ?? EXPERIENCE_PROFILE_OPTIONS.find((candidate) => candidate.value === DEFAULT_THEME_PRESET)
    ?? EXPERIENCE_PROFILE_OPTIONS[0]
  if (!option) throw new Error('No Grimoire experience profiles configured.')
  return option
}

/** Renders the complete shell/writing/graph experience profile chooser for new notebooks. */
export function CreateVaultExperienceProfilePicker({
  value,
  onChange,
}: {
  value: ThemePreset
  onChange: (value: ThemePreset) => void
}) {
  const selectedExperienceOption = getExperienceProfileOption(value)

  return (
    <div
      className="create-vault-profile grid gap-3"
      data-testid="create-vault-experience-section"
      data-theme-preset-preview={selectedExperienceOption.value}
    >
      <div className="create-vault-profile__heading">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Palette className="size-3.5" />
          Theme preview
        </div>
        <div className="create-vault-profile__title-row">
          <div className="create-vault-profile__title-copy">
            <div className="create-vault-profile__title">{selectedExperienceOption.label}</div>
            <div
              className="create-vault-profile__subtitle"
              data-testid="create-vault-experience-preview"
              data-theme-preset-preview={selectedExperienceOption.value}
            >
              Shell, graph, editor, and motion all shift together.
            </div>
          </div>
          <span className="create-vault-profile__swatches" aria-hidden="true">
            {selectedExperienceOption.swatches.map((swatch) => (
              <span key={swatch} style={{ background: swatch }} />
            ))}
          </span>
        </div>
      </div>

      <div
        className="create-vault-profile__grid"
        role="radiogroup"
        aria-label="Experience profile"
        data-testid="create-vault-experience-grid"
      >
        {EXPERIENCE_PROFILE_OPTIONS.map((option) => (
          <ExperienceProfileCard
            key={option.value}
            option={option}
            selected={option.value === value}
            onSelect={onChange}
          />
        ))}
      </div>
    </div>
  )
}

function ExperienceProfileCard({
  option,
  selected,
  onSelect,
}: {
  option: PresetOption
  selected: boolean
  onSelect: (value: ThemePreset) => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      role="radio"
      aria-checked={selected}
      className="create-vault-profile-card h-auto justify-start rounded-md border p-2 text-left"
      data-selected={selected ? 'true' : 'false'}
      data-testid={`create-vault-experience-${option.value}`}
      data-theme-preset-preview={option.value}
      onClick={() => onSelect(option.value)}
    >
      <span className="flex min-w-0 w-full flex-col gap-2">
        <span
          className="create-vault-profile-card__window"
          data-canvas-preview={option.canvasStyle}
          data-density-preview={option.densityScale}
          data-graph-preview={option.graphStyle}
          data-motion-preview={option.motionProfile}
          data-shell-preview={option.shellStyle}
          data-writing-preview={option.writingStyle}
        >
          <span className="create-vault-profile-card__traffic" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="create-vault-profile-card__window-layout" aria-hidden="true">
            <span className="create-vault-profile-card__window-rail" style={{ background: option.swatches[1] }} />
            <span className="create-vault-profile-card__window-page" style={{ background: option.swatches[0] }}>
              <span />
              <span />
              <span />
            </span>
            <span className="create-vault-profile-card__window-brain">
              <span style={{ background: option.swatches[2] }} />
              <span style={{ background: option.swatches[2] }} />
              <span style={{ background: option.swatches[2] }} />
            </span>
          </span>
          {selected ? (
            <span className="create-vault-profile-card__check" aria-hidden="true">
              <Check className="size-3.5" />
            </span>
          ) : null}
        </span>
        <span className="create-vault-profile-card__label">{option.label}</span>
      </span>
    </Button>
  )
}
