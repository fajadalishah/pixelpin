/**
 * Returns the correct display URL for an image filename.
 * - Blob storage URLs (https://...) are returned as-is
 * - Local filenames (legacy) are prefixed with /uploads/
 */
export function getImageUrl(filename: string): string {
  if (!filename) return ''
  
  if (filename.startsWith('http://localhost') || filename.startsWith('http://127.0.0.1')) {
    try {
      const url = new URL(filename)
      return url.pathname
    } catch {
      // ignore
    }
  }

  if (filename.startsWith('http://') || filename.startsWith('https://') || filename.startsWith('/')) {
    return filename
  }
  return `/uploads/${filename}`
}
