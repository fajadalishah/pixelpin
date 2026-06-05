export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return d.toLocaleDateString()
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function getAttachmentUrl(url: string | null): string {
  if (!url) return ''
  if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
    try {
      const parsed = new URL(url)
      return parsed.pathname
    } catch {
      // ignore
    }
  }
  return url
}
