import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

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
        return NextResponse.json({ error: 'Only administrators can invite team members.' }, { status: 403 })
      }
    }

    const body = await request.json().catch(() => ({}))
    const { email, role } = body

    if (!email || !role) {
      return NextResponse.json(
        { error: "Missing email or role" },
        { status: 400 }
      )
    }

    // Get user subscription plan to check limits
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    })
    const plan = subscription?.plan || 'free'

    if (plan === 'free') {
      return NextResponse.json(
        { error: 'Team collaboration is only available on paid plans. Please upgrade your plan.' },
        { status: 403 }
      )
    }

    if (plan === 'starter' && role !== 'Collaborator') {
      return NextResponse.json(
        { error: 'Advanced Team Roles (Admin, Reviewer) are only available on Pro or Business plans. Please upgrade.' },
        { status: 403 }
      )
    }

    // Step 1: Create team member record
    let member
    try {
      member = await prisma.teamMember.create({
        data: {
          email,
          name: email.split("@")[0],
          role,
          status: "Pending",
          invitedById: session.user.id,
        },
      })
    } catch (dbError) {
      console.error("Error creating team member record:", dbError)
      return NextResponse.json(
        { error: "Failed to create team member record" },
        { status: 500 }
      )
    }

    // Step 2: Send invitation email (non-blocking — won't fail the request)
    const senderName = session.user.name || "A PixelPin User"
    
    // Fetch sender's organization name
    const senderOrg = await prisma.organization.findUnique({
      where: { userId: session.user.id },
      select: { name: true },
    })
    const companyName = senderOrg?.name || "their workspace"

    const appBaseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const joinLink = `${appBaseUrl}/sign-up?invite=${encodeURIComponent(email)}`

    const subject = `You've been invited to join ${companyName} on PixelPin!`
    const text = `Hi,\n\n${senderName} has invited you to join ${companyName} on PixelPin as a ${role}.\n\nClick the link below to accept the invitation:\n${joinLink}\n\nBest regards,\nThe PixelPin Team`

    const html = `
      <!DOCTYPE html>
      <html>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
              <!-- Gradient Header -->
              <div style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%); padding: 40px 32px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">
                  PixelPin
                </h1>
                <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 500;">
                  Visual Feedback &amp; Collaboration
                </p>
              </div>

              <!-- Body -->
              <div style="padding: 36px 32px;">
                <h2 style="margin: 0 0 16px; color: #0f172a; font-size: 22px; font-weight: 700;">
                  You're Invited!
                </h2>
                <p style="margin: 0 0 12px; color: #475569; font-size: 15px; line-height: 26px;">
                  Hi there,
                </p>
                <p style="margin: 0 0 24px; color: #475569; font-size: 15px; line-height: 26px;">
                  <strong style="color: #0f172a;">${senderName}</strong> has invited you to collaborate in <strong style="color: #0f172a;">${companyName}</strong> as a <strong style="color: #0f172a;">${role}</strong>.
                </p>

                <!-- Invitation Details Card -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Invited By</td>
                      <td style="padding: 6px 0; color: #0f172a; font-size: 14px; font-weight: 500; text-align: right;">${senderName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Role</td>
                      <td style="padding: 6px 0; color: #0f172a; font-size: 14px; font-weight: 500; text-align: right;">${role}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Email</td>
                      <td style="padding: 6px 0; color: #0f172a; font-size: 14px; font-weight: 500; text-align: right;">${email}</td>
                    </tr>
                  </table>
                </div>

                <!-- Accept Button -->
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${joinLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                    Accept Invitation &amp; Join Team
                  </a>
                </div>

                <p style="margin: 0; color: #94a3b8; font-size: 13px; line-height: 22px; text-align: center;">
                  Or copy and paste this link into your browser:<br />
                  <a href="${joinLink}" style="color: #6366f1; word-break: break-all;">${joinLink}</a>
                </p>
              </div>

              <!-- Footer -->
              <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center;">
                <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 20px;">
                  This invitation was sent from PixelPin. If you did not expect this email, you can safely ignore it.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    // sendEmail now has internal fallback — it will never throw
    let emailSent = true
    try {
      const result = await sendEmail({ to: email, subject, text, html })
      if (result.messageId === 'simulated-id') {
        emailSent = false
      }
    } catch {
      emailSent = false
    }

    return NextResponse.json({
      success: true,
      member,
      emailSent,
      message: emailSent
        ? `Invitation sent to ${email}`
        : `Member added. Email delivery is simulated (check logs/simulated-emails.log).`,
    })
  } catch (error) {
    console.error("Error sending team invitation:", error)
    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 }
    )
  }
}
