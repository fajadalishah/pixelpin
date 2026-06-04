import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as HandleUploadBody

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        return {
          allowedContentTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml',
            'application/pdf'
          ],
          tokenPayload: JSON.stringify({
            userId: session.user.id
          })
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Upload is completed, database saving will be handled in a final POST to /api/images/upload
      }
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('Error generating blob upload token:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload token generation failed' },
      { status: 400 }
    )
  }
}
