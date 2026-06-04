import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import Facebook from 'next-auth/providers/facebook'
import Apple from 'next-auth/providers/apple'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { authConfig } from './auth.config'

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        name: { label: 'Name', type: 'text' },
        isMockOAuth: { label: 'isMockOAuth', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null

        // Handle simulation bypass for OAuth when developer credentials are placeholders
        if (credentials.isMockOAuth === 'true') {
          let user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          })

          if (!user) {
            user = await prisma.user.create({
              data: {
                email: credentials.email as string,
                name: (credentials.name as string) || 'Mock OAuth User',
                password: '', // Empty password for OAuth users
              },
            })
          }
          return { id: user.id, name: user.name, email: user.email }
        }

        if (!credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isValid) return null

        return { id: user.id, name: user.name, email: user.email }
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Facebook({
      clientId: process.env.AUTH_FACEBOOK_ID,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET,
    }),
    Apple({
      clientId: process.env.AUTH_APPLE_ID,
      clientSecret: process.env.AUTH_APPLE_SECRET,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider !== 'credentials') {
        const email = user.email
        const name = user.name || email?.split('@')[0] || 'OAuth User'

        if (!email) return false

        try {
          let dbUser = await prisma.user.findUnique({
            where: { email },
          })

          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                email,
                name,
                password: '', // Empty password for OAuth users
              },
            })
          }
          user.id = dbUser.id
        } catch (err) {
          console.error('Error in OAuth signIn callback:', err)
          return false
        }
      }

      // Auto-accept any pending team invitations for this user
      if (user.email) {
        try {
          await prisma.teamMember.updateMany({
            where: {
              email: user.email,
              status: 'Pending',
            },
            data: {
              status: 'Active',
              name: user.name || user.email.split('@')[0],
              acceptedAt: new Date(),
            },
          })
        } catch (err) {
          console.error('Error accepting team invitations on sign-in:', err)
        }
      }

      return true
    },
    async jwt({ token, user }) {
      if (token && user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        // Query DB by email to ensure user ID is synchronized with DB even if browser cookie has a stale ID
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email as string },
            select: { id: true, image: true },
          })
          if (dbUser) {
            session.user.id = dbUser.id
            if (dbUser.image) {
              session.user.image = dbUser.image
            }
          } else {
            session.user.id = token.id as string
          }
        } catch {
          session.user.id = token.id as string
        }
      }
      return session
    },
  },
})
