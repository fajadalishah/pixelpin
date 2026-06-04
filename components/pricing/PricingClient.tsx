'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Check,
  Sparkles,
  Zap,
  Rocket,
  ArrowRight,
  Shield,
  CreditCard,
  RefreshCcw,
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { cn } from '@/lib/utils'

const plans = [
  {
    key: 'free',
    name: 'Free',
    description: 'Perfect for getting started',
    monthlyPrice: 0,
    yearlyPrice: 0,
    storage: '100 MB',
    icon: <Sparkles className="h-5 w-5" />,
    color: 'from-slate-400 to-slate-500',
    borderColor: 'border-border',
    features: [
      '100 MB Storage',
      'Up to 3 Projects',
      'Basic Commenting',
      'Shareable Links',
      'Community Support',
    ],
  },
  {
    key: 'starter',
    name: 'Starter',
    description: 'Great for freelancers & small teams',
    monthlyPrice: 10,
    yearlyPrice: 108,
    storage: '5 GB',
    icon: <Zap className="h-5 w-5" />,
    color: 'from-blue-500 to-cyan-500',
    borderColor: 'border-blue-500/30',
    features: [
      '5 GB Storage',
      'Unlimited Projects',
      'Team Collaboration',
      'Priority Comments',
      'Custom Branding',
      'Email Support',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    description: 'Best for growing agencies',
    monthlyPrice: 17,
    yearlyPrice: 183.60,
    storage: '10 GB',
    icon: <Rocket className="h-5 w-5" />,
    color: 'from-violet-500 to-purple-600',
    borderColor: 'border-violet-500/30',
    popular: true,
    features: [
      '10 GB Storage',
      'Unlimited Projects',
      'Advanced Team Roles',
      'Annotation Tools',
      'Version History',
      'Custom Branding',
      'Priority Support',
    ],
  },
  {
    key: 'business',
    name: 'Business',
    description: 'For large teams & enterprises',
    monthlyPrice: 45,
    yearlyPrice: 486,
    storage: '30 GB',
    icon: <Shield className="h-5 w-5" />,
    color: 'from-amber-500 to-orange-500',
    borderColor: 'border-amber-500/30',
    features: [
      '30 GB Storage',
      'Unlimited Everything',
      'Admin Dashboard',
      'SSO Integration',
      'Audit Logs',
      'White-label Branding',
      'API Access',
      'Dedicated Support',
    ],
  },
]

export default function PricingClient() {
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const { data: session } = useSession()
  const router = useRouter()

  const handleSubscribe = async (planKey: string) => {
    if (planKey === 'free') return

    if (!session?.user) {
      router.push('/sign-in?callbackUrl=/pricing')
      return
    }

    setLoadingPlan(planKey)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey, interval }),
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Failed to start checkout')
      }
    } catch (err) {
      console.error('Checkout error:', err)
      alert('Something went wrong. Please try again.')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-16">
        {/* Background Effects */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute right-1/4 top-20 h-[400px] w-[400px] rounded-full bg-accent/5 blur-[100px]" />
        </div>

        <div className="mx-auto max-w-6xl px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold text-primary mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Simple, transparent pricing
          </div>

          <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Choose the perfect plan
            <br />
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              for your team
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground leading-relaxed sm:text-base">
            Start free and scale as you grow. All plans include core features.
            Upgrade anytime — no hidden fees.
          </p>

          {/* Interval Toggle */}
          <div className="mt-8 inline-flex items-center gap-1 rounded-2xl bg-muted/50 border border-border p-1.5">
            <button
              onClick={() => setInterval('monthly')}
              className={cn(
                'rounded-xl px-6 py-2.5 text-sm font-bold transition-all cursor-pointer',
                interval === 'monthly'
                  ? 'bg-foreground text-background shadow-lg'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('yearly')}
              className={cn(
                'rounded-xl px-6 py-2.5 text-sm font-bold transition-all cursor-pointer relative',
                interval === 'yearly'
                  ? 'bg-foreground text-background shadow-lg'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Yearly
              <span className="absolute -top-2 -right-2 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                -10%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const price = interval === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice
            const monthlyEquivalent = interval === 'yearly' && plan.yearlyPrice > 0
              ? (plan.yearlyPrice / 12).toFixed(2)
              : null

            return (
              <div
                key={plan.key}
                className={cn(
                  'relative flex flex-col rounded-3xl border bg-card/80 backdrop-blur-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl',
                  plan.popular
                    ? 'border-primary/40 shadow-xl shadow-primary/10 ring-1 ring-primary/20'
                    : plan.borderColor
                )}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="rounded-full bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-1 text-[10px] font-bold text-white shadow-lg shadow-purple-500/30">
                      MOST POPULAR
                    </div>
                  </div>
                )}

                {/* Header */}
                <div className="mb-5">
                  <div className={cn(
                    'inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg mb-3',
                    plan.color
                  )}>
                    {plan.icon}
                  </div>
                  <h3 className="text-lg font-black text-foreground">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-foreground">
                      ${interval === 'monthly' ? price : monthlyEquivalent || '0'}
                    </span>
                    <span className="text-sm text-muted-foreground font-semibold">/mo</span>
                  </div>
                  {interval === 'yearly' && price > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      <span className="text-emerald-500 font-bold">${price}/yr</span>
                      {' · '}
                      <span className="line-through">${plan.monthlyPrice * 12}</span>
                      {' · Save 10%'}
                    </p>
                  )}
                  {price === 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1">Free forever</p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs text-foreground">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSubscribe(plan.key)}
                  disabled={loadingPlan === plan.key || plan.key === 'free'}
                  className={cn(
                    'w-full rounded-xl py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer',
                    plan.popular
                      ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-[1.02]'
                      : plan.key === 'free'
                        ? 'bg-muted text-muted-foreground cursor-default'
                        : 'bg-foreground text-background hover:opacity-90 hover:scale-[1.02]',
                    loadingPlan === plan.key && 'opacity-70 cursor-wait'
                  )}
                >
                  {loadingPlan === plan.key ? (
                    <RefreshCcw className="h-4 w-4 animate-spin" />
                  ) : plan.key === 'free' ? (
                    'Current Plan'
                  ) : (
                    <>
                      Get Started
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* Trust Badges */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Shield className="h-4 w-4 text-emerald-500" />
            SSL Secured
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <CreditCard className="h-4 w-4 text-blue-500" />
            Powered by Stripe
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <RefreshCcw className="h-4 w-4 text-amber-500" />
            Cancel Anytime
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-2xl mx-auto">
          <h2 className="text-2xl font-black text-center text-foreground mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: 'Can I switch plans anytime?',
                a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately and billing is prorated.',
              },
              {
                q: 'What happens when I run out of storage?',
                a: 'You\'ll receive a notification when you\'re close to your limit. You can upgrade your plan or delete existing files to free up space.',
              },
              {
                q: 'Is there a refund policy?',
                a: 'We offer a 14-day money-back guarantee on all paid plans. No questions asked.',
              },
              {
                q: 'Do yearly plans auto-renew?',
                a: 'Yes, all plans auto-renew. You can cancel anytime from your billing settings and your plan will remain active until the end of the billing period.',
              },
            ].map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl border border-border bg-card/60 backdrop-blur-xl overflow-hidden"
              >
                <summary className="flex items-center justify-between cursor-pointer px-5 py-4 text-sm font-bold text-foreground hover:bg-muted/20 transition-colors">
                  {faq.q}
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-5 pb-4 text-xs text-muted-foreground leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
