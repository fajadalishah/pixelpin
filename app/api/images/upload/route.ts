import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { uploadToBlob } from '@/lib/storage'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const projectTitle = formData.get('title') as string | null
    const projectId = formData.get('projectId') as string | null

    const linksStr = formData.get('links') as string | null
    let linksCount = 0
    try {
      if (linksStr) {
        linksCount = JSON.parse(linksStr).length
      }
    } catch {}

    const uploadedFilesStr = formData.get('uploadedFiles') as string | null
    let uploadedFiles: Array<{ url: string; name: string }> = []
    try {
      if (uploadedFilesStr) {
        uploadedFiles = JSON.parse(uploadedFilesStr)
      }
    } catch {}

    if (files.length === 0 && uploadedFiles.length === 0 && linksCount === 0) {
      return NextResponse.json({ error: 'No files or links provided' }, { status: 400 })
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf']

    // Validate all files
    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type for "${file.name}". Supported: JPEG, PNG, GIF, WebP, SVG, PDF` },
          { status: 400 }
        )
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File "${file.name}" is too large. Maximum size is 10MB` },
          { status: 400 }
        )
      }
    }

    // Get the workspace owner ID (if invited, the inviter; otherwise, the current user)
    let ownerId = session.user.id
    let userRole = 'Owner'
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
      return NextResponse.json(
        { error: 'Reviewers are not permitted to create projects or upload files.' },
        { status: 403 }
      )
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

    // Get user subscription plan to check limits (based on workspace owner)
    const subscription = await prisma.subscription.findUnique({
      where: { userId: ownerId },
    })
    const plan = subscription?.plan || 'free'
    const limitMB = subscription?.storageLimitMB || 100

    if (!projectId) {
      // Check project count limit for free plan (based on workspace owner)
      const projectsCount = await prisma.project.count({
        where: { userId: ownerId },
      })
      if (plan === 'free' && projectsCount >= 3) {
        return NextResponse.json(
          { error: 'You have reached the limit of 3 projects on the Free plan. Please upgrade your plan.' },
          { status: 403 }
        )
      }
    }

    // Check storage limit (combined storage for all users in the workspace)
    const imagesCount = await prisma.image.count({
      where: {
        project: { userId: { in: allWorkspaceUserIds } },
      },
    })
    const currentStorageMB = imagesCount * 1.85
    const newFilesCount = files.length
    const expectedStorageMB = currentStorageMB + (newFilesCount * 1.85)

    if (expectedStorageMB > limitMB) {
      return NextResponse.json(
        { error: `Storage limit exceeded. This upload would exceed your ${limitMB >= 1024 ? `${(limitMB / 1024).toFixed(0)} GB` : `${limitMB} MB`} plan limit.` },
        { status: 403 }
      )
    }



    let project
    let nextOrderIndex = 0

    if (projectId) {
      // Find existing project owned by anyone in the workspace
      project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: { in: allWorkspaceUserIds },
        },
      })

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found or unauthorized' },
          { status: 404 }
        )
      }

      // Find maximum orderIndex to append after it
      const maxImage = await prisma.image.findFirst({
        where: { projectId: project.id },
        orderBy: { orderIndex: 'desc' },
      })
      if (maxImage) {
        nextOrderIndex = maxImage.orderIndex + 1
      }
    } else {
      // Generate unique project public token
      const publicToken = crypto.randomBytes(16).toString('hex')

      // Create the Project
      project = await prisma.project.create({
        data: {
          title: projectTitle?.trim() || `Project - ${new Date().toLocaleDateString()}`,
          publicToken,
          userId: session.user.id,
        },
      })
    }

    // Process and save all images/PDFs
    for (const file of files) {
      const ext = file.name.substring(file.name.lastIndexOf('.'))
      const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`

      const blobUrl = await uploadToBlob(file, `uploads/${uniqueName}`, { contentType: file.type })

      // Save image/PDF to database
      await prisma.image.create({
        data: {
          title: file.name.replace(ext, ''),
          filename: blobUrl,
          originalName: file.name,
          width: 1920,
          height: 1080,
          projectId: project.id,
          orderIndex: nextOrderIndex++,
        },
      })
    }

    // Process and save all pre-uploaded client-side files
    for (const uFile of uploadedFiles) {
      const ext = uFile.name.substring(uFile.name.lastIndexOf('.'))
      await prisma.image.create({
        data: {
          title: uFile.name.replace(ext, ''),
          filename: uFile.url,
          originalName: uFile.name,
          width: 1920,
          height: 1080,
          projectId: project.id,
          orderIndex: nextOrderIndex++,
        },
      })
    }

    // Process and save all links
    if (linksStr) {
      try {
        const links = JSON.parse(linksStr) as Array<{ url: string; title: string }>
        for (const l of links) {
          let parsedUrl = l.url
          try {
            const urlObj = new URL(parsedUrl)
            await prisma.image.create({
              data: {
                title: l.title || urlObj.hostname,
                filename: parsedUrl,
                originalName: l.title || parsedUrl,
                width: 1920,
                height: 1080,
                projectId: project.id,
                orderIndex: nextOrderIndex++,
              },
            })
          } catch (err) {
            console.error('Invalid link URL skipped:', parsedUrl, err)
          }
        }
      } catch (err) {
        console.error('Error parsing links:', err)
      }
    }

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload project images' },
      { status: 500 }
    )
  }
}
