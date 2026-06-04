import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { ViewClient } from './ViewClient'

interface PageProps {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  const project = await prisma.project.findUnique({
    where: { publicToken: token },
    select: { title: true },
  })

  return {
    title: project ? `${project.title} — Visual Review Board | PixelPin` : "Review Board — PixelPin",
    description: "Collaborate visually. Leave precise comments and pin annotations directly on this image review board.",
  }
}


export default async function ViewPage({ params }: PageProps) {
  const { token } = await params

  const project = await prisma.project.findUnique({
    where: { publicToken: token },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      images: {
        orderBy: { createdAt: 'asc' },
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
    },
  })

  if (!project) {
    notFound()
  }

  const session = await auth()

  // Find workspace owner ID of the project creator
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

  // Get active role of current user in project's workspace
  let userRole = 'External'
  if (session?.user?.id === workspaceOwnerId) {
    userRole = 'Owner'
  } else if (session?.user?.email) {
    const myInvitation = await prisma.teamMember.findFirst({
      where: { email: session.user.email, invitedById: workspaceOwnerId, status: 'Active' },
    })
    if (myInvitation) {
      userRole = myInvitation.role
    }
  }

  const isOwner = userRole === 'Owner' || userRole === 'Admin' || (userRole === 'Collaborator' && session?.user?.id === project.userId)

  // Get project owner subscription and branding settings
  const ownerSubscription = await prisma.subscription.findUnique({
    where: { userId: project.userId },
  })
  const ownerPlan = ownerSubscription?.plan || 'free'

  const ownerOrg = await prisma.organization.findUnique({
    where: { userId: project.userId },
  })

  // Serialize models for standard client passing
  const serializedProject = {
    id: project.id,
    title: project.title,
    publicToken: project.publicToken,
    userId: project.userId,
    createdAt: project.createdAt.toISOString(),
    user: project.user,
    images: project.images.map((img) => ({
      id: img.id,
      title: img.title,
      filename: img.filename,
      originalName: img.originalName,
      width: img.width,
      height: img.height,
      projectId: img.projectId,
      createdAt: img.createdAt.toISOString(),
      comments: img.comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        xPercent: comment.xPercent,
        yPercent: comment.yPercent,
        guestName: comment.guestName,
        userId: comment.userId,
        resolved: comment.resolved,
        fileUrl: comment.fileUrl,
        fileName: comment.fileName,
        fileType: comment.fileType,
        createdAt: comment.createdAt.toISOString(),
        user: comment.user,
      })),
    })),
  }

  return (
    <ViewClient
      initialProject={serializedProject}
      isOwner={isOwner}
      session={session}
      ownerPlan={ownerPlan}
      ownerOrganization={ownerOrg ? {
        name: ownerOrg.name,
        logoUrl: ownerOrg.logoUrl,
        brandColor: ownerOrg.brandColor,
        tagline: ownerOrg.tagline,
      } : null}
    />
  )
}
