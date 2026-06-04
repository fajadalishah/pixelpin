import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    // Get the workspace owner ID (if invited, the inviter; otherwise, the current user)
    let ownerId = userId
    if (user && user.email) {
      const invitation = await prisma.teamMember.findFirst({
        where: { email: user.email, status: 'Active' },
      })
      if (invitation) {
        ownerId = invitation.invitedById
      }
    }

    // Get the team members in this workspace
    const teamMembers = await prisma.teamMember.findMany({
      where: { invitedById: ownerId, status: 'Active' },
      select: { email: true },
    })
    const teamEmails = teamMembers.map(m => m.email)

    // Find user records matching these team emails
    const teamUsers = await prisma.user.findMany({
      where: { email: { in: teamEmails } },
      select: { id: true },
    })

    const allWorkspaceUserIds = [ownerId, ...teamUsers.map(u => u.id)]

    // Automatically set business plan for workspace owner fajadalishah2@gmail.com
    const ownerUser = await prisma.user.findUnique({
      where: { id: ownerId }
    })
    if (ownerUser && ownerUser.email === 'fajadalishah2@gmail.com') {
      await prisma.subscription.upsert({
        where: { userId: ownerId },
        create: {
          userId: ownerId,
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

    const [projectsCount, imagesCount, commentsCount, unreadNotificationsCount, subscription] = await Promise.all([
      prisma.project.count({
        where: { userId },
      }),
      prisma.image.count({
        where: {
          project: { userId: { in: allWorkspaceUserIds } },
        },
      }),
      prisma.comment.count({
        where: {
          image: {
            project: { userId: { in: allWorkspaceUserIds } },
          },
        },
      }),
      prisma.notification.count({
        where: {
          userId,
          read: false,
        },
      }),
      prisma.subscription.findUnique({
        where: { userId: ownerId },
      }),
    ])

    // Calculate a simulated storage size: 1.85MB average per uploaded image file (shared across the workspace)
    const simulatedStorageMB = parseFloat((imagesCount * 1.85).toFixed(2))

    // Use subscription's storage limit, or default to 100 MB for free tier
    const storageLimitMB = subscription?.storageLimitMB || 100
    const currentPlan = subscription?.plan || 'free'
    const planInterval = subscription?.interval || 'monthly'
    const planStatus = subscription?.status || 'active'

    let userRole = 'Owner'
    if (user && user.email) {
      const invitation = await prisma.teamMember.findFirst({
        where: { email: user.email, status: 'Active' },
      })
      if (invitation) {
        userRole = invitation.role
      }
    }

    return NextResponse.json({
      projectsCount,
      imagesCount,
      commentsCount,
      unreadNotificationsCount,
      storageUsedMB: simulatedStorageMB,
      storageLimitMB,
      currentPlan,
      planInterval,
      planStatus,
      bio: user?.bio || '',
      userImage: user?.image || '',
      userRole,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
