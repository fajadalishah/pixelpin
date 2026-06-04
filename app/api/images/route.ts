import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { deleteFromBlob } from '@/lib/storage'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    let ownerId = userId
    if (session.user.email) {
      const invitation = await prisma.teamMember.findFirst({
        where: { email: session.user.email, status: 'Active' },
      })
      if (invitation) {
        ownerId = invitation.invitedById
      }
    }

    // Get team members in the workspace to share projects
    const teamMembers = await prisma.teamMember.findMany({
      where: { invitedById: ownerId, status: 'Active' },
      select: { email: true },
    })
    const teamEmails = teamMembers.map(m => m.email)

    const teamUsers = await prisma.user.findMany({
      where: { email: { in: teamEmails } },
      select: { id: true },
    })

    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        images: {
          orderBy: [
            { orderIndex: 'asc' },
            { createdAt: 'asc' }
          ],
          include: {
            _count: {
              select: { comments: true },
            },
          },
        },
      },
    })

    // Map projects to include aggregate stats
    const mappedProjects = projects.map((project) => {
      const imageCount = project.images.length
      const commentCount = project.images.reduce(
        (sum, img) => sum + img._count.comments,
        0
      )
      const thumbnail = project.images[0]?.filename || null

      return {
        id: project.id,
        title: project.title,
        publicToken: project.publicToken,
        createdAt: project.createdAt,
        imageCount,
        commentCount,
        thumbnail,
      }
    })

    return NextResponse.json(mappedProjects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('id')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        images: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let userRole = 'Owner'
    let ownerId = session.user.id
    if (session.user.email) {
      const invitation = await prisma.teamMember.findFirst({
        where: { email: session.user.email, status: 'Active' },
      })
      if (invitation) {
        ownerId = invitation.invitedById
        userRole = invitation.role
      }
    }
    if (userRole === 'Reviewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Determine allowed project user IDs for deletion
    let allowedUserIds = [session.user.id]
    if (userRole === 'Owner' || userRole === 'Admin') {
      const teamMembers = await prisma.teamMember.findMany({
        where: { invitedById: ownerId, status: 'Active' },
        select: { email: true },
      })
      const teamEmails = teamMembers.map(m => m.email)
      const teamUsers = await prisma.user.findMany({
        where: { email: { in: teamEmails } },
        select: { id: true },
      })
      allowedUserIds = [ownerId, ...teamUsers.map(u => u.id)]
    }

    if (!allowedUserIds.includes(project.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete image files from blob storage
    for (const image of project.images) {
      await deleteFromBlob(image.filename)
    }

    // Delete comment attachments from disk
    const commentsWithAttachments = await prisma.comment.findMany({
      where: {
        image: { projectId },
        NOT: { fileUrl: null },
      },
      select: {
        fileUrl: true,
      },
    })

    for (const comment of commentsWithAttachments) {
      if (comment.fileUrl) {
        await deleteFromBlob(comment.fileUrl)
      }
    }

    // Delete project from database (cascade deletes images and comments)
    await prisma.project.delete({
      where: { id: projectId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
