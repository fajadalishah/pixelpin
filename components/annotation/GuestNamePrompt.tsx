'use client'

import { useState, useEffect } from 'react'
import { User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const STORAGE_KEY = 'pixelpin-guest-name'

interface GuestNamePromptProps {
  onSubmit: (name: string) => void
}

export function GuestNamePrompt({ onSubmit }: GuestNamePromptProps) {
  const [name, setName] = useState('')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      onSubmit(stored)
    } else {
      setIsVisible(true)
    }
  }, [onSubmit])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim() || 'Anonymous'
    localStorage.setItem(STORAGE_KEY, trimmed)
    onSubmit(trimmed)
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm animate-fade-in rounded-2xl border border-border bg-card/95 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <User className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-card-foreground">
            What&#39;s your name?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your name will appear with your comments
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <Input
            placeholder="Enter your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={<User className="h-4 w-4" />}
            autoFocus
          />
          <Button variant="primary" size="md" className="w-full" type="submit">
            Continue
          </Button>
        </form>
      </div>
    </div>
  )
}

export function getGuestName(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY)
}
