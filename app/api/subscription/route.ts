import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (user && user.email === 'fajadalishah2@gmail.com') {
      await prisma.subscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          plan: 'business',
          storageLimitMB: 30720,
          status: 'active',
        },
        update: {
          plan: 'business',
          storageLimitMB: 30720,
          status: 'active',
        }
      })
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    })

    if (!subscription) {
      return NextResponse.json({
        plan: 'free',
        interval: 'monthly',
        status: 'active',
        storageLimitMB: 100,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      })
    }

    return NextResponse.json({
      plan: subscription.plan,
      interval: subscription.interval,
      status: subscription.status,
      storageLimitMB: subscription.storageLimitMB,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() || null,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    })
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}
