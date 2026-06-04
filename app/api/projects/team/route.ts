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
    const userEmail = session.user.email

    // Step 1: Find all workspace members connected to this user
    // Case A: Current user is the workspace owner (they invited others)
    const invitedByMe = await prisma.teamMember.findMany({
      where: { invitedById: userId, status: 'Active' },
      select: { email: true },
    })

    // Case B: Current user was invited by someone (find the owner)
    let ownerIds: string[] = []
    if (userEmail) {
      const myInvitations = await prisma.teamMember.findMany({
        where: { email: userEmail, status: 'Active' },
        select: { invitedById: true },
      })
      ownerIds = myInvitations.map(inv => inv.invitedById)
    }

    // Step 2: Collect all team member user IDs
    const teamUserIds = new Set<string>()

    // Add owner IDs (people who invited me)
    for (const ownerId of ownerIds) {
      teamUserIds.add(ownerId)

      // Also find all other members invited by the same owner
      const coMembers = await prisma.teamMember.findMany({
        where: { invitedById: ownerId, status: 'Active' },
        select: { email: true },
      })

      for (const member of coMembers) {
        const memberUser = await prisma.user.findUnique({
          where: { email: member.email },
          select: { id: true },
        })
        if (memberUser) {
          teamUserIds.add(memberUser.id)
        }
      }
    }

    // Add users invited by me
    for (const member of invitedByMe) {
      const memberUser = await prisma.user.findUnique({
        where: { email: member.email },
        select: { id: true },
      })
      if (memberUser) {
        teamUserIds.add(memberUser.id)
      }
    }

    // Add myself
    teamUserIds.add(userId)

    // Step 3: Fetch all projects from all team members (excluding current user's own)
    const teamProjects = await prisma.project.findMany({
      where: {
        userId: { in: Array.from(teamUserIds) },
      },
      include: {
        images: {
          select: { id: true, filename: true },
          take: 1,
          orderBy: { orderIndex: 'asc' },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            images: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get comment counts
    const projectsWithCounts = await Promise.all(
      teamProjects.map(async (project) => {
        const commentCount = await prisma.comment.count({
          where: {
            image: {
              projectId: project.id,
            },
          },
        })

        return {
          id: project.id,
          title: project.title,
          publicToken: project.publicToken,
          createdAt: project.createdAt.toISOString(),
          imageCount: project._count.images,
          commentCount,
          thumbnail: project.images[0]?.filename || null,
          owner: {
            id: project.user.id,
            name: project.user.name,
            email: project.user.email,
            isMe: project.user.id === userId,
          },
        }
      })
    )
    // Determine if current user is the workspace owner (they invited people)
    const isWorkspaceOwner = invitedByMe.length > 0

    return NextResponse.json({ projects: projectsWithCounts, isWorkspaceOwner })
  } catch (error) {
    console.error('Error fetching team projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team projects' },
      { status: 500 }
    )
  }
}
