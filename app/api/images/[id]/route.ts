import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { deleteFromBlob } from '@/lib/storage'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const image = await prisma.image.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: { comments: true },
        },
      },
    })

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    return NextResponse.json(image)
  } catch (error) {
    console.error('Error fetching image:', error)
    return NextResponse.json(
      { error: 'Failed to fetch image' },
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

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const image = await prisma.image.findUnique({
      where: { id },
      include: {
        project: {
          select: { userId: true },
        },
      },
    })

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    if (image.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const versionsOnly = searchParams.get('versionsOnly') === 'true'

    if (versionsOnly) {
      // Delete comment attachments of versions/revisions from disk first
      const childVersions = await prisma.image.findMany({
        where: { versionOfId: id },
      })

      for (const child of childVersions) {
        const childComments = await prisma.comment.findMany({
          where: {
            imageId: child.id,
            NOT: { fileUrl: null },
          },
          select: { fileUrl: true },
        })
        for (const comment of childComments) {
          if (comment.fileUrl) {
            await deleteFromBlob(comment.fileUrl)
          }
        }
        // Delete the version file from blob storage
        await deleteFromBlob(child.filename)

        // Delete the version database record (cascade deletes comments)
        await prisma.image.delete({
          where: { id: child.id },
        })
      }

      return NextResponse.json({ success: true })
    }

    // Delete comment attachments from disk first
    const commentsWithAttachments = await prisma.comment.findMany({
      where: {
        imageId: id,
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

    // Delete comment attachments of versions/revisions from disk first
    const childVersions = await prisma.image.findMany({
      where: { versionOfId: id },
    })

    for (const child of childVersions) {
      const childComments = await prisma.comment.findMany({
        where: {
          imageId: child.id,
          NOT: { fileUrl: null },
        },
        select: { fileUrl: true },
      })
      for (const comment of childComments) {
        if (comment.fileUrl) {
          await deleteFromBlob(comment.fileUrl)
        }
      }
      // Delete the version file from blob storage
      await deleteFromBlob(child.filename)
    }

    // Delete comments first (cascade should handle it, but being explicit)
    await prisma.comment.deleteMany({
      where: { imageId: id },
    })

    // Delete the image record
    await prisma.image.delete({
      where: { id },
    })

    // Delete the file from blob storage
    await deleteFromBlob(image.filename)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting image:', error)
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    )
  }
}
