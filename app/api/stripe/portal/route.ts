import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-05-27.dahlia',
})

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.email) {
      const memberRecord = await prisma.teamMember.findFirst({
        where: { email: session.user.email, status: 'Active' },
      })
      if (memberRecord && (memberRecord.role === 'Collaborator' || memberRecord.role === 'Reviewer')) {
        return NextResponse.json({ error: 'Only administrators can manage the subscription plan.' }, { status: 403 })
      }
    }

    let ownerId = session.user.id
    if (session.user.email) {
      const invitation = await prisma.teamMember.findFirst({
        where: { email: session.user.email, status: 'Active' },
      })
      if (invitation) {
        ownerId = invitation.invitedById
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: ownerId },
    })

    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
    }

    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/dashboard?tab=settings`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error('Portal session error:', error)
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
