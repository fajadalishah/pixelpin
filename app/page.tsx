import { Metadata } from 'next'
import LandingPageClient from '@/components/landing/LandingPageClient'

export const metadata: Metadata = {
  title: "PixelPin — Pin-point Image Feedback & Visual Collaboration Board",
  description: "Upload mockups, designs, and PDFs to collect visual comments from teammates and guest clients. No registration required for reviewers. Try our live demo!",
  keywords: [
    "design feedback",
    "image annotations",
    "client proofing",
    "visual collaboration",
    "Figma comments",
    "design review board",
    "PDF feedback review",
    "agency white labeling"
  ],
  openGraph: {
    title: "PixelPin — Pin-point Image Feedback & Visual Collaboration Board",
    description: "Collaborate visually on design assets. Let clients pin feedback directly on mockups without creating an account.",
    url: "https://pixelpin.app",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PixelPin — Pin-point Image Feedback & Visual Collaboration Board",
    description: "Let clients and team members pin comments directly on designs.",
  }
}

export default function Page() {
  return <LandingPageClient />
}
