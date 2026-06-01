import { describe, expect, it } from 'vitest'
import {
  applyAzureProviderSync,
  applyS3ProviderSync,
  previewAzureProviderPush,
  previewS3ProviderPush,
} from './objectStorageProviderSync'

describe('objectStorageProviderSync browser mock contract', () => {
  it('rejects blank S3 provider targets instead of inventing a mock bucket', async () => {
    await expect(previewS3ProviderPush('/vault', {}))
      .rejects.toThrow('Set an S3 bucket before previewing provider sync.')
    await expect(applyS3ProviderSync('/vault', 'push', 'preview-signature', {}))
      .rejects.toThrow('Set an S3 bucket before previewing provider sync.')
  })

  it('rejects blank Azure provider targets instead of inventing a mock account or container', async () => {
    await expect(previewAzureProviderPush('/vault', { container: 'vault' }))
      .rejects.toThrow('Set an Azure storage account before previewing provider sync.')
    await expect(applyAzureProviderSync('/vault', 'push', 'preview-signature', { account: 'acct' }))
      .rejects.toThrow('Set an Azure container before previewing provider sync.')
  })
})
