import { Metadata } from 'next'
import PricingClient from '@/components/pricing/PricingClient'

export const metadata: Metadata = {
  title: "PixelPin — Simple Pricing Tiers for Design Reviews & Teams",
  description: "Choose the perfect subscription plan for your agency, studio, or freelance workflow. Compare Free, Starter, Pro, and Business organization visual feedback options.",
  keywords: [
    "PixelPin pricing",
    "design collaboration billing",
    "visual proofing cost",
    "white-label review boards plan",
    "agency proofing pricing",
    "unlimited design comments"
  ],
  openGraph: {
    title: "PixelPin — Pricing Plans & Tier Subscriptions",
    description: "Secure your collaborative mockup sharing dashboard. Scale visual client feedback on mockups with transparent pricing.",
    url: "https://pixelpin.app/pricing",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PixelPin — Pricing Plans & Tier Subscriptions",
    description: "Scale visual comments and review workflows with transparent subscription pricing.",
  }
}

export default function PricingPage() {
  return <PricingClient />
}
