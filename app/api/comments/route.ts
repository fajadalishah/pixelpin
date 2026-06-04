import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { uploadToBlob } from '@/lib/storage'
import crypto from 'crypto'
import { sendEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const session = await auth()
    const formData = await request.formData()

    const imageId = formData.get('imageId') as string | null
    const content = formData.get('content') as string | null
    const xPercent = formData.get('xPercent') as string | null
    const yPercent = formData.get('yPercent') as string | null
    const guestName = formData.get('guestName') as string | null
    const file = formData.get('file') as File | null
    const annotationType = (formData.get('annotationType') as string | null) || 'pin'
    const annotationData = formData.get('annotationData') as string | null

    if (!imageId || !content || xPercent == null || yPercent == null) {
      return NextResponse.json(
        { error: 'Missing required fields: imageId, content, xPercent, yPercent' },
        { status: 400 }
      )
    }

    // Verify image exists
    const image = await prisma.image.findUnique({
      where: { id: imageId },
    })

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    const project = await prisma.project.findUnique({
      where: { id: image.projectId },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Resolve the workspace owner of the project creator
    const creatorUser = await prisma.user.findUnique({
      where: { id: project.userId },
    })

    let workspaceOwnerId = project.userId
    if (creatorUser?.email) {
      const creatorInvitation = await prisma.teamMember.findFirst({
        where: { email: creatorUser.email, status: 'Active' },
      })
      if (creatorInvitation) {
        workspaceOwnerId = creatorInvitation.invitedById
      }
    }

    const ownerSubscription = await prisma.subscription.findUnique({
      where: { userId: workspaceOwnerId },
    })
    const ownerPlan = ownerSubscription?.plan || 'free'


    // Block attachments for free plan
    if (file && file.size > 0 && file.name && ownerPlan === 'free') {
      return NextResponse.json(
        { error: 'File attachments are only available on projects created by Starter, Pro, or Business plans.' },
        { status: 403 }
      )
    }

    const linkUrl = formData.get('linkUrl') as string | null
    const linkTitle = formData.get('linkTitle') as string | null

    let fileUrl: string | null = null
    let fileName: string | null = null
    let fileType: string | null = null

    if (linkUrl) {
      fileUrl = linkUrl
      fileName = linkTitle || 'Preview Link'
      fileType = 'link'
    }

    // Process file attachment if present and valid
    if (file && file.size > 0 && file.name) {
      // Validate file size (max 5MB for comments)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Attached file too large. Maximum size is 5MB' },
          { status: 400 }
        )
      }

      const ext = file.name.substring(file.name.lastIndexOf('.'))
      const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`

      fileUrl = await uploadToBlob(file, `comments/${uniqueName}`, { contentType: file.type })
      fileName = file.name
      fileType = file.type
    }

    // Create comment - either authenticated or guest
    const comment = await prisma.comment.create({
      data: {
        content,
        xPercent: parseFloat(xPercent),
        yPercent: parseFloat(yPercent),
        imageId,
        userId: session?.user?.id || null,
        guestName: session?.user?.id ? null : (guestName || 'Anonymous'),
        fileUrl,
        fileName,
        fileType,
        annotationType,
        annotationData,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Create database notifications and send emails asynchronously
    try {
      const imageWithProject = await prisma.image.findUnique({
        where: { id: imageId },
        include: {
          project: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
      })

      if (imageWithProject) {
        const project = imageWithProject.project
        const owner = project.user
        const commenterName = session?.user?.name || guestName || 'Anonymous'

        const recipientIdsSet = new Set<string>()

        // 1. Add project owner (creator who uploaded the project) to notification list
        if (owner.id) {
          recipientIdsSet.add(owner.id)
        }

        // 2. Add workspace owner (Admin) to notification list
        let workspaceOwnerId = project.userId
        if (owner.email) {
          const creatorInvitation = await prisma.teamMember.findFirst({
            where: { email: owner.email, status: 'Active' },
          })
          if (creatorInvitation) {
            workspaceOwnerId = creatorInvitation.invitedById
          }
        }
        if (workspaceOwnerId) {
          recipientIdsSet.add(workspaceOwnerId)
        }

        // 3. Add other registered users who have commented on this image
        const otherComments = await prisma.comment.findMany({
          where: { imageId },
          select: { userId: true },
          distinct: ['userId'],
        })
        for (const c of otherComments) {
          if (c.userId) {
            recipientIdsSet.add(c.userId)
          }
        }



        const recipientIds = Array.from(recipientIdsSet)

        if (recipientIds.length > 0) {
          const recipients = await prisma.user.findMany({
            where: { id: { in: recipientIds } },
            select: { id: true, email: true, name: true },
          })

          const requestUrl = new URL(request.url)
          const appBaseUrl = `${requestUrl.protocol}//${requestUrl.host}`
          const projectLink = `${appBaseUrl}/view/${project.publicToken}?image=${imageId}&comment=${comment.id}`

          for (const recipient of recipients) {
            // Create database notification
            await prisma.notification.create({
              data: {
                userId: recipient.id,
                title: `New comment on "${project.title}"`,
                message: `"${commenterName}" commented on design "${imageWithProject.originalName}": "${content.substring(0, 60)}${content.length > 60 ? '...' : ''}"`,
                link: `/view/${project.publicToken}?image=${imageId}&comment=${comment.id}`,
              },
            })

            // Prepare email content
            const subject = `[PixelPin] New comment on project "${project.title}"`
            const text = `Hi ${recipient.name},\n\n"${commenterName}" left a new comment on the design "${imageWithProject.originalName}" in project "${project.title}".\n\nComment:\n"${content}"\n\nView and reply here: ${projectLink}\n\nBest regards,\nPixelPin Team`
            
            const html = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <h2 style="color: #0f172a; margin-top: 0; font-size: 20px; font-weight: 700;">New comment on PixelPin</h2>
                <p style="color: #475569; font-size: 15px; line-height: 24px;">
                  Hi <strong>${recipient.name}</strong>,
                </p>
                <p style="color: #475569; font-size: 15px; line-height: 24px;">
                  <strong>${commenterName}</strong> added a comment to the design <strong>${imageWithProject.originalName}</strong> in project <strong>${project.title}</strong>:
                </p>
                <div style="background-color: #f8fafc; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 6px; font-style: italic; color: #334155; font-size: 15px; line-height: 22px; white-space: pre-wrap;">
                  "${content}"
                </div>
                <div style="margin: 30px 0; text-align: center;">
                  <a href="${projectLink}" style="background-color: #ef4444; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px;">
                    View Comment & Reply
                  </a>
                </div>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
                  This is an automated notification from PixelPin. You received this because you are subscribed to comments on this project.
                </p>
              </div>
            `

            // Trigger sending (non-blocking)
            sendEmail({ to: recipient.email, subject, text, html }).catch((err) => {
              console.error(`Failed to send email to ${recipient.email}:`, err)
            })
          }
        }
      }
    } catch (notifyError) {
      console.error('Error generating notification or sending email:', notifyError)
    }

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}
