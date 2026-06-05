import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { title, imageIds, imageRenames, allowDownload, status, statuses } = body

    // Verify project exists and check user permissions
    const project = await prisma.project.findUnique({
      where: { id },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
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

    // Determine allowed project user IDs for updating
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

    // Update fields if provided
    const updateData: any = {}
    if (title !== undefined) {
      updateData.title = title.trim() || 'Untitled Project'
    }
    if (allowDownload !== undefined) {
      updateData.allowDownload = !!allowDownload
    }
    if (status !== undefined) {
      updateData.status = status
    }
    if (statuses !== undefined && Array.isArray(statuses)) {
      updateData.statuses = statuses
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.project.update({
        where: { id },
        data: updateData,
      })
    }

    // Update images orderIndex and originalName if provided
    if (imageIds && Array.isArray(imageIds)) {
      const renameMap = new Map<string, string>()
      if (imageRenames && Array.isArray(imageRenames)) {
        imageRenames.forEach((rename: any) => {
          if (rename && typeof rename.id === 'string' && typeof rename.originalName === 'string') {
            renameMap.set(rename.id, rename.originalName)
          }
        })
      }

      await prisma.$transaction(
        imageIds.map((imgId, idx) => {
          const updateData: any = { orderIndex: idx }
          const newName = renameMap.get(imgId)
          if (newName !== undefined) {
            updateData.originalName = newName
          }
          return prisma.image.update({
            where: {
              id: imgId,
              projectId: id, // enforce scoped update
            },
            data: updateData,
          })
        })
      )
    } else if (imageRenames && Array.isArray(imageRenames)) {
      await prisma.$transaction(
        imageRenames.map((rename: any) =>
          prisma.image.update({
            where: {
              id: rename.id,
              projectId: id,
            },
            data: { originalName: rename.originalName },
          })
        )
      )
    }

    // Fetch and return the fully updated project details
    const updatedProject = await prisma.project.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        images: {
          where: { versionOfId: null },
          orderBy: [
            { orderIndex: 'asc' },
            { createdAt: 'asc' }
          ],
          include: {
            versions: {
              orderBy: { createdAt: 'desc' },
              include: {
                comments: {
                  orderBy: { createdAt: 'asc' },
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            comments: {
              orderBy: { createdAt: 'asc' },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}
