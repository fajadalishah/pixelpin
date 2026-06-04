'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Check, Trash2, Loader2, MailOpen } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

interface Notification {
  id: string
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
    }
  }

  useEffect(() => {
    fetchNotifications()

    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      }
    } catch (err) {
      console.error('Failed to mark all read:', err)
    }
  }

  const handleMarkRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        )
      }
    } catch (err) {
      console.error('Failed to mark read:', err)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/notifications?id=${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
      }
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }

  const handleClearAll = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
      })
      if (res.ok) {
        setNotifications([])
      }
    } catch (err) {
      console.error('Failed to clear notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await handleMarkRead(notification.id)
    }
    setIsOpen(false)
    if (notification.link) {
      window.location.href = notification.link
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:scale-105 active:scale-95"
        title="Notifications"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-background animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 z-55 w-80 sm:w-96 rounded-2xl border border-border bg-card/95 p-2 shadow-2xl backdrop-blur-xl animate-fade-in pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 pb-3">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                >
                  <Check className="h-3 w-3" />
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-destructive hover:underline cursor-pointer"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-[360px] overflow-y-auto py-1 divide-y divide-border/40">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40 text-muted-foreground mb-3">
                  <MailOpen className="h-6 w-6" />
                </div>
                <p className="text-xs font-semibold text-foreground">All caught up!</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  No notifications yet. When users comment on your projects, they will show up here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`group relative flex gap-3 cursor-pointer items-start p-3 rounded-xl transition-all hover:bg-secondary/60 ${
                    !notification.read ? 'bg-primary/5 hover:bg-primary/10' : ''
                  }`}
                >
                  {/* Unread indicator dot */}
                  {!notification.read && (
                    <span className="absolute left-2.5 top-4.5 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                  
                  <div className={`flex-1 ${!notification.read ? 'pl-2.5' : ''}`}>
                    <p className={`text-xs text-foreground leading-snug ${!notification.read ? 'font-semibold' : 'font-medium'}`}>
                      {notification.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {notification.message}
                    </p>
                    <span className="text-[9px] text-muted-foreground mt-1.5 block">
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </div>

                  {/* Inline Delete Button */}
                  <button
                    onClick={(e) => handleDelete(notification.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive transition-all shrink-0 cursor-pointer"
                    title="Delete Notification"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
