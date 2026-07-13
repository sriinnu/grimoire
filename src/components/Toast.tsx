import { useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ToastProps {
  message: string | null
  onDismiss: () => void
}

export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(onDismiss, 2000)
    return () => clearTimeout(timer)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div
      className={cn(
        "fixed bottom-8 left-1/2 -translate-x-1/2 z-[1100]",
        "px-5 py-2.5 rounded-lg text-[13px] font-medium",
        "border border-[var(--border-strong)]",
        "shadow-[var(--elevation-4)]",
        "animate-in slide-in-from-bottom-2 fade-in duration-200"
      )}
      style={{
        background: 'var(--surface-popover)',
        color: 'var(--text-primary)',
      }}
    >
      {message}
    </div>
  )
}
