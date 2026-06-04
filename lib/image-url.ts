/**
 * Returns the correct display URL for an image filename.
 * - Blob storage URLs (https://...) are returned as-is
 * - Local filenames (legacy) are prefixed with /uploads/
 */
export function getImageUrl(filename: string): string {
  if (!filename) return ''
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename
  }
  return `/uploads/${filename}`
}
