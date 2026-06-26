import { useEffect, useState } from 'react'
import {
  isCloudTranscriptionProvider,
  TRANSCRIPTION_PROVIDERS,
  type TranscriptionProviderId,
} from '../../lib/transcriptionProviders'
import { getTranscriptionReadiness, type TranscriptionReadiness } from '../../utils/transcriptionReadiness'
import { LabeledSelect, SectionHeading, SettingsSwitchRow } from './SettingsControls'
import type { SettingsBodyProps, SettingsTranslate } from './settingsTypes'

type PrivacyRunwayTone = 'local' | 'cloud' | 'diagnostic'

interface PrivacyRunwayStep {
  detail: string
  label: string
  state: string
  tone: PrivacyRunwayTone
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
      tone: 'local',
    },
    {
      detail: t('settings.privacy.cloudTranscriptionDescription'),
      label: t('settings.privacy.cloudTranscription'),
      state: cloudTranscriptionEnabled
        ? t('settings.privacy.runway.cloudAllowed')
        : t('settings.privacy.runway.cloudBlocked'),
      tone: cloudTranscriptionEnabled ? 'cloud' : 'local',
    },
  ]
}

function PrivacyRunway({
  cloudTranscriptionEnabled,
  t,
}: {
  cloudTranscriptionEnabled: boolean
  t: SettingsTranslate
}) {
  return (
    <div className="settings-privacy-runway" data-testid="settings-privacy-runway">
      {buildPrivacyRunwaySteps({ cloudTranscriptionEnabled, t }).map((step) => (
        <div
          className="settings-privacy-runway__step rounded-md border px-3 py-2.5"
          data-privacy-runway-tone={step.tone}
          key={step.label}
        >
          <div className="settings-privacy-runway__state">{step.state}</div>
          <div className="settings-privacy-runway__label">{step.label}</div>
          <div className="settings-privacy-runway__detail">{step.detail}</div>
        </div>
      ))}
    </div>
  )
}

function TranscriptionReadinessCard({
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
  const tone = readiness?.ready ? 'local' : 'diagnostic'
  return (
    <div
      className="settings-material-card rounded-md border px-3 py-2 text-[11px] leading-relaxed text-muted-foreground"
      data-testid="settings-transcription-readiness"
      data-readiness={readiness?.status ?? 'checking'}
      data-privacy-runway-tone={tone}
    >
      <div className="font-medium text-foreground">{t('settings.privacy.transcriptionReadiness')}</div>
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
    <>
      <SectionHeading
        title={t('settings.privacy.title')}
        description={t('settings.privacy.description')}
      />

      <div
        className="settings-material-card rounded-md border px-3.5 py-3 leading-relaxed"
        data-testid="settings-privacy-local-note"
        data-privacy-runway-tone="local"
      >
        <div className="text-[13px] font-semibold text-foreground">{t('settings.privacy.localOnly')}</div>
        <div className="mt-1 text-[12px] text-muted-foreground">{t('settings.privacy.localOnlyDescription')}</div>
      </div>

      <PrivacyRunway
        cloudTranscriptionEnabled={cloudTranscriptionEnabled}
        t={t}
      />

      <SettingsSwitchRow
        label={t('settings.privacy.cloudTranscription')}
        description={t('settings.privacy.cloudTranscriptionDescription')}
        checked={cloudTranscriptionEnabled}
        onChange={setCloudTranscriptionEnabled}
        testId="settings-cloud-transcription"
      />

      <LabeledSelect
        label={t('settings.privacy.transcriptionProvider')}
        value={transcriptionProvider}
        onValueChange={(value) => setTranscriptionProvider(value as TranscriptionProviderId)}
        options={transcriptionProviderOptions}
        testId="settings-transcription-provider"
      />

      <TranscriptionReadinessCard
        cloudTranscriptionEnabled={cloudTranscriptionEnabled}
        readiness={readiness}
        t={t}
        transcriptionProvider={transcriptionProvider}
      />
    </>
  )
}
