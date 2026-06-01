import { FolderOpen, Plus, Rocket } from 'lucide-react'
import { OnboardingShell } from './OnboardingShell'
import { Button } from '@/components/ui/button'
import type { WelcomeScreenProps } from './welcome/WelcomeScreenTypes'
import { WelcomeOptionButton } from './welcome/WelcomeOptionButton'
import { getWelcomeScreenPresentation } from './welcome/welcomeScreenModel'
import {
  CARD_STYLE,
  DIVIDER_STYLE,
  ERROR_BLOCK_STYLE,
  ERROR_STYLE,
  ICON_WRAP_STYLE,
  RETRY_BUTTON_STYLE,
  STATUS_STYLE,
  SUBTITLE_STYLE,
  TITLE_STYLE,
} from './welcome/welcomeScreenStyles'
import { useWelcomeActionButtons } from './welcome/useWelcomeActionButtons'

function WelcomeHero({
  heroBackground,
  heroIcon,
  title,
  subtitle,
}: ReturnType<typeof getWelcomeScreenPresentation>) {
  return (
    <>
      <div
        style={{
          ...ICON_WRAP_STYLE,
          background: heroBackground,
        }}
      >
        {heroIcon}
      </div>

      <div style={{ textAlign: 'center' }}>
        <h1 style={TITLE_STYLE}>{title}</h1>
        <p style={{ ...SUBTITLE_STYLE, marginTop: 8 }}>
          {subtitle}
        </p>
      </div>
    </>
  )
}

function WelcomeError({
  error,
  canRetryTemplate,
  onRetryCreateVault,
}: Pick<WelcomeScreenProps, 'error' | 'canRetryTemplate' | 'onRetryCreateVault'>) {
  if (!error) return null
  return (
    <div style={ERROR_BLOCK_STYLE}>
      <p style={ERROR_STYLE} data-testid="welcome-error" role="alert" aria-live="assertive">
        {error}
      </p>
      {canRetryTemplate && (
        <Button
          type="button"
          variant="outline"
          style={RETRY_BUTTON_STYLE}
          onClick={onRetryCreateVault}
          data-testid="welcome-retry-template"
          className="shadow-none"
        >
          Retry download
        </Button>
      )}
    </div>
  )
}

export function WelcomeScreen({
  mode,
  defaultVaultPath,
  onCreateVault,
  onRetryCreateVault,
  onCreateEmptyVault,
  onOpenFolder,
  isOffline,
  creatingAction,
  error,
  canRetryTemplate,
}: WelcomeScreenProps) {
  const busy = creatingAction !== null
  const presentation = getWelcomeScreenPresentation(mode, defaultVaultPath, isOffline)
  const { templateActionRef, createEmptyActionRef, openFolderActionRef } = useWelcomeActionButtons({
    mode,
    busy,
    isOffline,
    onCreateEmptyVault,
    onOpenFolder,
    onCreateVault,
  })

  return (
    <OnboardingShell
      style={{ background: 'var(--sidebar)' }}
      contentStyle={CARD_STYLE}
      testId="welcome-screen"
    >
      <>
        <WelcomeHero {...presentation} />

        <div style={DIVIDER_STYLE} />

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <WelcomeOptionButton
            icon={<Rocket size={18} style={{ color: 'var(--accent-purple)' }} />}
            iconBg="var(--accent-purple-light)"
            label="Get started with a template"
            description={presentation.templateDescription}
            loadingLabel="Downloading template…"
            loadingDescription="Cloning the Getting Started vault template"
            onClick={onCreateVault}
            disabled={busy || isOffline}
            loading={creatingAction === 'template'}
            testId="welcome-create-vault"
            autoFocus
            buttonRef={templateActionRef}
          />

          <WelcomeOptionButton
            icon={<Plus size={18} style={{ color: 'var(--accent-blue)' }} />}
            iconBg="var(--accent-blue-light)"
            label="Create empty vault"
            description={presentation.emptyVaultDescription}
            loadingLabel="Creating vault…"
            loadingDescription="Preparing Grimoire defaults in the selected folder"
            onClick={onCreateEmptyVault}
            disabled={busy}
            loading={creatingAction === 'empty'}
            testId="welcome-create-new"
            buttonRef={createEmptyActionRef}
          />

          <WelcomeOptionButton
            icon={<FolderOpen size={18} style={{ color: 'var(--accent-green)' }} />}
            iconBg="var(--accent-green-light)"
            label={presentation.openFolderLabel}
            description={presentation.openFolderDescription}
            onClick={onOpenFolder}
            disabled={busy}
            testId="welcome-open-folder"
            buttonRef={openFolderActionRef}
          />
        </div>

        {creatingAction === 'template' && (
          <p style={STATUS_STYLE} data-testid="welcome-status" role="status" aria-live="polite">
            Downloading the Getting Started vault template…
          </p>
        )}

        <WelcomeError
          error={error}
          canRetryTemplate={canRetryTemplate}
          onRetryCreateVault={onRetryCreateVault}
        />
      </>
    </OnboardingShell>
  )
}
