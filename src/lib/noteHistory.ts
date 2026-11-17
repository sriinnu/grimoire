import { invoke } from './tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'

/** Fetch the full note content as it existed at a specific git commit. */
export function getFileContentAtCommit(
  vaultPath: string,
  path: string,
  commitHash: string,
): Promise<string> {
  const tauriArgs = { vaultPath, path, commitHash }
  return isTauri()
    ? invoke<string>('get_file_content_at_commit', tauriArgs)
    : mockInvoke<string>('get_file_content_at_commit', tauriArgs)
}
