const PROVIDER_LABELS = {
  azure: 'Azure Blob',
  s3: 'S3',
}

const FAILURE_KINDS = ['none', 'auth', 'permission', 'network', 'conflict', 'cleanup', 'config', 'unknown']
const FAILURE_STAGES = ['none', 'gate', 'config', 'preview', 'apply', 'pull', 'cleanup', 'unknown']

export function classifyProviderFailure(message) {
  const text = String(message ?? '').toLowerCase()
  return {
    kind: classifyFailureKind(text),
    stage: classifyFailureStage(text),
  }
}

export function redactedReport(report) {
  const summaryStatus = reportStatus(report?.summary?.status)
  return {
    schema: 'grimoire-object-storage-live-proof-v1',
    generated_at: safeTimestamp(report?.generated_at),
    finished_at: report?.finished_at ? safeTimestamp(report.finished_at) : null,
    provider_filter: providerFilter(report?.provider_filter),
    summary: {
      status: summaryStatus,
      message: summaryMessage(summaryStatus),
    },
    providers: Array.isArray(report?.providers)
      ? report.providers.map(redactedProviderReport).filter(Boolean)
      : [],
  }
}

function redactedProviderReport(provider) {
  if (!provider || !['s3', 'azure'].includes(provider.id)) return null
  const status = providerStatus(provider.status)
  const failure = providerFailure(provider, status)
  return {
    id: provider.id,
    label: PROVIDER_LABELS[provider.id],
    enabled: provider.enabled === true,
    gate: {
      name: envName(provider.gate?.name),
      state: envProofState(provider.gate?.state),
    },
    required: envStateSnapshot(provider.required),
    optional: envStateSnapshot(provider.optional),
    status,
    failure_kind: failure.kind,
    failure_stage: failure.stage,
    message: providerMessage(status, failure),
  }
}

function providerFailure(provider, status) {
  if (status === 'gate_missing') return { kind: 'config', stage: 'gate' }
  if (status === 'missing_config') return { kind: 'config', stage: 'config' }
  if (status !== 'failed') return { kind: 'none', stage: 'none' }

  const explicitKind = failureKind(provider.failure_kind)
  const explicitStage = failureStage(provider.failure_stage)
  if (explicitKind !== 'none' || explicitStage !== 'none') {
    return {
      kind: explicitKind === 'none' ? 'unknown' : explicitKind,
      stage: explicitStage === 'none' ? 'unknown' : explicitStage,
    }
  }
  return classifyProviderFailure(provider.message)
}

function classifyFailureKind(text) {
  if (/\b(cleanup|delete failed|remove failed|teardown)\b/.test(text)) return 'cleanup'
  if (/\b(conflict|divergent|hash mismatch|etag mismatch|changed remotely)\b/.test(text)) return 'conflict'
  if (/\b(accessdenied|forbidden|permission|authorizationpermissionmismatch|not authorized)\b/.test(text)) {
    return 'permission'
  }
  if (/\b(auth|credential|credentials|login|token|expired|signature|unauthorized|401|invalid key)\b/.test(text)) {
    return 'auth'
  }
  if (/\b(timeout|network|dns|enotfound|econnreset|tls|connection refused|temporarily unavailable)\b/.test(text)) {
    return 'network'
  }
  if (/\b(missing|required|bucket missing|container missing|not configured)\b/.test(text)) return 'config'
  return 'unknown'
}

function classifyFailureStage(text) {
  if (/\b(cleanup|delete|remove|teardown)\b/.test(text)) return 'cleanup'
  if (/\b(pull|download|list remote)\b/.test(text)) return 'pull'
  if (/\b(apply|upload|write|putobject|put blob|sync apply)\b/.test(text)) return 'apply'
  if (/\b(preview|headbucket|head bucket|listobject|list object|container exists|plan)\b/.test(text)) return 'preview'
  if (/\b(gate)\b/.test(text)) return 'gate'
  if (/\b(config|missing|required)\b/.test(text)) return 'config'
  return 'unknown'
}

function envStateSnapshot(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => /^GRIMOIRE_[A-Z0-9_]+$/.test(key))
      .map(([key, state]) => [key, envProofState(state)]),
  )
}

function envName(value) {
  return typeof value === 'string' && /^GRIMOIRE_[A-Z0-9_]+$/.test(value) ? value : 'GRIMOIRE_PROVIDER_GATE'
}

function envProofState(value) {
  return value === 'set' ? 'set' : 'missing'
}

function providerFilter(value) {
  return value === 's3' || value === 'azure' ? value : 'all'
}

function providerStatus(value) {
  const statuses = ['failed', 'gate_missing', 'missing_config', 'passed', 'planned', 'ready', 'running']
  return statuses.includes(value) ? value : 'planned'
}

function reportStatus(value) {
  return ['dry_run', 'failed', 'passed', 'planned', 'skipped'].includes(value) ? value : 'planned'
}

function safeTimestamp(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(value) ? value : new Date(0).toISOString()
}

function failureKind(value) {
  return FAILURE_KINDS.includes(value) ? value : 'none'
}

function failureStage(value) {
  return FAILURE_STAGES.includes(value) ? value : 'none'
}

function summaryMessage(status) {
  if (status === 'dry_run') return 'No provider proof was run.'
  if (status === 'passed') return 'All enabled provider proofs passed.'
  if (status === 'skipped') return 'No live provider proof gates were enabled.'
  if (status === 'failed') return 'One or more provider proof checks failed.'
  return 'Provider live proof has not run yet.'
}

function providerMessage(status, failure) {
  if (status === 'passed') return 'Provider preview/apply/pull proof passed.'
  if (status === 'missing_config') return 'Required provider config is missing.'
  if (status === 'gate_missing') return 'Explicit provider proof gate is missing.'
  if (status === 'failed') {
    return `Provider proof failed: ${failure.kind} at ${failure.stage}; raw provider output was withheld.`
  }
  if (status === 'ready') return 'Provider proof is ready to run.'
  if (status === 'running') return 'Provider proof was running when the report was written.'
  return 'Provider proof has not run yet.'
}
