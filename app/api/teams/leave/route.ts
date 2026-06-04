import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete active invitation for this email to revert to Owner role of own workspace
    await prisma.teamMember.deleteMany({
      where: { email: session.user.email, status: 'Active' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to leave workspace:', error)
    return NextResponse.json({ error: 'Failed to leave workspace' }, { status: 500 })
  }
}
