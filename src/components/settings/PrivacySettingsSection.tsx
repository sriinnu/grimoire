import { useEffect, useState } from 'react'
import {
  isCloudTranscriptionProvider,
  TRANSCRIPTION_PROVIDERS,
  type TranscriptionProviderId,
} from '../../lib/transcriptionProviders'
import { getTranscriptionReadiness, type TranscriptionReadiness } from '../../utils/transcriptionReadiness'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Switch } from '../ui/switch'
import {
  SettingsGroup,
  SettingsRow,
  SettingsSectionTitle,
} from './primitives/SettingsGroup'
import type { SettingsBodyProps, SettingsTranslate } from './settingsTypes'

interface PrivacyRunwayStep {
  detail: string
  label: string
  state: string
}

function buildPrivacyRunwaySteps({
  cloudTranscriptionEnabled,
  t,
}: {
  cloudTranscriptionEnabled: boolean
  t: SettingsTranslate
}): PrivacyRunwayStep[] {
  return [
    {
      detail: t('settings.privacy.runway.localDetail'),
      label: t('settings.privacy.runway.localLabel'),
      state: t('settings.privacy.runway.private'),
    },
    {
      detail: t('settings.privacy.cloudTranscriptionDescription'),
      label: t('settings.privacy.cloudTranscription'),
      state: cloudTranscriptionEnabled
        ? t('settings.privacy.runway.cloudAllowed')
        : t('settings.privacy.runway.cloudBlocked'),
    },
  ]
}

function TranscriptionReadinessRow({
  cloudTranscriptionEnabled,
  readiness,
  t,
  transcriptionProvider,
}: {
  cloudTranscriptionEnabled: boolean
  readiness: TranscriptionReadiness | null
  t: SettingsTranslate
  transcriptionProvider: TranscriptionProviderId
}) {
  return (
    <div
      className="text-[11px] leading-relaxed text-muted-foreground"
      data-testid="settings-transcription-readiness"
      data-readiness={readiness?.status ?? 'checking'}
    >
      <div className="text-[13px] text-foreground">{t('settings.privacy.transcriptionReadiness')}</div>
      <div>{readiness?.message ?? t('settings.privacy.transcriptionChecking')}</div>
      {readiness ? (
        <div className="mt-1 grid gap-1">
          <span>{readiness.ready ? t('settings.privacy.transcriptionReady') : t('settings.privacy.transcriptionNotReady')}</span>
          {readiness.cliPath ? <span>{t('settings.privacy.transcriptionCli')}: {readiness.cliPath}</span> : null}
          {readiness.modelPath ? <span>{t('settings.privacy.transcriptionModel')}: {readiness.modelPath}</span> : null}
          {!readiness.ready && readiness.installHint ? <span>{readiness.installHint}</span> : null}
        </div>
      ) : null}
      {isCloudTranscriptionProvider(transcriptionProvider) && !cloudTranscriptionEnabled ? (
        <div className="mt-1">{t('settings.privacy.cloudTranscriptionDescription')}</div>
      ) : null}
    </div>
  )
}

/** Renders the local-first privacy story and the one explicit cloud opt-in. */
export function PrivacySettingsSection({
  t,
  transcriptionProvider,
  setTranscriptionProvider,
  cloudTranscriptionEnabled,
  setCloudTranscriptionEnabled,
}: Pick<
  SettingsBodyProps,
  | 't'
  | 'transcriptionProvider'
  | 'setTranscriptionProvider'
  | 'cloudTranscriptionEnabled'
  | 'setCloudTranscriptionEnabled'
>) {
  const [readiness, setReadiness] = useState<TranscriptionReadiness | null>(null)
  const transcriptionProviderOptions = TRANSCRIPTION_PROVIDERS.map((provider) => ({
    value: provider.id,
    label: provider.label,
    disabled: isCloudTranscriptionProvider(provider.id) && !cloudTranscriptionEnabled,
  }))

  useEffect(() => {
    let cancelled = false
    setReadiness(null)
    getTranscriptionReadiness({
      provider: transcriptionProvider,
      cloudTranscriptionEnabled,
    })
      .then((result) => {
        if (!cancelled) setReadiness(result)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setReadiness({
          provider: transcriptionProvider,
          ready: false,
          status: 'error',
          message: error instanceof Error ? error.message : 'Failed to check local transcription.',
          installHint: 'Check the local Whisper installation.',
        })
      })
    return () => { cancelled = true }
  }, [cloudTranscriptionEnabled, transcriptionProvider])

  return (
    <div className="settings-hig-stack">
      <SettingsSectionTitle>{t('settings.privacy.title')}</SettingsSectionTitle>

      <SettingsGroup footnote={t('settings.privacy.description')}>
        <SettingsRow
          label={t('settings.privacy.localOnly')}
          description={t('settings.privacy.localOnlyDescription')}
          testId="settings-privacy-local-note"
        />
      </SettingsGroup>

      <div data-testid="settings-privacy-runway">
        <SettingsGroup>
          {buildPrivacyRunwaySteps({ cloudTranscriptionEnabled, t }).map((step) => (
            <SettingsRow key={step.label} label={step.label} description={step.detail}>
              <span className="text-[11px] font-medium text-muted-foreground">{step.state}</span>
            </SettingsRow>
          ))}
        </SettingsGroup>
      </div>

      <SettingsGroup title={t('settings.privacy.transcriptionGroup')}>
        <SettingsRow
          label={t('settings.privacy.cloudTranscription')}
          description={t('settings.privacy.cloudTranscriptionDescription')}
          testId="settings-cloud-transcription"
        >
          <Switch
            checked={cloudTranscriptionEnabled}
            onCheckedChange={setCloudTranscriptionEnabled}
            aria-label={t('settings.privacy.cloudTranscription')}
          />
        </SettingsRow>
        <SettingsRow label={t('settings.privacy.transcriptionProvider')}>
          <Select
            value={transcriptionProvider}
            onValueChange={(value) => setTranscriptionProvider(value as TranscriptionProviderId)}
          >
            <SelectTrigger
              className="w-56 bg-transparent"
              aria-label={t('settings.privacy.transcriptionProvider')}
              data-testid="settings-transcription-provider"
              data-value={transcriptionProvider}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" data-anchor-strategy="popper">
              {transcriptionProviderOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow fullWidth>
          <TranscriptionReadinessRow
            cloudTranscriptionEnabled={cloudTranscriptionEnabled}
            readiness={readiness}
            t={t}
            transcriptionProvider={transcriptionProvider}
          />
        </SettingsRow>
      </SettingsGroup>
    </div>
  )
}
