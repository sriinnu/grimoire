import { spawnSync } from 'node:child_process'

function gitLogHeadSignature() {
  const result = spawnSync('git', ['log', '-1', '--show-signature', '--format=%H'], {
    encoding: 'utf8',
    stdio: 'pipe',
  })

  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `exit ${result.status}`
    return { commit: null, detail, verified: false }
  }

  const output = result.stdout.trim()
  const commit = output.match(/\b[0-9a-f]{40}\b/u)?.[0] ?? null
  const signatureLine = output.split('\n').find((line) => /signature/iu.test(line)) ?? ''

  return {
    commit,
    detail: signatureLine || 'No git signature status found.',
    verified: /Good (?:"git" )?signature/iu.test(output),
  }
}

export function readHeadSignatureProof() {
  return gitLogHeadSignature()
}

export function headSignatureSummary(proof) {
  if (!proof?.commit) return 'missing'
  const status = proof.verified ? 'good' : 'not-good'
  return `${status} ${proof.commit.slice(0, 7)}`
}
