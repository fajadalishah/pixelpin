import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
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
          orderBy: [
            { orderIndex: 'asc' },
            { createdAt: 'asc' }
          ],
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
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error fetching project by token:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { status, statuses } = await request.json()

    if (!status && !statuses) {
      return NextResponse.json({ error: 'Status or statuses list is required' }, { status: 400 })
    }

    const project = await prisma.project.findUnique({
      where: { publicToken: token },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (statuses !== undefined) updateData.statuses = statuses

    const updatedProject = await prisma.project.update({
      where: { id: project.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        images: {
          orderBy: [
            { orderIndex: 'asc' },
            { createdAt: 'asc' }
          ],
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

    // Create database notification for the project owner
    try {
      await prisma.notification.create({
        data: {
          userId: project.userId,
          title: `Project Status Changed`,
          message: `Your project "${project.title}" has been updated to status: "${status}".`,
          link: `/view/${project.publicToken}`,
        },
      })
    } catch (notifyErr) {
      console.error('Failed to create notification on project status update:', notifyErr)
    }

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error('Error updating project status by token:', error)
    return NextResponse.json(
      { error: 'Failed to update project status' },
      { status: 500 }
    )
  }
}
