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

    const organization = await prisma.organization.findUnique({
      where: { userId: ownerId },
    })

    return NextResponse.json(organization)
  } catch (error) {
    console.error("Error fetching organization:", error)
    return NextResponse.json(
      { error: "Failed to fetch organization" },
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

    if (session.user.email) {
      const memberRecord = await prisma.teamMember.findFirst({
        where: { email: session.user.email, status: 'Active' },
      })
      if (memberRecord && (memberRecord.role === 'Collaborator' || memberRecord.role === 'Reviewer')) {
        return NextResponse.json({ error: 'Only administrators can update organization details.' }, { status: 403 })
      }
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

    const { name, website, industry, teamSize, description, logoUrl, brandColor, tagline, phone, address } =
      await request.json()

    // Get user subscription plan to check limits
    const subscription = await prisma.subscription.findUnique({
      where: { userId: ownerId },
    })
    const plan = subscription?.plan || 'free'

    if (plan === 'free') {
      return NextResponse.json(
        { error: 'Organization profile and branding are only available on paid plans. Please upgrade your plan.' },
        { status: 403 }
      )
    }

    const organization = await prisma.organization.upsert({
      where: { userId: ownerId },
      create: {
        name: name || "",
        website: website || "",
        industry: industry || "",
        teamSize: teamSize || "",
        description: description || "",
        logoUrl: logoUrl || "",
        brandColor: brandColor || "#6366f1",
        tagline: tagline || "",
        phone: phone || "",
        address: address || "",
        userId: ownerId,
      },
      update: {
        name: name || "",
        website: website || "",
        industry: industry || "",
        teamSize: teamSize || "",
        description: description || "",
        logoUrl: logoUrl || "",
        brandColor: brandColor || "#6366f1",
        tagline: tagline || "",
        phone: phone || "",
        address: address || "",
      },
    })

    return NextResponse.json(organization)
  } catch (error) {
    console.error("Error saving organization:", error)
    return NextResponse.json(
      { error: "Failed to save organization" },
      { status: 500 }
    )
  }
}
