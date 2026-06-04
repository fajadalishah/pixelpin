import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-05-27.dahlia',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const plan = session.metadata?.plan
        const interval = session.metadata?.interval

        if (userId && plan) {
          const storageLimits: Record<string, number> = {
            starter: 5120,
            pro: 10240,
            business: 30720,
          }

          // Get subscription details
          const subscriptionId = session.subscription as string
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)

          await prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              stripeSubscriptionId: subscriptionId,
              stripePriceId: subscription.items.data[0]?.price.id,
              plan,
              interval: interval || 'monthly',
              status: 'active',
              storageLimitMB: storageLimits[plan] || 100,
              currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
            },
            update: {
              stripeSubscriptionId: subscriptionId,
              stripePriceId: subscription.items.data[0]?.price.id,
              plan,
              interval: interval || 'monthly',
              status: 'active',
              storageLimitMB: storageLimits[plan] || 100,
              currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
              cancelAtPeriodEnd: false,
            },
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const dbSub = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        })

        if (dbSub) {
          await prisma.subscription.update({
            where: { id: dbSub.id },
            data: {
              status: subscription.status === 'active' ? 'active' : subscription.status,
              currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const dbSub = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        })

        if (dbSub) {
          await prisma.subscription.update({
            where: { id: dbSub.id },
            data: {
              status: 'cancelled',
              plan: 'free',
              storageLimitMB: 100,
            },
          })
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
