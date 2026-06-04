import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { PLANS, PlanKey } from '@/lib/plans'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-05-27.dahlia',
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan, interval } = await request.json() as { plan: PlanKey; interval: 'monthly' | 'yearly' }

    if (!plan || !interval || plan === 'free') {
      return NextResponse.json({ error: 'Invalid plan or interval' }, { status: 400 })
    }

    const planConfig = PLANS[plan]
    if (!planConfig) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    const priceId = interval === 'monthly'
      ? planConfig.stripePriceIdMonthly
      : planConfig.stripePriceIdYearly

    if (!priceId) {
      return NextResponse.json(
        { error: 'Stripe price ID not configured. Please set up your Stripe products first.' },
        { status: 400 }
      )
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.name || undefined,
        metadata: { userId: user.id },
      })
      customerId = customer.id

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      })
    }

    // Create checkout session
    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?tab=settings&payment=success&plan=${plan}`,
      cancel_url: `${appUrl}/pricing?payment=cancelled`,
      metadata: {
        userId: user.id,
        plan,
        interval,
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
