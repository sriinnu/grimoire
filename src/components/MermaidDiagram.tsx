import { useEffect, useMemo, useState } from 'react'
import './MermaidDiagram.css'

interface MermaidDiagramProps {
  chart: string
}

type MermaidModule = typeof import('mermaid')
type MermaidApi = MermaidModule['default']

let mermaidImport: Promise<MermaidApi> | null = null
let mermaidInitialized = false

function loadMermaid(): Promise<MermaidApi> {
  mermaidImport ??= import('mermaid').then((module) => module.default)
  return mermaidImport
}

async function ensureMermaidInitialized(): Promise<MermaidApi> {
  const mermaid = await loadMermaid()
  if (mermaidInitialized) return mermaid

  mermaid.initialize({
    fontFamily: 'var(--grimoire-ui-font-family)',
    securityLevel: 'strict',
    startOnLoad: false,
    theme: 'base',
  })
  mermaidInitialized = true
  return mermaid
}

function hashChart(chart: string): string {
  let hash = 0
  for (let index = 0; index < chart.length; index += 1) {
    hash = ((hash << 5) - hash + chart.charCodeAt(index)) | 0
  }
  return Math.abs(hash).toString(36)
}

/** Renders a Mermaid code fence as SVG, falling back to source when parsing fails. */
export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const diagramId = useMemo(() => `grimoire-mermaid-${hashChart(chart)}`, [chart])

  useEffect(() => {
    let cancelled = false

    async function renderDiagram() {
      try {
        const mermaid = await ensureMermaidInitialized()
        const result = await mermaid.render(diagramId, chart)
        if (!cancelled) {
          setSvg(result.svg)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setSvg(null)
          setError(err instanceof Error ? err.message : 'Could not render Mermaid diagram')
        }
      }
    }

    void renderDiagram()

    return () => { cancelled = true }
  }, [chart, diagramId])

  if (error) {
    return (
      <pre className="mermaid-diagram mermaid-diagram--error" data-testid="mermaid-diagram-error">
        <code>{chart}</code>
      </pre>
    )
  }

  if (!svg) {
    return <div className="mermaid-diagram mermaid-diagram--loading" data-testid="mermaid-diagram">Rendering diagram...</div>
  }

  return (
    <div
      className="mermaid-diagram"
      data-testid="mermaid-diagram"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
