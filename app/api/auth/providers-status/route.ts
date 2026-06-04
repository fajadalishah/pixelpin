import { NextResponse } from 'next/server'

export async function GET() {
  const googleConfigured =
    process.env.AUTH_GOOGLE_ID &&
    process.env.AUTH_GOOGLE_ID !== 'google-client-id-placeholder'

  const facebookConfigured =
    process.env.AUTH_FACEBOOK_ID &&
    process.env.AUTH_FACEBOOK_ID !== 'facebook-client-id-placeholder'

  const appleConfigured =
    process.env.AUTH_APPLE_ID &&
    process.env.AUTH_APPLE_ID !== 'apple-client-id-placeholder'

  return NextResponse.json({
    google: !!googleConfigured,
    facebook: !!facebookConfigured,
    apple: !!appleConfigured,
  })
}
