import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'

interface SendEmailArgs {
  to: string
  subject: string
  text: string
  html: string
}

export async function sendEmail({ to, subject, text, html }: SendEmailArgs) {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM || 'PixelPin <noreply@pixelpin.app>'

  // If SMTP configuration is incomplete, fallback to simulation
  if (!host || !port || !user || !pass) {
    console.log(`[EMAIL] SMTP not configured — simulating email to ${to}`)
    return logSimulatedEmail({ to, from, subject, text, html })
  }

  // Create transport with user SMTP settings
  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(port, 10),
    secure: parseInt(port, 10) === 465,
    auth: {
      user,
      pass,
    },
  })

  try {
    // Send mail
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    })

    console.log(`[EMAIL SENT] Message ID: ${info.messageId} to ${to}`)
    return info
  } catch (err) {
    // If SMTP fails, fall back to simulation instead of crashing
    console.error(`[EMAIL ERROR] SMTP delivery failed for ${to}:`, err)
    console.log(`[EMAIL FALLBACK] Logging email to simulated-emails.log instead`)
    return logSimulatedEmail({ to, from, subject, text, html })
  }
}

function logSimulatedEmail({ to, from, subject, text, html }: { to: string; from: string; subject: string; text: string; html: string }) {
  const timestamp = new Date().toISOString()
  const logMessage = `
========================================
[SIMULATED EMAIL SENT]
Timestamp: ${timestamp}
To: ${to}
From: ${from}
Subject: ${subject}
----------------------------------------
TEXT BODY:
${text}
----------------------------------------
HTML BODY:
${html}
========================================
\n`

  console.log(`[SIMULATED EMAIL] To: ${to} | Subject: ${subject} (logged to logs/simulated-emails.log)`)

  try {
    const logsDir = path.join(process.cwd(), 'logs')
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }
    fs.appendFileSync(path.join(logsDir, 'simulated-emails.log'), logMessage)
  } catch (writeErr) {
    console.error('Failed to write simulated email to log file:', writeErr)
  }

  return { messageId: 'simulated-id' }
}
