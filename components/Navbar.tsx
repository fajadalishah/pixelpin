'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { MapPin, Menu, X, LayoutDashboard, LogOut, Sparkles } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/Button'
import { NotificationDropdown } from '@/components/NotificationDropdown'

export function Navbar() {
  const { data: session, status } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isLoading = status === 'loading'
  const isAuthenticated = status === 'authenticated'

  return (
    <nav className="sticky top-0 z-50 h-16 w-full border-b border-border/50 glass">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <MapPin className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight text-foreground">
            Pixel<span className="text-primary">Pin</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated && (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          )}

          <Link
            href="/pricing"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Sparkles className="h-4 w-4" />
            Pricing
          </Link>

          {isAuthenticated && <NotificationDropdown />}

          <ThemeToggle />

          {isLoading ? (
            <div className="h-10 w-24 animate-pulse rounded-xl bg-secondary" />
          ) : isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary overflow-hidden">
                  {session.user?.image ? (
                    <img src={session.user.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    session.user?.name?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <span className="max-w-[120px] truncate text-sm font-medium text-foreground">
                  {session.user?.name || 'User'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/sign-in">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button variant="primary" size="sm">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          {isAuthenticated && <NotificationDropdown />}
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="absolute left-0 right-0 top-16 border-b border-border/50 glass animate-slide-down md:hidden">
          <div className="flex flex-col gap-1 p-4">
            {isAuthenticated && (
              <>
                <div className="mb-3 flex items-center gap-2 px-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary overflow-hidden">
                    {session?.user?.image ? (
                      <img src={session.user.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      session?.user?.name?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {session?.user?.name || 'User'}
                  </span>
                </div>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <Link
                  href="/pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Sparkles className="h-4 w-4" />
                  Pricing
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    signOut()
                  }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            )}

            {!isAuthenticated && !isLoading && (
              <div className="flex flex-col gap-2">
                <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" size="md" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="md" className="w-full">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
