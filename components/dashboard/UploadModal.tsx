'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, ImageIcon, Plus, Loader2, Link as LinkIcon, FileText, Globe } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { upload } from '@vercel/blob/client'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadComplete: () => void
}

interface UploadItem {
  id: string
  type: 'image' | 'pdf' | 'link'
  name: string
  url?: string
  dataUrl?: string
  file?: File
}

export function UploadModal({ isOpen, onClose, onUploadComplete }: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload')
  const [queue, setQueue] = useState<UploadItem[]>([])
  const [title, setTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFilesSelection = useCallback(async (selectedFiles: FileList) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf']
    const addedItems: UploadItem[] = []

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      if (!validTypes.includes(file.type)) {
        toast('error', `"${file.name}" has an invalid type. Use JPEG, PNG, GIF, WebP, SVG, or PDF.`)
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        toast('error', `"${file.name}" is too large. Maximum size is 10MB.`)
        continue
      }

      if (file.type === 'application/pdf') {
        addedItems.push({
          id: Math.random().toString(36).substring(2, 9),
          type: 'pdf',
          name: file.name,
          file,
        })
      } else {
        const p = new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            resolve(e.target?.result as string)
          }
          reader.readAsDataURL(file)
        })
        const dataUrl = await p
        addedItems.push({
          id: Math.random().toString(36).substring(2, 9),
          type: 'image',
          name: file.name,
          dataUrl,
          file,
        })
      }
    }

    if (addedItems.length > 0) {
      setQueue((prev) => [...prev, ...addedItems])
    }
  }, [toast])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles && droppedFiles.length > 0) {
      handleFilesSelection(droppedFiles)
    }
  }, [handleFilesSelection])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      handleFilesSelection(selectedFiles)
    }
  }, [handleFilesSelection])

  const handleAddLink = () => {
    if (!linkUrl.trim()) {
      toast('error', 'Please enter a URL.')
      return
    }

    let url = linkUrl.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    try {
      new URL(url)
    } catch {
      toast('error', 'Please enter a valid URL.')
      return
    }

    const newItem: UploadItem = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'link',
      name: linkTitle.trim() || url,
      url,
    }

    setQueue((prev) => [...prev, newItem])
    setLinkUrl('')
    setLinkTitle('')
    toast('success', 'Link added to queue!')
  }

  const handleUpload = async () => {
    if (queue.length === 0) return

    setIsUploading(true)
    try {
      const filesToSend = queue.filter((item) => item.type !== 'link' && item.file).map((item) => item.file!)
      const linksToSend = queue.filter((item) => item.type === 'link').map((item) => ({
        url: item.url,
        title: item.name,
      }))

      // Upload files directly from client to Vercel Blob
      const uploadedFiles: Array<{ url: string; name: string }> = []
      
      for (const file of filesToSend) {
        const ext = file.name.substring(file.name.lastIndexOf('.'))
        const uniqueName = `uploads/${Date.now()}-${Math.random().toString(36).substring(2, 10)}${ext}`
        
        const blob = await upload(uniqueName, file, {
          access: 'public',
          handleUploadUrl: '/api/images/upload/token',
        })
        
        uploadedFiles.push({
          url: blob.url,
          name: file.name,
        })
      }

      const formData = new FormData()
      
      if (uploadedFiles.length > 0) {
        formData.append('uploadedFiles', JSON.stringify(uploadedFiles))
      }

      if (linksToSend.length > 0) {
        formData.append('links', JSON.stringify(linksToSend))
      }

      formData.append('title', title.trim() || `Project - ${new Date().toLocaleDateString()}`)

      const res = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      }

      toast('success', 'Project created successfully!')
      onUploadComplete()
      handleClose()
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setQueue([])
    setTitle('')
    setLinkUrl('')
    setLinkTitle('')
    setActiveTab('upload')
    setIsDragging(false)
    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Project" size="md">
      <div className="space-y-5">
        <Input
          label="Project Name"
          placeholder="Give your project a name..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          icon={<ImageIcon className="h-4 w-4" />}
          autoFocus
        />

        <div className="flex rounded-xl bg-muted/60 p-1 border border-border/40 select-none">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
              activeTab === 'upload'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Upload className="h-3.5 w-3.5 text-primary" />
            Upload Files
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
              activeTab === 'link'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LinkIcon className="h-3.5 w-3.5 text-primary" />
            Add Preview Link
          </button>
        </div>

        {activeTab === 'upload' ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => queue.length === 0 && fileInputRef.current?.click()}
            className={`
              relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed
              transition-all duration-200 overflow-hidden p-4
              ${queue.length > 0 ? 'border-primary/20 bg-muted/10' : 'cursor-pointer border-border hover:border-primary/50 hover:bg-muted/50'}
              ${isDragging ? 'border-primary bg-primary/10 scale-[1.01]' : ''}
              min-h-48
            `}
          >
            {queue.length > 0 ? (
              <div className="w-full space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Selected Items ({queue.length})
                  </span>
                  <button
                    onClick={() => {
                      setQueue([])
                    }}
                    className="text-xs font-medium text-destructive hover:underline"
                  >
                    Clear all
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 max-h-52 overflow-y-auto scrollbar-thin p-0.5">
                  {queue.map((item) => (
                    <div
                      key={item.id}
                      className="group relative aspect-video rounded-lg overflow-hidden border border-border bg-card shadow-sm flex items-center justify-center p-0.5"
                    >
                      {item.type === 'image' && item.dataUrl ? (
                        <img
                          src={item.dataUrl}
                          alt={item.name}
                          className="h-full w-full object-cover rounded-md"
                        />
                      ) : item.type === 'pdf' ? (
                        <div className="flex flex-col items-center justify-center h-full w-full bg-rose-500/10 rounded-md border border-rose-500/20 text-rose-500 p-1.5">
                          <FileText className="h-5 w-5 text-rose-500" />
                          <span className="text-[9px] font-bold text-center mt-1 truncate w-full" title={item.name}>
                            {item.name}
                          </span>
                          <span className="text-[8px] bg-rose-500/20 text-rose-600 px-1 py-0.2 rounded font-black mt-1 uppercase">PDF</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full w-full bg-primary/10 rounded-md border border-primary/20 text-primary p-1.5">
                          <Globe className="h-5 w-5 text-primary" />
                          <span className="text-[9px] font-bold text-center mt-1 truncate w-full" title={item.name}>
                            {item.name}
                          </span>
                          <span className="text-[8px] bg-primary/20 text-primary px-1 py-0.2 rounded font-black mt-1 uppercase">Link</span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setQueue((prev) => prev.filter((i) => i.id !== item.id))
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded bg-destructive text-white hover:bg-destructive/90 transition-colors shadow"
                          title="Remove item"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center aspect-video rounded-lg border border-dashed border-border/70 hover:border-primary/50 hover:bg-muted/70 cursor-pointer text-muted-foreground hover:text-foreground transition-all"
                    title="Add more files"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-tiny-10 font-medium mt-1">Add More</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    Drag & drop your files here
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    or click to browse · Supports Images & PDF · Max 10MB per file
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 rounded-xl border border-border/80 bg-muted/20 p-4 animate-fade-in">
            <div className="grid grid-cols-1 gap-3">
              <Input
                label="Preview Link URL"
                placeholder="e.g. figma.com/file/..., drive.google.com/..., or website link"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                icon={<LinkIcon className="h-4 w-4" />}
              />
              <Input
                label="Link Title / Display Name (Optional)"
                placeholder="Give this preview link a name..."
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                icon={<FileText className="h-4 w-4" />}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              {queue.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  View Queue ({queue.length})
                </button>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddLink}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5 text-primary" />
                Add to Project Queue
              </Button>
            </div>

            {queue.filter((item) => item.type === 'link').length > 0 && (
              <div className="border-t border-border/40 pt-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Queued Links</p>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {queue.filter((item) => item.type === 'link').map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-card text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate font-semibold text-foreground" title={item.name}>{item.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQueue((prev) => prev.filter((i) => i.id !== item.id))}
                        className="text-muted-foreground hover:text-destructive hover:bg-muted p-1 rounded"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,application/pdf"
          onChange={handleFileInput}
          className="hidden"
          multiple
        />

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button variant="ghost" size="md" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleUpload}
            disabled={queue.length === 0}
            loading={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Create Project'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
