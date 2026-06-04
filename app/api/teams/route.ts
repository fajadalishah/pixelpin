import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let ownerId = session.user.id
    if (session.user.email) {
      const invitation = await prisma.teamMember.findFirst({
        where: { email: session.user.email, status: 'Active' },
      })
      if (invitation) {
        ownerId = invitation.invitedById
      }
    }

    const members = await prisma.teamMember.findMany({
      where: { invitedById: ownerId },
      orderBy: { invitedAt: "desc" },
    })

    return NextResponse.json(members)
  } catch (error) {
    console.error("Error fetching team members:", error)
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.email) {
      const memberRecord = await prisma.teamMember.findFirst({
        where: { email: session.user.email, status: 'Active' },
      })
      if (memberRecord && (memberRecord.role === 'Collaborator' || memberRecord.role === 'Reviewer')) {
        return NextResponse.json({ error: 'Only administrators can delete team members.' }, { status: 403 })
      }
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Missing member id" }, { status: 400 })
    }

    let ownerId = session.user.id
    if (session.user.email) {
      const invitation = await prisma.teamMember.findFirst({
        where: { email: session.user.email, status: 'Active' },
      })
      if (invitation) {
        ownerId = invitation.invitedById
      }
    }

    await prisma.teamMember.delete({
      where: {
        id,
        invitedById: ownerId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting team member:", error)
    return NextResponse.json(
      { error: "Failed to delete team member" },
      { status: 500 }
    )
  }
}
