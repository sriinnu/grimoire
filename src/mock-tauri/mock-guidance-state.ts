let mockVaultAiGuidanceStatus = {
  agents_state: 'managed',
  claude_state: 'managed',
  can_restore: false,
} as const

/** Returns the mock vault AI guidance state used by browser tests. */
export function getMockVaultAiGuidanceStatus() {
  return { ...mockVaultAiGuidanceStatus }
}

/** Restores the mock vault guidance files to the managed state. */
export function restoreMockVaultAiGuidance() {
  mockVaultAiGuidanceStatus = {
    agents_state: 'managed',
    claude_state: 'managed',
    can_restore: false,
  }
  return getMockVaultAiGuidanceStatus()
}
