import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { uploadToBlob, deleteFromBlob } from '@/lib/storage'
import crypto from 'crypto'

// DELETE: Bulk Delete Projects
export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ids } = await request.json()
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty IDs list' }, { status: 400 })
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

    // Verify all target projects belong to allowed user IDs
    const projects = await prisma.project.findMany({
      where: {
        id: { in: ids },
        userId: { in: allowedUserIds },
      },
      include: {
        images: true,
      },
    })

    if (projects.length === 0) {
      return NextResponse.json({ error: 'No matching projects found' }, { status: 404 })
    }



    // Unlink file assets from disk
    for (const project of projects) {
      for (const image of project.images) {
        await deleteFromBlob(image.filename)
      }
      
      // Delete comment attachments from disk for this project
      const commentsWithAttachments = await prisma.comment.findMany({
        where: {
          image: { projectId: project.id },
          NOT: { fileUrl: null },
        },
        select: { fileUrl: true },
      })
      for (const comment of commentsWithAttachments) {
        if (comment.fileUrl) {
          await deleteFromBlob(comment.fileUrl)
        }
      }
    }

    // Bulk delete from database (Cascade deletes images & comments)
    await prisma.project.deleteMany({
      where: {
        id: { in: projects.map(p => p.id) },
      },
    })

    return NextResponse.json({ success: true, count: projects.length })
  } catch (error) {
    console.error('Bulk delete error:', error)
    return NextResponse.json({ error: 'Failed to perform bulk deletion' }, { status: 500 })
  }
}

// PATCH: Bulk Archive / Unarchive Projects
export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ids, action } = await request.json()
    if (!ids || !Array.isArray(ids) || ids.length === 0 || !['archive', 'unarchive'].includes(action)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
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

    // Determine allowed project user IDs for archiving
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

    const projects = await prisma.project.findMany({
      where: {
        id: { in: ids },
        userId: { in: allowedUserIds },
      },
    })

    if (projects.length === 0) {
      return NextResponse.json({ error: 'No matching projects found' }, { status: 404 })
    }

    // Update each title individually to add/remove the simulated prefix
    await prisma.$transaction(
      projects.map((project) => {
        let newTitle = project.title
        if (action === 'archive' && !project.title.startsWith('[ARCHIVED] ')) {
          newTitle = `[ARCHIVED] ${project.title}`
        } else if (action === 'unarchive' && project.title.startsWith('[ARCHIVED] ')) {
          newTitle = project.title.replace('[ARCHIVED] ', '')
        }

        return prisma.project.update({
          where: { id: project.id },
          data: { title: newTitle },
        })
      })
    )

    return NextResponse.json({ success: true, count: projects.length })
  } catch (error) {
    console.error('Bulk patch error:', error)
    return NextResponse.json({ error: 'Failed to update project status' }, { status: 500 })
  }
}

// POST: Bulk Duplicate / Clone Projects
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ids } = await request.json()
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty IDs list' }, { status: 400 })
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

    // Determine allowed project user IDs for duplication
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

    const projects = await prisma.project.findMany({
      where: {
        id: { in: ids },
        userId: { in: allowedUserIds },
      },
      include: {
        images: true,
      },
    })

    if (projects.length === 0) {
      return NextResponse.json({ error: 'No matching projects found' }, { status: 404 })
    }


    const duplicatedProjects = []

    for (const project of projects) {
      const publicToken = crypto.randomBytes(16).toString('hex')
      let newTitle = project.title
      if (project.title.startsWith('[ARCHIVED] ')) {
        const baseTitle = project.title.replace('[ARCHIVED] ', '')
        newTitle = `[ARCHIVED] Copy of ${baseTitle}`
      } else {
        newTitle = `Copy of ${project.title}`
      }

      // Create cloned project record
      const clonedProject = await prisma.project.create({
        data: {
          title: newTitle,
          publicToken,
          userId: session.user.id,
          status: project.status,
          statuses: project.statuses,
        },
      })

      // Duplicate each image/file
      for (const image of project.images) {
        let newFilename = image.filename

        // Copy physical file if it is a local upload
        // For blob storage, we can reuse the same URL - no physical copy needed
        // The blob URL remains valid and accessible

        await prisma.image.create({
          data: {
            title: image.title,
            filename: newFilename,
            originalName: image.originalName,
            width: image.width,
            height: image.height,
            projectId: clonedProject.id,
            orderIndex: image.orderIndex,
          },
        })
      }

      duplicatedProjects.push(clonedProject)
    }

    return NextResponse.json({ success: true, count: duplicatedProjects.length })
  } catch (error) {
    console.error('Bulk duplicate error:', error)
    return NextResponse.json({ error: 'Failed to duplicate projects' }, { status: 500 })
  }
}
