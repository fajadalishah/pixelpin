'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff, MapPin, Loader2 } from 'lucide-react'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | 'apple' | null>(null)

  async function handleSocialSignIn(provider: 'google' | 'facebook' | 'apple') {
    setError('')
    setSocialLoading(provider)
    try {
      // Check if real keys are configured or we should run in simulation mode
      const statusRes = await fetch('/api/auth/providers-status')
      const status = await statusRes.json()

      if (status && status[provider] === false) {
        const mockEmails = {
          google: 'google.simulated@pixelpin.app',
          facebook: 'facebook.simulated@pixelpin.app',
          apple: 'apple.simulated@pixelpin.app',
        }
        const mockNames = {
          google: 'Google Tester',
          facebook: 'Facebook Tester',
          apple: 'Apple Tester',
        }

        const result = await signIn('credentials', {
          email: mockEmails[provider],
          name: mockNames[provider],
          isMockOAuth: 'true',
          redirect: false,
        })

        if (result?.error) {
          setError(`Simulation mode login failed for ${provider}.`)
          setSocialLoading(null)
        } else {
          router.push('/dashboard')
          router.refresh()
        }
        return
      }

      await signIn(provider, {
        callbackUrl: '/dashboard',
      })
    } catch {
      setError(`Failed to sign in with ${provider}. Please try again.`)
      setSocialLoading(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password. Please try again.')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="glass p-8 rounded-2xl shadow-xl shadow-primary/5">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">PixelPin</span>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Welcome Back
          </h1>
          <p className="text-muted-foreground text-sm">
            Sign in to continue to your dashboard
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || socialLoading !== null}
            className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-border/80"></div>
          <span className="mx-4 text-xs text-muted-foreground uppercase font-bold tracking-wider">
            Or continue with
          </span>
          <div className="flex-grow border-t border-border/80"></div>
        </div>

        {/* Social Sign In Buttons */}
        <div className="grid grid-cols-3 gap-3">
          {/* Google */}
          <button
            type="button"
            disabled={loading || socialLoading !== null}
            onClick={() => handleSocialSignIn('google')}
            className="glass flex items-center justify-center py-2.5 rounded-xl border border-border/60 hover:bg-muted/50 hover:border-primary/40 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Sign in with Google"
          >
            {socialLoading === 'google' ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.37 0 3.393 2.673 1.488 6.573l3.778 3.192Z"
                />
                <path
                  fill="#4285F4"
                  d="M23.513 12.234c0-.79-.07-1.554-.2-2.29H12v4.372h6.462a5.523 5.523 0 0 1-2.395 3.623v3.01h3.879c2.268-2.09 3.567-5.168 3.567-8.715Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.266 14.235A7.072 7.072 0 0 1 4.909 12c0-.79.13-1.554.357-2.235L1.488 6.573A11.968 11.968 0 0 0 0 12c0 1.954.47 3.8 1.295 5.427l3.97-3.192Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.955-1.077 7.941-2.918l-3.879-3.01a7.12 7.12 0 0 1-4.062 1.146 7.086 7.086 0 0 1-6.734-4.855l-3.97 3.192C3.393 21.327 7.37 24 12 24Z"
                />
              </svg>
            )}
          </button>

          {/* Facebook */}
          <button
            type="button"
            disabled={loading || socialLoading !== null}
            onClick={() => handleSocialSignIn('facebook')}
            className="glass flex items-center justify-center py-2.5 rounded-xl border border-border/60 hover:bg-muted/50 hover:border-primary/40 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Sign in with Facebook"
          >
            {socialLoading === 'facebook' ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <svg className="w-5 h-5 fill-current text-[#1877F2]" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            )}
          </button>

          {/* Apple */}
          <button
            type="button"
            disabled={loading || socialLoading !== null}
            onClick={() => handleSocialSignIn('apple')}
            className="glass flex items-center justify-center py-2.5 rounded-xl border border-border/60 hover:bg-muted/50 hover:border-primary/40 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Sign in with Apple"
          >
            {socialLoading === 'apple' ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <svg className="w-5 h-5 fill-current text-foreground" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.12 1.83-.98 2.94 1.07.08 2.15-.52 2.81-1.33z" />
              </svg>
            )}
          </button>
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Don&apos;t have an account?{' '}
          <Link
            href="/sign-up"
            className="text-primary font-medium hover:underline"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  )
}
