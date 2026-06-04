import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        subscription: true,
        organization: true,
        teamMembers: true,
        projects: {
          include: {
            images: {
              include: {
                comments: {
                  include: {
                    user: {
                      select: {
                        name: true,
                        email: true,
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const exportData = {
      exportTimestamp: new Date().toISOString(),
      user: {
        name: user.name,
        email: user.email,
        bio: user.bio,
        image: user.image,
        createdAt: user.createdAt,
      },
      subscription: user.subscription ? {
        plan: user.subscription.plan,
        status: user.subscription.status,
        storageLimitMB: user.subscription.storageLimitMB,
        createdAt: user.subscription.createdAt,
      } : null,
      organization: user.organization ? {
        name: user.organization.name,
        website: user.organization.website,
        industry: user.organization.industry,
        teamSize: user.organization.teamSize,
        description: user.organization.description,
        logoUrl: user.organization.logoUrl,
        brandColor: user.organization.brandColor,
      } : null,
      teamMembers: user.teamMembers.map(member => ({
        name: member.name,
        email: member.email,
        role: member.role,
        status: member.status,
        invitedAt: member.invitedAt,
        acceptedAt: member.acceptedAt,
      })),
      projects: user.projects.map(project => ({
        title: project.title,
        publicToken: project.publicToken,
        createdAt: project.createdAt,
        images: project.images.map(image => ({
          title: image.title,
          originalName: image.originalName,
          filename: image.filename,
          width: image.width,
          height: image.height,
          createdAt: image.createdAt,
          comments: image.comments.map(comment => ({
            content: comment.content,
            xPercent: comment.xPercent,
            yPercent: comment.yPercent,
            guestName: comment.guestName,
            resolved: comment.resolved,
            fileUrl: comment.fileUrl,
            fileName: comment.fileName,
            fileType: comment.fileType,
            annotationType: comment.annotationType,
            annotationData: comment.annotationData,
            createdAt: comment.createdAt,
            author: comment.user ? {
              name: comment.user.name,
              email: comment.user.email,
            } : null,
          })),
        })),
      })),
    }

    const jsonString = JSON.stringify(exportData, null, 2)

    return new Response(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="pixelpin-export-${user.email}.json"`,
      },
    })
  } catch (error) {
    console.error('Error exporting user data:', error)
    return NextResponse.json(
      { error: 'Failed to export user data' },
      { status: 500 }
    )
  }
}
