'use client'

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              flex h-10 w-full rounded-xl border bg-secondary/50 px-3 py-2
              text-sm text-foreground placeholder:text-muted-foreground
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background
              disabled:cursor-not-allowed disabled:opacity-50
              ${icon ? 'pl-10' : ''}
              ${
                error
                  ? 'border-destructive focus:ring-destructive/50'
                  : 'border-border focus:border-primary focus:ring-ring/50'
              }
              ${className}
            `.trim()}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs font-medium text-destructive animate-fade-in">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
