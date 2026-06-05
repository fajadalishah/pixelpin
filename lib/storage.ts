import { put, del } from '@vercel/blob'
import fs from 'fs'
import path from 'path'

export async function uploadToBlob(file: File | Buffer, filename: string, options?: { contentType?: string }): Promise<string> {
  // If Vercel Blob token is missing, fall back to local public storage
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const publicDir = path.join(process.cwd(), 'public')
      const targetPath = path.join(publicDir, filename)
      const targetDir = path.dirname(targetPath)

      // Ensure directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      let buffer: Buffer
      if (Buffer.isBuffer(file)) {
        buffer = file
      } else {
        buffer = Buffer.from(await file.arrayBuffer())
      }

      fs.writeFileSync(targetPath, buffer)
      
      // Normalize slashes for URL path
      const urlPath = filename.replace(/\\/g, '/')
      return `/${urlPath}`
    } catch (err) {
      console.error('Local file upload fallback failed:', err)
      throw err
    }
  }

  const blob = await put(filename, file, {
    access: 'public',
    contentType: options?.contentType,
  })
  return blob.url
}

export async function deleteFromBlob(url: string): Promise<void> {
  try {
    if (!url) return

    // If Vercel Blob token is missing, fall back to local file deletion
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      let relativePath = url
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      if (url.startsWith(baseUrl)) {
        relativePath = url.replace(baseUrl, '')
      }
      const filePath = path.join(process.cwd(), 'public', relativePath)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
      return
    }

    if (url && url.startsWith('http')) {
      await del(url)
    }
  } catch (error) {
    console.error('Failed to delete blob:', error)
  }
}

