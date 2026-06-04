import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { uploadToBlob, deleteFromBlob } from '@/lib/storage'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params
    const contentType = request.headers.get('content-type') || ''
    let content: string | null = null
    let resolved: boolean | undefined = undefined
    let annotationType: string | null = null
    let annotationData: string | null = null
    let file: File | null = null
    let removeFile = false
    let linkUrl: string | null = null
    let linkTitle: string | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      content = formData.get('content') as string | null
      const resolvedVal = formData.get('resolved') as string | null
      if (resolvedVal !== null) resolved = resolvedVal === 'true'
      annotationType = formData.get('annotationType') as string | null
      annotationData = formData.get('annotationData') as string | null
      file = formData.get('file') as File | null
      removeFile = formData.get('removeFile') === 'true'
      linkUrl = formData.get('linkUrl') as string | null
      linkTitle = formData.get('linkTitle') as string | null
    } else {
      const body = await request.json()
      content = body.content
      resolved = body.resolved
      annotationType = body.annotationType
      annotationData = body.annotationData
      removeFile = body.removeFile === true
      linkUrl = body.linkUrl
      linkTitle = body.linkTitle
    }

    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        image: {
          include: {
            project: true,
          },
        },
      },
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const ownerSubscription = await prisma.subscription.findUnique({
      where: { userId: comment.image.project.userId },
    })
    const ownerPlan = ownerSubscription?.plan || 'free'


    // Block attachments on free plan
    if (file && file.size > 0 && file.name && ownerPlan === 'free') {
      return NextResponse.json(
        { error: 'File attachments are only available on projects created by Starter, Pro, or Business plans.' },
        { status: 403 }
      )
    }

    const isProjectOwner = session?.user?.id && comment.image.project.userId === session.user.id
    const isCommentAuthor = session?.user?.id && comment.userId === session.user.id

    const { searchParams } = new URL(request.url)
    const requestGuestName = searchParams.get('guestName')
    const isGuestAuthor = !comment.userId && requestGuestName && comment.guestName === requestGuestName

    const canResolve = isProjectOwner
    const canEditContent = isProjectOwner || isCommentAuthor || isGuestAuthor

    if (resolved !== undefined && !canResolve) {
      return NextResponse.json(
        { error: 'Only the project owner can resolve comments' },
        { status: 403 }
      )
    }

    if (content !== null && content !== undefined && !canEditContent) {
      return NextResponse.json(
        { error: 'Unauthorized to edit this comment' },
        { status: 403 }
      )
    }

    const updateData: any = {}
    if (resolved !== undefined) updateData.resolved = resolved
    if (content !== null && content !== undefined) updateData.content = content
    if (annotationType !== null && annotationType !== undefined) updateData.annotationType = annotationType
    if (annotationData !== null && annotationData !== undefined) updateData.annotationData = annotationData

    if (linkUrl !== undefined) {
      if (linkUrl === null || linkUrl === '') {
        updateData.fileUrl = null
        updateData.fileName = null
        updateData.fileType = null
      } else {
        updateData.fileUrl = linkUrl
        updateData.fileName = linkTitle || 'Preview Link'
        updateData.fileType = 'link'
      }
    }

    // File updates
    if (file && file.size > 0 && file.name) {
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Attached file too large. Maximum size is 5MB' },
          { status: 400 }
        )
      }

      // Delete old file
      if (comment.fileUrl) {
        await deleteFromBlob(comment.fileUrl)
      }

      const crypto = await import('crypto')
      const ext = file.name.substring(file.name.lastIndexOf('.'))
      const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`

      updateData.fileUrl = await uploadToBlob(file, `comments/${uniqueName}`, { contentType: file.type })
      updateData.fileName = file.name
      updateData.fileType = file.type
    } else if (removeFile) {
      // Delete old file
      if (comment.fileUrl) {
        await deleteFromBlob(comment.fileUrl)
      }
      updateData.fileUrl = null
      updateData.fileName = null
      updateData.fileType = null
    }

    const updatedComment = await prisma.comment.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(updatedComment)
  } catch (error) {
    console.error('Error updating comment:', error)
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        image: {
          include: {
            project: true,
          },
        },
      },
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const isProjectOwner = session?.user?.id && comment.image.project.userId === session.user.id
    const isCommentAuthor = session?.user?.id && comment.userId === session.user.id

    const { searchParams } = new URL(request.url)
    const requestGuestName = searchParams.get('guestName')
    const isGuestAuthor = !comment.userId && requestGuestName && comment.guestName === requestGuestName

    const isAuthorized = isProjectOwner || isCommentAuthor || isGuestAuthor

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this comment' },
        { status: 403 }
      )
    }

    // Delete comment file attachment if it exists
    if (comment.fileUrl) {
      await deleteFromBlob(comment.fileUrl)
    }

    await prisma.comment.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    )
  }
}
