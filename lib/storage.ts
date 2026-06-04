import { put, del } from '@vercel/blob'

export async function uploadToBlob(file: File | Buffer, filename: string, options?: { contentType?: string }): Promise<string> {
  const blob = await put(filename, file, {
    access: 'public',
    contentType: options?.contentType,
  })
  return blob.url
}

export async function deleteFromBlob(url: string): Promise<void> {
  try {
    if (url && url.startsWith('http')) {
      await del(url)
    }
  } catch (error) {
    console.error('Failed to delete blob:', error)
  }
}
