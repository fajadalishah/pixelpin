import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

const publicPaths = ['/', '/sign-in', '/sign-up']

export default auth((req) => {
  const { pathname } = req.nextUrl

  const isPublicPath = publicPaths.includes(pathname)
  const isViewPath = pathname.startsWith('/view/')
  const isApiPath = pathname.startsWith('/api/')
  const isStaticPath = pathname.startsWith('/_next/') || pathname.includes('.')

  if (isPublicPath || isViewPath || isApiPath || isStaticPath) {
    return NextResponse.next()
  }

  if (!req.auth) {
    const signInUrl = new URL('/sign-in', req.nextUrl.origin)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
