'use client'

import { useState, useCallback } from 'react'
import {
  MessageSquare,
  CheckCircle,
  Filter,
  Trash2,
  Edit2,
  Smile,
  X,
  FileText,
  Download,
} from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

interface Comment {
  id: string
  content: string
  xPercent: number
  yPercent: number
  guestName: string | null
  userId: string | null
  user: { id: string; name: string } | null
  resolved: boolean
  fileUrl: string | null
  fileName: string | null
  fileType: string | null
  createdAt: string
  annotationType?: string
  annotationData?: string | null
}

type FilterTab = 'all' | 'open' | 'resolved'

interface CommentSidebarProps {
  comments: Comment[]
  selectedCommentId: string | null
  onSelectComment: (id: string | null) => void
  onResolve?: (id: string) => void
  onEdit?: (id: string, content: string, file?: File | null, removeFile?: boolean) => void
  onDelete?: (id: string) => void
  isOwner: boolean
  currentUserId?: string | null
  currentGuestName?: string | null
}

const EMOJIS = ['👍', '❤️', '🎉', '😂', '🚀', '👀', '🔥', '👏', '💡', '❓']

export function CommentSidebar({
  comments,
  selectedCommentId,
  onSelectComment,
  onResolve,
  onEdit,
  onDelete,
  isOwner,
  currentUserId = null,
  currentGuestName = null,
}: CommentSidebarProps) {
  const [filter, setFilter] = useState<FilterTab>('all')
  const [isEditingId, setIsEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const filteredComments = comments.filter((c) => {
    if (filter === 'open') return !c.resolved
    if (filter === 'resolved') return c.resolved
    return true
  })

  const openCount = comments.filter((c) => !c.resolved).length
  const resolvedCount = comments.filter((c) => c.resolved).length

  const handleEditSave = async (id: string) => {
    if (!editContent.trim() || !onEdit) return
    await onEdit(id, editContent.trim())
    setIsEditingId(null)
  }

  const insertEmoji = (emoji: string) => {
    setEditContent((prev) => prev + emoji)
    setShowEmojiPicker(false)
  }

  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)
    return parts.map((part, i) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline break-all hover:text-primary/80"
            onClick={(e) => e.stopPropagation()} // Don't trigger select card
          >
            {part}
          </a>
        )
      }
      return part
    })
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card/80 backdrop-blur-xl">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-card-foreground">Comments</h2>
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-tiny-10 font-semibold text-primary">
            {comments.length}
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="mt-3 flex gap-1 rounded-lg bg-muted/50 p-0.5">
          {([
            { key: 'all' as FilterTab, label: 'All', count: comments.length },
            { key: 'open' as FilterTab, label: 'Open', count: openCount },
            { key: 'resolved' as FilterTab, label: 'Resolved', count: resolvedCount },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'flex-1 rounded-md px-2 py-1.5 text-tiny-11 font-medium transition-all',
                filter === tab.key
                  ? 'bg-card text-card-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 opacity-60">({tab.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Comment List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {filteredComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Filter className="h-8 w-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              {filter === 'all'
                ? 'No comments yet'
                : `No ${filter} comments`}
            </p>
          </div>
        ) : (
          filteredComments.map((comment, filteredIndex) => {
            const pinNumber = comments.indexOf(comment) + 1
            const authorName =
              comment.user?.name || comment.guestName || 'Anonymous'
            const isSelected = selectedCommentId === comment.id
            const isEditing = isEditingId === comment.id

            const isCommentAuthor =
              (comment.userId && comment.userId === currentUserId) ||
              (!comment.userId && comment.guestName === currentGuestName)
            const canModify = isOwner || isCommentAuthor

            return (
              <div
                key={comment.id}
                onClick={() => {
                  if (!isEditing) onSelectComment(isSelected ? null : comment.id)
                }}
                className={cn(
                  'w-full text-left px-4 py-3.5 transition-all duration-200 cursor-pointer',
                  isSelected && !isEditing && 'bg-primary/5 border-l-2 border-l-primary',
                  !isSelected && 'border-l-2 border-l-transparent hover:bg-muted/30'
                )}
                style={{
                  animationDelay: `${filteredIndex * 50}ms`,
                }}
              >
                {isEditing ? (
                  /* Inline Edit Form */
                  <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-tiny-9 font-bold text-primary">
                        {pinNumber}
                      </span>
                      <span>Editing comment</span>
                    </div>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleEditSave(comment.id)
                        }
                        if (e.key === 'Escape') {
                          setIsEditingId(null)
                        }
                      }}
                      rows={3}
                      className="w-full resize-none rounded-lg border border-border bg-secondary/50 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex items-center justify-between">
                      <div className="relative">
                        <button
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted transition-colors"
                          title="Add Emoji"
                        >
                          <Smile className="h-3.5 w-3.5" />
                        </button>
                        {showEmojiPicker && (
                          <div className="absolute left-0 bottom-full z-10 mb-2 flex gap-1 rounded-lg border border-border bg-card p-1 shadow-lg">
                            {EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => insertEmoji(emoji)}
                                className="hover:scale-125 transition-transform p-0.5 text-xs"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-tiny-10"
                          onClick={() => setIsEditingId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          className="h-7 text-tiny-10"
                          onClick={() => handleEditSave(comment.id)}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard List Row / Card Details */
                  <div className="space-y-2">
                    <div className="flex items-start gap-2.5">
                      {/* Pin Number */}
                      <div
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-tiny-9 font-bold',
                          comment.resolved
                            ? 'bg-success/15 text-success'
                            : 'bg-primary/15 text-primary'
                        )}
                      >
                        {pinNumber}
                      </div>

                      {/* Content details */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-xs text-card-foreground leading-relaxed whitespace-pre-wrap",
                          !isSelected && "line-clamp-2"
                        )}>
                          {isSelected ? renderTextWithLinks(comment.content) : comment.content}
                        </p>

                        {/* Rendering Attachments when selected */}
                        {isSelected && comment.fileUrl && (
                          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                            {comment.fileType?.startsWith('image/') ? (
                              <a
                                href={comment.fileUrl}
                                download={comment.fileName || 'attachment'}
                                className="block overflow-hidden rounded-lg border border-border hover:opacity-90 transition-opacity"
                              >
                                <img
                                  src={comment.fileUrl}
                                  alt="attachment"
                                  className="max-h-24 w-full object-cover"
                                />
                              </a>
                            ) : (
                              <a
                                href={comment.fileUrl}
                                download={comment.fileName || 'attachment'}
                                className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/35 p-1.5 text-tiny-10 hover:bg-secondary/60 transition-colors"
                              >
                                <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                                <span className="truncate flex-1 text-foreground font-medium" title={comment.fileName || 'Attachment'}>
                                  {comment.fileName || 'Attachment'}
                                </span>
                                <Download className="h-3 w-3 text-muted-foreground" />
                              </a>
                            )}
                          </div>
                        )}

                        <div className="mt-2 flex items-center gap-1.5 text-tiny-10 text-muted-foreground">
                          <span className="font-semibold text-muted-foreground/90">
                            {authorName}
                          </span>
                          {(() => {
                            try {
                              if (comment.annotationData) {
                                const data = JSON.parse(comment.annotationData)
                                if (data && typeof data.page === 'number') {
                                  return (
                                    <>
                                      <span>·</span>
                                      <span className="bg-rose-500/10 text-rose-600 px-1 py-0.2 rounded font-black uppercase text-[8px]">
                                        Page {data.page}
                                      </span>
                                    </>
                                  )
                                }
                              }
                            } catch {}
                            return null
                          })()}
                          <span>·</span>
                          <span suppressHydrationWarning>
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Resolved Badge */}
                      {comment.resolved && (
                        <CheckCircle className="h-4 w-4 shrink-0 text-success" />
                      )}
                    </div>

                    {/* Selected Item Edit/Delete Actions */}
                    {isSelected && canModify && (
                      <div
                        className="flex items-center justify-end gap-3 border-t border-border/40 pt-2 text-tiny-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {onEdit && (
                          <button
                            onClick={() => {
                              setIsEditingId(comment.id)
                              setEditContent(comment.content)
                            }}
                            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>Edit</span>
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => {
                              if (confirm('Delete this comment?')) onDelete(comment.id)
                            }}
                            className="flex items-center gap-1 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Resolve Action Panel at Bottom */}
      {isOwner && onResolve && selectedCommentId && (() => {
        const selected = comments.find((c) => c.id === selectedCommentId)
        if (!selected || isEditingId === selectedCommentId) return null
        return (
          <div className="border-t border-border px-4 py-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onResolve(selected.id)}
              className={cn(
                'w-full rounded-lg px-3 py-2 text-xs font-semibold transition-colors shadow-sm',
                selected.resolved
                  ? 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  : 'bg-success/15 text-success hover:bg-success/20'
              )}
            >
              {selected.resolved ? 'Reopen Comment' : 'Mark as Resolved'}
            </button>
          </div>
        )
      })()}
    </div>
  )
}
