import { Component, type ErrorInfo, type ReactNode } from 'react'

const CRASH_STORAGE_KEY = 'grimoire:last-crash'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  error: Error | null
}

/**
 * Last-resort render guard: without a boundary, any render error unmounts the
 * whole tree and the window goes blank. This keeps the crash visible,
 * recoverable, and inspectable (details persist to localStorage).
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    try {
      window.localStorage.setItem(
        CRASH_STORAGE_KEY,
        JSON.stringify({
          message: error.message,
          stack: error.stack ?? null,
          componentStack: info.componentStack ?? null,
          at: new Date().toISOString(),
          hash: window.location.hash,
        }),
      )
    } catch {
      // storage full or unavailable — the visible surface still carries the message
    }
  }

  private readonly handleReload = () => {
    window.location.reload()
  }

  private readonly handleCopy = async () => {
    const { error } = this.state
    if (!error) return
    try {
      await navigator.clipboard.writeText(`${error.message}\n\n${error.stack ?? ''}`)
    } catch {
      // clipboard unavailable (insecure context) — the text stays visible
    }
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0a09',
          color: '#ece8e1',
          fontFamily: "system-ui, -apple-system, 'Inter', sans-serif",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 520, width: '100%' }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#57c4bd',
              marginBottom: 10,
            }}
          >
            Recovery
          </div>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 26, margin: '0 0 8px' }}>
            Something interrupted the ink.
          </h1>
          <p style={{ color: '#a5adb4', fontSize: 13, lineHeight: 1.55, margin: '0 0 16px' }}>
            Your vault is on disk and untouched — this is a display failure, not a data failure.
            Reloading is safe.
          </p>
          <pre
            style={{
              background: '#161512',
              border: '1px solid #2a2620',
              borderRadius: 10,
              padding: '12px 14px',
              fontSize: 11,
              lineHeight: 1.5,
              color: '#f0937d',
              overflowX: 'auto',
              maxHeight: 160,
              overflowY: 'auto',
              margin: '0 0 16px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {error.message}
          </pre>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#fff',
                background: 'linear-gradient(135deg, #0e7c78, #14948f)',
                border: 'none',
                borderRadius: 9,
                padding: '8px 16px',
                cursor: 'pointer',
              }}
            >
              Reload app
            </button>
            <button
              type="button"
              onClick={() => void this.handleCopy()}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#84919c',
                background: 'transparent',
                border: '1px solid #2a2620',
                borderRadius: 9,
                padding: '8px 16px',
                cursor: 'pointer',
              }}
            >
              Copy details
            </button>
          </div>
        </div>
      </div>
    )
  }
}
