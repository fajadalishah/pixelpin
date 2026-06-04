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

    let formData: FormData
    try {
      formData = await request.formData()
    } catch (err) {
      console.error('Error parsing formData:', err)
      return NextResponse.json({ error: 'Failed to parse form data' }, { status: 400 })
    }

    const file = formData.get('file') as File | null
    const type = (formData.get('type') as string) || 'user'

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type "${file.type}". Supported: JPEG, PNG, GIF, WebP, SVG` },
        { status: 400 }
      )
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File is too large. Maximum size is 5MB' },
        { status: 400 }
      )
    }

    const ext = file.name.substring(file.name.lastIndexOf('.')) || '.png'
    const uniqueName = `${type}-${session.user.id}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`

    let imageUrl: string
    try {
      imageUrl = await uploadToBlob(file, `avatars/${uniqueName}`, { contentType: file.type })
    } catch (err) {
      console.error('Error uploading to blob:', err)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    try {
      if (type === 'organization') {
        await prisma.organization.upsert({
          where: { userId: session.user.id },
          create: {
            userId: session.user.id,
            logoUrl: imageUrl,
          },
          update: {
            logoUrl: imageUrl,
          },
        })
      } else {
        if (!session.user.email) {
          return NextResponse.json({ error: 'User email not found in session' }, { status: 400 })
        }
        await prisma.user.update({
          where: { email: session.user.email },
          data: { image: imageUrl },
        })
      }
    } catch (err) {
      console.error('Error updating database:', err)
      return NextResponse.json({ error: `Failed to save to database: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 })
    }

    return NextResponse.json({ url: imageUrl })
  } catch (error) {
    console.error('Avatar upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    )
  }
}
