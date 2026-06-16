import { describe, expect, it } from 'vitest'
import {
  GETTING_STARTED_VAULT_NAME,
  buildGettingStartedVaultPath,
  formatGettingStartedCloneError,
  labelFromPath,
} from './gettingStartedVault'

describe('gettingStartedVault', () => {
  it('builds a child vault path from a parent folder', () => {
    expect(buildGettingStartedVaultPath('/Users/srinivas/Documents')).toBe('/Users/srinivas/Documents/Getting Started')
  })

  it('trims trailing separators when building the child vault path', () => {
    expect(buildGettingStartedVaultPath('/Users/srinivas/Documents/')).toBe('/Users/srinivas/Documents/Getting Started')
  })

  it('preserves windows separators when building the child vault path', () => {
    expect(buildGettingStartedVaultPath('C:\\Users\\luca\\Documents\\')).toBe('C:\\Users\\luca\\Documents\\Getting Started')
  })

  it('derives a label from the final path segment', () => {
    expect(labelFromPath('/Users/srinivas/Documents/Getting Started')).toBe(GETTING_STARTED_VAULT_NAME)
  })

  it('passes through destination errors verbatim', () => {
    expect(formatGettingStartedCloneError("Destination '/tmp/Getting Started' already exists and is not empty"))
      .toBe("Destination '/tmp/Getting Started' already exists and is not empty")
  })

  it('formats git-not-found failures as starter preparation failures', () => {
    expect(formatGettingStartedCloneError('Failed to run git clone: The system cannot find the file specified. (os error 2)'))
      .toBe('Could not prepare Getting Started notebook: Failed to run git clone: The system cannot find the file specified. (os error 2)')
  })

  it('formats concrete network failures as starter preparation failures', () => {
    expect(formatGettingStartedCloneError('git clone failed: fatal: unable to access: Could not resolve host: github.com'))
      .toBe('Could not prepare Getting Started notebook: git clone failed: fatal: unable to access: Could not resolve host: github.com')
  })

  it('preserves unexpected starter preparation failure details', () => {
    expect(formatGettingStartedCloneError('git clone failed: fatal: unable to access'))
      .toBe('Could not prepare Getting Started notebook: git clone failed: fatal: unable to access')
  })
})
