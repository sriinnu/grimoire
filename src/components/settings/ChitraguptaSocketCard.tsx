import { useLayoutEffect, useRef, useState } from 'react'
import { describeChitraguptaSocketStatus } from '../../lib/chitraguptaSocket'
import { readInvitationImage, validateGrimoireInvitation } from '../../lib/chitraguptaInvitation'
import { useChitraguptaPairing } from '../../hooks/useChitraguptaPairing'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { SettingsActionRow, SettingsGroup, SettingsRow } from './primitives/SettingsGroup'
import type { SettingsTranslate } from './settingsTypes'

export function ChitraguptaSocketCard({ t, vaultPath }: { t: SettingsTranslate; vaultPath?: string }) {
  const { status, phase, error, connect, checkConnection } = useChitraguptaPairing(vaultPath)
  const [code, setCode] = useState('')
  const [invitation, setInvitation] = useState('')
  const [freshInvitation, setFreshInvitation] = useState(false)
  const [mode, setMode] = useState<'code' | 'invitation'>('code')
  const [importError, setImportError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const importGeneration = useRef(0)
  const picker = useRef<HTMLInputElement>(null)
  const configuredOrigin = useRef('http://127.0.0.1:3141')
  if (status?.baseUrl) configuredOrigin.current = status.baseUrl
  // Layout effect, not a passive one: a deferred reset could land after the user has already
  // typed a code or chosen a fresh invitation for the new status, and silently wipe it.
  useLayoutEffect(() => {
    importGeneration.current++
    setCode(''); setInvitation(''); setImportError(null); setImporting(false); setFreshInvitation(false)
    return () => { importGeneration.current++ }
  }, [vaultPath, status?.state, status?.reason])
  const revoked = (status?.reason === 'pairing' && status.state === 'revoked') || !!error?.startsWith('PAIRING_REVOKED:')
  const recovery = !freshInvitation && (status?.state === 'renewal_indeterminate' || !!error?.startsWith('RENEWAL_INDETERMINATE:'))
  const repairPairing = !revoked && !recovery && (freshInvitation || (status?.reason === 'pairing' && status.state === 'expired') || !!error?.startsWith('REPAIR_REQUIRED:'))
  const pairingRequired = !revoked && (status?.state === 'pairing_required' || repairPairing)
  const requestApproval = !revoked && !repairPairing && !!status && ['denied', 'revoked', 'expired'].includes(status.state)
  const busy = phase === 'provisioning' || importing
  const origin = configuredOrigin.current
  const submit = async () => {
    let proof: string | undefined
    try { if (pairingRequired && mode === 'invitation') proof = validateGrimoireInvitation(invitation.trim(), origin) }
    catch (failure) { setImportError((failure as Error).message); return }
    const pairingCode = pairingRequired && mode === 'code' ? code.trim() : ''
    setCode(''); setInvitation(''); setImportError(null)
    await connect(pairingCode || undefined, {
      ...(proof ? { pairingInvitation: proof } : {}),
      ...(repairPairing ? { reconnect: true } : requestApproval ? { requestApproval: true } : {}),
    })
  }
  const importImage = async (file?: File) => {
    if (!file) return
    const generation = ++importGeneration.current
    setImporting(true); setImportError(null); setInvitation('')
    try {
      const value = validateGrimoireInvitation(await readInvitationImage(file), origin)
      if (generation === importGeneration.current) setInvitation(value)
    } catch (failure) {
      if (generation === importGeneration.current) setImportError((failure as Error).message)
    } finally { if (generation === importGeneration.current) setImporting(false) }
  }

  return (
    <SettingsGroup title={t('settings.aiAgents.chitraguptaSocketTitle')} testId="settings-chitragupta-socket"
      footnote={t('settings.aiAgents.chitraguptaSocketDescription')}>
      <SettingsRow label={<span data-testid="settings-chitragupta-socket-status">{!vaultPath ? 'Select a vault to connect' : phase === 'error' ? 'Connection needs attention' : describeChitraguptaSocketStatus(status)}</span>}
        description={error ? <span className="text-[var(--feedback-error-text)]">{error}</span> : <span>{vaultPath}{status?.chatReady === false ? ' · Model availability is checked when you ask.' : ''}</span>} />
      <SettingsActionRow stacked label={t('settings.aiAgents.chitraguptaSocketConnect')}
        description={status?.state === 'approval_required'
          ? <span data-testid="settings-chitragupta-socket-waiting">{t('settings.aiAgents.chitraguptaSocketWaiting')}</span>
          : revoked ? 'This device was revoked. Review it in Chitragupta Hub; a new code cannot restore it.'
            : recovery ? 'Recover the existing renewal acknowledgement. Your device and session history are retained.'
              : t('settings.aiAgents.chitraguptaSocketConnectHint')}
        actions={<>
          {recovery && error?.startsWith('RENEWAL_INDETERMINATE:') ? <Button variant="outline" size="sm" disabled={busy}
            onClick={() => { setFreshInvitation(true); setMode('code') }}>Use a fresh code or invitation</Button> : null}
          {pairingRequired ? <div className="flex w-full flex-col gap-2">
            <div className="flex gap-2">
              <Button size="sm" variant={mode === 'code' ? 'default' : 'outline'} onClick={() => { importGeneration.current++; setImporting(false); setMode('code'); setInvitation(''); setImportError(null) }}>Use code</Button>
              <Button size="sm" variant={mode === 'invitation' ? 'default' : 'outline'} onClick={() => { setMode('invitation'); setCode('') }}>Use invitation or QR</Button>
            </div>
            {mode === 'code' ? <Input type="text" inputMode="numeric" autoComplete="off" maxLength={6}
              value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              aria-label="Six-digit pairing code" data-testid="settings-chitragupta-pairing-code" className="w-32" />
              : <>
                <Input type="password" autoComplete="off" maxLength={4096} value={invitation}
                  onChange={(event) => { importGeneration.current++; setImporting(false); setInvitation(event.target.value); setImportError(null) }} aria-label="Pairing invitation link" />
                <input ref={picker} type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label="QR invitation image"
                  onChange={(event) => { void importImage(event.target.files?.[0]); event.target.value = '' }} />
                <Button variant="outline" size="sm" disabled={busy} onClick={() => picker.current?.click()}>Import QR image</Button>
                <span className="text-xs text-[var(--text-muted)]">Import a QR image from this Mac, or paste its invitation link. Images stay on this device.</span>
              </>}
            {importError ? <span role="alert" className="text-[var(--feedback-error-text)]">{importError}</span> : null}
          </div> : null}
          <Button variant="outline" size="sm" disabled={!vaultPath || busy}
            onClick={() => void checkConnection()} data-testid="settings-chitragupta-socket-check">
            {t('settings.aiAgents.chitraguptaSocketCheck')}
          </Button>
          {status?.state !== 'ready' && !revoked ? <Button size="sm" disabled={!vaultPath || busy || (pairingRequired && (mode === 'code' ? !/^\d{6}$/.test(code) : !invitation.trim()))}
            onClick={() => void submit()} data-testid="settings-chitragupta-socket-connect">
            {busy ? t('settings.aiAgents.chitraguptaSocketConnecting') : recovery ? 'Recover connection' : repairPairing ? 'Pair again' : requestApproval ? 'Request access again' : t('settings.aiAgents.chitraguptaSocketConnect')}
          </Button> : null}
        </>} />
    </SettingsGroup>
  )
}
