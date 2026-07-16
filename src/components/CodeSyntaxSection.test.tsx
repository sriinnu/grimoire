import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../types'
import { CodeSyntaxSection } from './CodeSyntaxSection'

const { inspectMock } = vi.hoisted(() => ({ inspectMock: vi.fn() }))

vi.mock('../lib/tauriRuntime', () => ({ isTauriRuntimeAvailable: () => true }))
vi.mock('../lib/codeIntelligence', () => ({
  inspectCodeSymbols: inspectMock,
  isInspectableCodePath: (path: string) => /\.(?:go|py|rs|ts|tsx|jsx)$/i.test(path),
}))

const activeEntry = {
  path: '/vault/src/context.ts',
  fileKind: 'text',
} as VaultEntry

describe('CodeSyntaxSection', () => {
  it('requires a visible local inspection before exposing parser facts', async () => {
    const onInspected = vi.fn()
    inspectMock.mockResolvedValue({
      language: 'typescript',
      supported: true,
      parseErrorCount: 0,
      symbols: [{ name: 'buildManifest', kind: 'function', line: 4, column: 1, endLine: 8, endColumn: 2 }],
      imports: [{ statement: "import type { ContextItem } from './types'", line: 1, column: 1 }],
    })
    render(<CodeSyntaxSection activeEntry={activeEntry} protectedContext={false} vaultPath="/vault" onInspected={onInspected} />)

    expect(screen.getByTestId('code-syntax-section')).toHaveTextContent('Local only')
    expect(screen.queryByTestId('code-syntax-facts')).toBeNull()
    fireEvent.click(screen.getByTestId('inspect-code-symbols'))

    await waitFor(() => expect(inspectMock).toHaveBeenCalledWith('/vault/src/context.ts', '/vault'))
    expect(screen.getByTestId('code-syntax-facts')).toHaveTextContent('1 symbol')
    expect(screen.getByTestId('code-syntax-facts')).toHaveTextContent('function buildManifest')
    expect(onInspected).toHaveBeenCalledOnce()
  })

  it('holds protected code out and removes the inspect control', () => {
    render(<CodeSyntaxSection activeEntry={activeEntry} protectedContext vaultPath="/vault" />)

    expect(screen.getByTestId('code-syntax-section')).toHaveTextContent('symbols are held out')
    expect(screen.queryByTestId('inspect-code-symbols')).toBeNull()
  })

  it('does not offer a parser action for ordinary Markdown notes', () => {
    render(
      <CodeSyntaxSection
        activeEntry={{ path: '/vault/Welcome.md', fileKind: 'text' } as VaultEntry}
        protectedContext={false}
        vaultPath="/vault"
      />,
    )

    expect(screen.queryByTestId('code-syntax-section')).toBeNull()
  })
})
