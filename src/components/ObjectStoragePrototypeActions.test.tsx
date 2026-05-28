import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createTranslator } from '../lib/i18n'
import { ObjectStoragePrototypeActions } from './ObjectStoragePrototypeActions'

describe('ObjectStoragePrototypeActions', () => {
  it('keeps S3 provider apply locked when the draft target drifts from the preview', () => {
    const onApplyS3ProviderPush = vi.fn()
    render(
      <ObjectStoragePrototypeActions
        t={createTranslator('en')}
        vaultReady
        busyAction={null}
        s3ProviderPushPreviewReady
        s3ProviderPushPreviewArgs={{ bucket: 'sriinnu-vault', region: 'us-east-1', prefix: 'notes' }}
        onApplyS3ProviderPush={onApplyS3ProviderPush}
      />,
    )

    fireEvent.click(screen.getByTestId('settings-object-storage-provider-s3'))
    fireEvent.change(screen.getByTestId('settings-s3-preflight-bucket'), { target: { value: 'sriinnu-vault' } })
    fireEvent.change(screen.getByTestId('settings-s3-preflight-region'), { target: { value: 'us-east-1' } })
    fireEvent.change(screen.getByTestId('settings-s3-preflight-prefix'), { target: { value: 'notes/private' } })

    const applyButton = screen.getByTestId('settings-storage-s3-provider-push-apply')
    expect(applyButton).toBeDisabled()
    fireEvent.click(applyButton)
    expect(onApplyS3ProviderPush).not.toHaveBeenCalled()

    fireEvent.change(screen.getByTestId('settings-s3-preflight-prefix'), { target: { value: 'notes' } })
    expect(applyButton).not.toBeDisabled()
    fireEvent.click(applyButton)
    expect(onApplyS3ProviderPush).toHaveBeenCalledWith({
      bucket: 'sriinnu-vault',
      region: 'us-east-1',
      prefix: 'notes',
    })
  })

  it('keeps Azure provider apply locked when the draft target drifts from the preview', () => {
    const onApplyAzureProviderPull = vi.fn()
    render(
      <ObjectStoragePrototypeActions
        t={createTranslator('en')}
        vaultReady
        busyAction={null}
        azureProviderPullPreviewReady
        azureProviderPullPreviewArgs={{ account: 'acct', container: 'vault', prefix: 'notes' }}
        onApplyAzureProviderPull={onApplyAzureProviderPull}
      />,
    )

    fireEvent.click(screen.getByTestId('settings-object-storage-provider-azure'))
    fireEvent.change(screen.getByTestId('settings-azure-preflight-account'), { target: { value: 'acct' } })
    fireEvent.change(screen.getByTestId('settings-azure-preflight-container'), { target: { value: 'vault-drift' } })
    fireEvent.change(screen.getByTestId('settings-azure-preflight-prefix'), { target: { value: 'notes' } })

    const applyButton = screen.getByTestId('settings-storage-azure-provider-pull-apply')
    expect(applyButton).toBeDisabled()
    fireEvent.click(applyButton)
    expect(onApplyAzureProviderPull).not.toHaveBeenCalled()

    fireEvent.change(screen.getByTestId('settings-azure-preflight-container'), { target: { value: 'vault' } })
    expect(applyButton).not.toBeDisabled()
    fireEvent.click(applyButton)
    expect(onApplyAzureProviderPull).toHaveBeenCalledWith({
      account: 'acct',
      container: 'vault',
      prefix: 'notes',
    })
  })
})
