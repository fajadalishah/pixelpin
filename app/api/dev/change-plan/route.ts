import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
  }

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
        return NextResponse.json({ error: 'Only administrators can change the subscription plan.' }, { status: 403 })
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

    const { plan } = await request.json() as { plan: string }
    const storageLimits: Record<string, number> = {
      free: 100,
      starter: 5120,
      pro: 10240,
      business: 30720,
    }

    const limit = storageLimits[plan] || 100

    const sub = await prisma.subscription.upsert({
      where: { userId: ownerId },
      create: {
        userId: ownerId,
        plan,
        storageLimitMB: limit,
        status: 'active',
      },
      update: {
        plan,
        storageLimitMB: limit,
        status: 'active',
      },
    })

    return NextResponse.json({ success: true, plan: sub.plan, storageLimitMB: sub.storageLimitMB })
  } catch (error) {
    console.error('Failed to change plan:', error)
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
  }
}
