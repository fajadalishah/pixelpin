import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { deleteFromBlob } from '@/lib/storage'

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, bio, image } = await request.json()

    if (!session.user.email) {
      return NextResponse.json({ error: "User email not found in session" }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        ...(name !== undefined && { name }),
        ...(bio !== undefined && { bio }),
        ...(image !== undefined && { image }),
      },
      select: { name: true, email: true, bio: true, image: true },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      )
    }

    if (!session.user.email) {
      return NextResponse.json({ error: "User email not found in session" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { password: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.password === "") {
      return NextResponse.json(
        { error: "Password cannot be changed for OAuth accounts" },
        { status: 400 }
      )
    }

    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
      where: { email: session.user.email },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error changing password:", error)
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        projects: {
          include: {
            images: true,
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // 1. Delete user profile picture
    if (user.image) {
      await deleteFromBlob(user.image)
    }

    // 2. Delete project images from disk
    for (const project of user.projects) {
      for (const image of project.images) {
        await deleteFromBlob(image.filename)
      }
    }

    // 3. Delete comment attachments from disk
    const commentsWithAttachments = await prisma.comment.findMany({
      where: {
        userId: user.id,
        NOT: { fileUrl: null },
      },
      select: { fileUrl: true },
    })

    for (const comment of commentsWithAttachments) {
      if (comment.fileUrl) {
        await deleteFromBlob(comment.fileUrl)
      }
    }

    // 4. Delete user (Prisma cascade delete will remove child records)
    await prisma.user.delete({
      where: { id: user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting account:", error)
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    )
  }
}
