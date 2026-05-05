import { getAiAgentDefinition, type AiAgentId } from '../lib/aiAgents'

export const LIVE_AI_NATIVE_APP_REQUIRED =
  'Live AI requires the native Grimoire app. Browser preview cannot launch local CLI agents.'

export function liveAiNativeAppRequiredMessage(agent?: AiAgentId): string {
  if (!agent) return LIVE_AI_NATIVE_APP_REQUIRED
  return `${getAiAgentDefinition(agent).label} is live only in the native Grimoire app. Browser preview cannot launch local CLI agents.`
}
