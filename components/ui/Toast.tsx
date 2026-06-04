'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const iconMap: Record<ToastType, ReactNode> = {
  success: <CheckCircle className="h-5 w-5 shrink-0 text-success" />,
  error: <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />,
  info: <Info className="h-5 w-5 shrink-0 text-blue-400" />,
}

const borderColorMap: Record<ToastType, string> = {
  success: 'border-l-success',
  error: 'border-l-destructive',
  info: 'border-l-blue-400',
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast
  onDismiss: (id: string) => void
}) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => onDismiss(toast.id), 300)
    }, 4000)

    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => onDismiss(toast.id), 300)
  }

  return (
    <div
      className={`
        flex w-80 items-start gap-3 rounded-xl border border-border
        border-l-4 ${borderColorMap[toast.type]}
        bg-card/95 p-4 shadow-xl shadow-black/10
        backdrop-blur-xl
        transition-all duration-300
        ${isExiting ? 'translate-x-full opacity-0' : 'animate-slide-in-right'}
      `.trim()}
      role="alert"
    >
      {iconMap[toast.type]}
      <p className="flex-1 text-sm text-card-foreground">{toast.message}</p>
      <button
        onClick={handleClose}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    setToasts((prev) => [...prev, { id, type, message }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast, dismiss }}>
      {children}

      {/* Toast container */}
      <div className="fixed right-4 top-4 z-[100] flex flex-col gap-3">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
