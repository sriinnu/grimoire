import { invoke, isTauriRuntimeAvailable } from './tauriRuntime'

export interface CodeSymbolFact {
  name: string
  kind: string
  line: number
  column: number
  endLine: number
  endColumn: number
}

export interface CodeImportFact {
  statement: string
  line: number
  column: number
}

export interface CodeSymbolSnapshot {
  language: string
  supported: boolean
  parseErrorCount: number
  symbols: CodeSymbolFact[]
  imports: CodeImportFact[]
}

const INSPECTABLE_CODE_EXTENSIONS = new Set(['go', 'py', 'rs', 'ts', 'tsx', 'jsx'])

/** Keep the UI affordance aligned with the native Tree-sitter language set. */
export function isInspectableCodePath(path: string): boolean {
  const extension = path.split('.').at(-1)?.toLowerCase()
  return extension ? INSPECTABLE_CODE_EXTENSIONS.has(extension) : false
}

/** Inspect the active code file locally. Calling this never starts an agent run. */
export async function inspectCodeSymbols(path: string, vaultPath?: string): Promise<CodeSymbolSnapshot> {
  if (!isTauriRuntimeAvailable()) {
    throw new Error('Code syntax inspection is available in the desktop app only.')
  }
  return invoke<CodeSymbolSnapshot>('inspect_code_symbols', { path, vaultPath })
}
