import { useState, type ReactNode } from 'react'
import { Braces, RefreshCw } from 'lucide-react'
import type { VaultEntry } from '../types'
import { inspectCodeSymbols, isInspectableCodePath, type CodeSymbolSnapshot } from '../lib/codeIntelligence'
import { isTauriRuntimeAvailable } from '../lib/tauriRuntime'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

interface CodeSyntaxSectionProps {
  activeEntry?: VaultEntry | null
  protectedContext: boolean
  vaultPath?: string
  onInspected?: (snapshot: CodeSymbolSnapshot) => void
}

/** Deliberate, local syntax inspection for the active code file. */
export function CodeSyntaxSection({
  activeEntry,
  protectedContext,
  vaultPath,
  onInspected,
}: CodeSyntaxSectionProps) {
  const [snapshot, setSnapshot] = useState<CodeSymbolSnapshot | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isCodeFile = activeEntry ? isInspectableCodePath(activeEntry.path) : false

  if (!isCodeFile) return null

  async function inspect() {
    if (!activeEntry || protectedContext || !vaultPath) return
    setPending(true)
    setError(null)
    try {
      const next = await inspectCodeSymbols(activeEntry.path, vaultPath)
      setSnapshot(next)
      onInspected?.(next)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setPending(false)
    }
  }

  return (
    <section
      className="grimoire-context-surface grid gap-2 rounded-md border p-2.5"
      style={{
        background: 'color-mix(in srgb, var(--surface-card, var(--background)) 94%, var(--primary) 6%)',
        borderColor: 'color-mix(in srgb, var(--text-primary) 22%, var(--border))',
      }}
      data-testid="code-syntax-section"
    >
      <div className="flex items-center gap-2">
        <Braces className="size-3.5" style={{ color: 'var(--text-primary)' }} />
        <span className="grimoire-context-label text-xs font-semibold">Code syntax</span>
        <Badge
          variant="outline"
          className="grimoire-context-pill ml-auto rounded-md text-[10px] font-semibold"
        >
          Local only
        </Badge>
      </div>
      {protectedContext ? (
        <p className="grimoire-context-secondary text-[11px] leading-4">
          This file is protected, so its symbols are held out of reviewed context.
        </p>
      ) : !vaultPath ? (
        <p className="grimoire-context-secondary text-[11px] leading-4">
          Open a vault to inspect this file’s syntax locally.
        </p>
      ) : !isTauriRuntimeAvailable() ? (
        <p className="grimoire-context-secondary text-[11px] leading-4">
          Available in the desktop app. No code is sent anywhere.
        </p>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="grimoire-context-secondary min-w-0 text-[11px] leading-4">
            Tree-sitter reads this active file on-device. Add its facts only after review.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 shrink-0 text-xs font-semibold"
            disabled={pending}
            onClick={() => { void inspect() }}
            data-testid="inspect-code-symbols"
          >
            <RefreshCw className={pending ? 'size-3 animate-spin' : 'size-3'} />
            {pending ? 'Inspecting…' : snapshot ? 'Refresh' : 'Inspect symbols'}
          </Button>
        </div>
      )}
      {error ? <p role="status" className="text-[11px] leading-4 text-destructive">{error}</p> : null}
      {snapshot ? <SyntaxFacts snapshot={snapshot} /> : null}
    </section>
  )
}

function SyntaxFacts({ snapshot }: { snapshot: CodeSymbolSnapshot }) {
  const symbolLabel = `${snapshot.symbols.length} ${snapshot.symbols.length === 1 ? 'symbol' : 'symbols'}`
  const importLabel = `${snapshot.imports.length} ${snapshot.imports.length === 1 ? 'import' : 'imports'}`
  return (
    <div className="grid gap-1.5" data-testid="code-syntax-facts">
      <div className="flex flex-wrap items-center gap-1.5">
        <FactPill>{snapshot.supported ? snapshot.language : 'Unsupported'}</FactPill>
        <FactPill>{symbolLabel}</FactPill>
        <FactPill>{importLabel}</FactPill>
        {snapshot.parseErrorCount > 0 ? <FactPill>{snapshot.parseErrorCount} syntax {snapshot.parseErrorCount === 1 ? 'issue' : 'issues'}</FactPill> : null}
      </div>
      {snapshot.symbols.length > 0 ? (
        <p className="grimoire-context-secondary line-clamp-2 text-[10px] leading-4">
          {snapshot.symbols.slice(0, 8).map(symbol => `${symbol.kind} ${symbol.name}`).join(' · ')}
          {snapshot.symbols.length > 8 ? ` · +${snapshot.symbols.length - 8} more` : ''}
        </p>
      ) : null}
    </div>
  )
}

function FactPill({ children }: { children: ReactNode }) {
  return (
    <Badge
      variant="outline"
      className="grimoire-context-pill rounded-md text-[10px] font-semibold"
    >
      {children}
    </Badge>
  )
}
