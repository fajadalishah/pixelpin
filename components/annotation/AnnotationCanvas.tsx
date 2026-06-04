'use client'

import { useRef, useCallback, useState, useEffect, useLayoutEffect, useMemo } from 'react'
import {
  MapPin,
  Square,
  ArrowUpRight,
  Circle as CircleIcon,
  Pencil,
  Plus,
  Minus,
  HardDrive,
  ExternalLink,
  FileText,
  Globe,
} from 'lucide-react'
import { CommentPin } from '@/components/annotation/CommentPin'
import { CommentPopover } from '@/components/annotation/CommentPopover'

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

interface AnnotationCanvasProps {
  imageUrl: string
  boardTitle?: string
  comments: Comment[]
  onAddComment: (
    xPercent: number,
    yPercent: number,
    content: string,
    file: File | null,
    annotationType?: string,
    annotationData?: string | null,
    linkUrl?: string,
    linkTitle?: string
  ) => void
  isCommentMode: boolean
  selectedCommentId: string | null
  onSelectComment: (id: string | null) => void
  onResolve?: (id: string) => void
  onEdit?: (id: string, content: string, file: File | null, removeFile: boolean, linkUrl?: string, linkTitle?: string) => void
  onDelete?: (id: string) => void
  isOwner: boolean
  currentUserId?: string | null
  currentGuestName?: string | null
  redrawingCommentId?: string | null
  redrawingTool?: 'rectangle' | 'circle' | 'line' | 'arrow' | 'freehand' | 'pin' | null
  onRedrawComplete?: (commentId: string, type: string, data: string) => void
  onShapeSelect?: (
    commentId: string,
    shapeType: 'rectangle' | 'circle' | 'line' | 'arrow' | 'freehand' | 'pin'
  ) => void
  onColorSelect?: (commentId: string, colorHex: string) => void
  activeTool: ToolType
  setActiveTool: (tool: ToolType) => void
  activeColor: string
  setActiveColor: (color: string) => void
  ownerPlan?: string
}

type ToolType = 'pin' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'freehand'

const COLORS = [
  { id: 'red', hex: '#ef4444' },
  { id: 'orange', hex: '#f97316' },
  { id: 'yellow', hex: '#eab308' },
  { id: 'green', hex: '#22c55e' },
  { id: 'blue', hex: '#3b82f6' },
  { id: 'purple', hex: '#a855f7' },
]

function getGoogleDriveFileId(url: string): string | null {
  try {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
    if (match && match[1]) {
      return match[1]
    }
    const queryMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
    if (queryMatch && queryMatch[1]) {
      return queryMatch[1]
    }
  } catch {}
  return null
}

export function AnnotationCanvas({
  imageUrl,
  boardTitle,
  comments,
  onAddComment,
  isCommentMode,
  selectedCommentId,
  onSelectComment,
  onResolve,
  onEdit,
  onDelete,
  isOwner,
  currentUserId = null,
  currentGuestName = null,
  redrawingCommentId = null,
  redrawingTool = null,
  onRedrawComplete,
  onShapeSelect,
  onColorSelect,
  activeTool,
  setActiveTool,
  activeColor,
  setActiveColor,
  ownerPlan = 'free',
}: AnnotationCanvasProps) {
  const outerContainerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  const [driveImageFailed, setDriveImageFailed] = useState(false)

  useEffect(() => {
    setDriveImageFailed(false)
  }, [imageUrl])

  const isPDF = imageUrl.endsWith('.pdf')
  const [pdfPage, setPdfPage] = useState(1)

  useEffect(() => {
    setPdfPage(1)
  }, [imageUrl])

  const getCommentPage = useCallback((comment: Comment) => {
    try {
      if (comment.annotationData) {
        const data = JSON.parse(comment.annotationData)
        if (data && typeof data.page === 'number') {
          return data.page
        }
      }
    } catch {}
    return 1
  }, [])

  const activeComments = useMemo(() => {
    if (!isPDF) return comments
    return comments.filter((c) => getCommentPage(c) === pdfPage)
  }, [comments, isPDF, pdfPage, getCommentPage])

  // Zoom & Pan states
  const [scale, setScale] = useState(0.55)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null)
  const [pencilPoints, setPencilPoints] = useState<Array<{ x: number; y: number }>>([])

  // Popover offsets map for all comments
  const [popoverOffsets, setPopoverOffsets] = useState<Record<string, { x: number; y: number }>>({})
  // Hidden comments popover card map
  const [hiddenCommentIds, setHiddenCommentIds] = useState<Record<string, boolean>>({})

  // Active tool dynamically overrides toolbar settings if we are in redrawing mode
  const effectiveTool = redrawingTool || activeTool

  // Reset offset and zoom on image switch

  // Mouse wheel zoom logic
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const isZoomingIn = e.deltaY < 0
    if (scale === 1 && !isZoomingIn) {
      // Allow page scrolling down if not zoomed
      return
    }

    e.preventDefault()
    const zoomFactor = 0.15
    const delta = isZoomingIn ? 1 : -1
    const nextScale = Math.max(1, Math.min(5, scale + delta * zoomFactor))

    if (nextScale === 1) {
      setPan({ x: 0, y: 0 })
    }

    setScale(nextScale)
  }

  // Drag Panning in Browse Mode (or middle/right click in Comment Mode)
  const handlePanMouseDown = (e: React.MouseEvent) => {
    const isMiddleClick = e.button === 1
    const isRightClick = e.button === 2
    const isLeftClickInBrowse = e.button === 0 && !isCommentMode

    if (isLeftClickInBrowse || isMiddleClick || isRightClick) {
      setIsPanning(true)
      setPanStart({
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      })
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const handlePanMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return
    e.preventDefault()
    setPan({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    })
  }

  const handlePanMouseUp = () => {
    setIsPanning(false)
  }

  // Reset offset and zoom on image switch
  useEffect(() => {
    // Handled individually, no need to reset everything on select
  }, [selectedCommentId])

  useEffect(() => {
    setScale(0.55)
    setPan({ x: 0, y: 0 })
    setNewPinPosition(null)
    setPopoverOffsets({})
    setHiddenCommentIds({})
  }, [imageUrl])

  // Automatically show comment popover if it gets selected
  useEffect(() => {
    if (selectedCommentId) {
      setHiddenCommentIds((prev) => ({ ...prev, [selectedCommentId]: false }))
    }
  }, [selectedCommentId])

  // Non-passive wheel event listener to prevent browser scroll conflicts
  useEffect(() => {
    const container = outerContainerRef.current
    if (!container) return

    const handleWheelRaw = (e: WheelEvent) => {
      e.preventDefault()

      const isZoomingIn = e.deltaY < 0
      const zoomFactor = 0.15
      const delta = isZoomingIn ? 1 : -1

      setScale((prevScale) => {
        const nextScale = Math.max(0.25, Math.min(10, prevScale + delta * zoomFactor))
        if (nextScale <= 0.5) {
          setPan({ x: 0, y: 0 })
        }
        return nextScale
      })
    }

    container.addEventListener('wheel', handleWheelRaw, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheelRaw)
    }
  }, [])

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Don't trigger if we were panning or if the tool is not a dot pin
      if (isPanning || !isCommentMode || !innerRef.current || effectiveTool !== 'pin') return

      const rect = innerRef.current.getBoundingClientRect()
      const xPercent = ((e.clientX - rect.left) / rect.width) * 100
      const yPercent = ((e.clientY - rect.top) / rect.height) * 100

      // Clamp to valid range
      const clampedX = Math.max(0, Math.min(100, xPercent))
      const clampedY = Math.max(0, Math.min(100, yPercent))

      const defaultData = JSON.stringify({
        color: activeColor,
        ...(isPDF ? { page: pdfPage } : {})
      })

      if (redrawingCommentId && onRedrawComplete) {
        onRedrawComplete(redrawingCommentId, 'pin', defaultData)
      } else {
        setNewPinPosition({
          xPercent: clampedX,
          yPercent: clampedY,
          annotationType: 'pin',
          annotationData: defaultData,
        })
        onSelectComment(null)
      }
    },
    [isCommentMode, effectiveTool, redrawingCommentId, onRedrawComplete, activeColor, onSelectComment, isPanning, isPDF, pdfPage]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only draw with left click in Comment Mode when tool is not pin
      if (e.button !== 0 || !isCommentMode || !innerRef.current || effectiveTool === 'pin') return

      // Prevent text selection during drag
      e.preventDefault()

      const rect = innerRef.current.getBoundingClientRect()
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))

      setIsDrawing(true)
      setDrawStart({ x, y })
      setDrawCurrent({ x, y })

      if (effectiveTool === 'freehand') {
        setPencilPoints([{ x, y }])
      }

      setNewPinPosition(null)
      if (!redrawingCommentId) {
        onSelectComment(null)
      }
    },
    [isCommentMode, effectiveTool, redrawingCommentId, onSelectComment]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDrawing || !innerRef.current || !drawStart) return

      const rect = innerRef.current.getBoundingClientRect()
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))

      setDrawCurrent({ x, y })

      if (effectiveTool === 'freehand') {
        setPencilPoints((prev) => [...prev, { x, y }])
      }
    },
    [isDrawing, drawStart, effectiveTool]
  )

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !drawStart || !drawCurrent) return
    setIsDrawing(false)

    // Ignore tiny shapes
    if (effectiveTool === 'freehand' && pencilPoints.length < 2) {
      setDrawStart(null)
      setDrawCurrent(null)
      setPencilPoints([])
      return
    }

    const dx = Math.abs(drawCurrent.x - drawStart.x)
    const dy = Math.abs(drawCurrent.y - drawStart.y)

    if (effectiveTool !== 'freehand' && dx < 1 && dy < 1) {
      setDrawStart(null)
      setDrawCurrent(null)
      return
    }

    const baseData = effectiveTool === 'freehand'
      ? { points: pencilPoints, color: activeColor }
      : { x2Percent: drawCurrent.x, y2Percent: drawCurrent.y, color: activeColor }

    const annotationDataJson = JSON.stringify({
      ...baseData,
      ...(isPDF ? { page: pdfPage } : {})
    })

    if (redrawingCommentId && onRedrawComplete) {
      onRedrawComplete(redrawingCommentId, effectiveTool, annotationDataJson)
    } else {
      setNewPinPosition({
        xPercent: drawStart.x,
        yPercent: drawStart.y,
        annotationType: effectiveTool,
        annotationData: annotationDataJson,
      })
    }

    setDrawStart(null)
    setDrawCurrent(null)
    setPencilPoints([])
  }, [
    isDrawing,
    drawStart,
    drawCurrent,
    effectiveTool,
    pencilPoints,
    activeColor,
    redrawingCommentId,
    onRedrawComplete,
    isPDF,
    pdfPage,
  ])

  const [newPinPosition, setNewPinPosition] = useState<{
    xPercent: number
    yPercent: number
    annotationType?: string
    annotationData?: string | null
  } | null>(null)

  const handleNewCommentSubmit = useCallback(
    (content: string, file: File | null, linkUrl?: string, linkTitle?: string) => {
      if (!newPinPosition) return
      onAddComment(
        newPinPosition.xPercent,
        newPinPosition.yPercent,
        content,
        file,
        newPinPosition.annotationType || 'pin',
        newPinPosition.annotationData || null,
        linkUrl,
        linkTitle
      )
      setNewPinPosition(null)
      setDrawStart(null)
      setDrawCurrent(null)
    },
    [newPinPosition, onAddComment]
  )

  const handleCloseNewComment = useCallback(() => {
    setNewPinPosition(null)
    setDrawStart(null)
    setDrawCurrent(null)
  }, [])

  const handlePinClick = useCallback(
    (commentId: string) => {
      if (isPanning) return
      setNewPinPosition(null)
      
      setHiddenCommentIds((prev) => {
        const isCurrentlyHidden = prev[commentId] ?? false
        const isSelected = selectedCommentId === commentId
        
        // If it is selected and open, click hides it.
        // Otherwise, click unhides it.
        const nextHidden = isSelected ? !isCurrentlyHidden : false
        return {
          ...prev,
          [commentId]: nextHidden,
        }
      })

      // If it is selected and open, toggle unselects it. Otherwise, selects it.
      onSelectComment(
        selectedCommentId === commentId && !hiddenCommentIds[commentId] ? null : commentId
      )
    },
    [selectedCommentId, hiddenCommentIds, onSelectComment, isPanning]
  )

  // Screen coordinates of comments for pins and popovers
  const [screenPositions, setScreenPositions] = useState<Record<string, { x: number; y: number }>>({})

  // Update pin screen positions after rendering transform adjustments
  useLayoutEffect(() => {
    const updatePositions = () => {
      if (!innerRef.current || !outerContainerRef.current) return
      const rect = innerRef.current.getBoundingClientRect()
      const outerRect = outerContainerRef.current.getBoundingClientRect()

      const newPositions: Record<string, { x: number; y: number }> = {}
      activeComments.forEach((comment) => {
        const pinPixelX = rect.left + (comment.xPercent / 100) * rect.width - outerRect.left
        const pinPixelY = rect.top + (comment.yPercent / 100) * rect.height - outerRect.top
        newPositions[comment.id] = {
          x: (pinPixelX / outerRect.width) * 100,
          y: (pinPixelY / outerRect.height) * 100,
        }
      })

      // Account for new temporary comments pins draft
      if (newPinPosition) {
        const pinPixelX = rect.left + (newPinPosition.xPercent / 100) * rect.width - outerRect.left
        const pinPixelY = rect.top + (newPinPosition.yPercent / 100) * rect.height - outerRect.top
        newPositions['new-pin'] = {
          x: (pinPixelX / outerRect.width) * 100,
          y: (pinPixelY / outerRect.height) * 100,
        }
      }

      setScreenPositions(newPositions)
    }

    updatePositions()
    
    // Listen to resize to keep calculations updated
    window.addEventListener('resize', updatePositions)
    return () => {
      window.removeEventListener('resize', updatePositions)
    }
  }, [scale, pan, activeComments, newPinPosition])

  const selectedComment = comments.find((c) => c.id === selectedCommentId) || null

  return (
    <div
      ref={outerContainerRef}
      onMouseDown={handlePanMouseDown}
      onMouseMove={handlePanMouseMove}
      onMouseUp={handlePanMouseUp}
      onMouseLeave={handlePanMouseUp}
      onContextMenu={(e) => e.preventDefault()}
      className="relative w-full h-full overflow-hidden bg-muted/20 flex items-center justify-center select-none"
    >
      {/* Zoomable & Panning Inner Workspace */}
      <div
        ref={innerRef}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="relative select-none"
        style={{
          transform: `scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)`,
          transformOrigin: 'center center',
          cursor: isPanning
            ? 'grabbing'
            : isCommentMode
            ? 'crosshair'
            : scale > 1
            ? 'grab'
            : 'default',
        }}
      >
        {/* Design Image / PDF / Link Card */}
        {(() => {
          const isLink = imageUrl.startsWith('http://') || imageUrl.startsWith('https://')
          const isPDF = imageUrl.endsWith('.pdf')

          if (isPDF) {
            return (
              <div className="relative w-[1100px] h-[780px] bg-card rounded-2xl shadow-xl border border-border/80 overflow-hidden select-none animate-fade-in">
                <iframe
                  key={`${imageUrl}-${pdfPage}`}
                  src={`${imageUrl}#page=${pdfPage}&view=Fit&toolbar=0&navpanes=0&scrollbar=0`}
                  className="w-full h-full border-none select-none pointer-events-none overflow-hidden"
                />
                <div className={`absolute inset-0 bg-transparent z-10 ${isCommentMode ? 'cursor-crosshair' : 'pointer-events-none'}`} />
              </div>
            )
          }

          if (isLink) {
            const getLinkBranding = (url: string) => {
              const u = url.toLowerCase()
              if (u.includes('figma.com')) {
                return {
                  name: 'Figma Frame Link',
                  color: 'from-[#F24E1E]/20 to-[#A259FF]/20 border-[#F24E1E]/40',
                  iconColor: 'text-[#F24E1E]',
                  icon: (
                    <svg width="40" height="60" viewBox="0 0 40 60" fill="none" className="animate-bounce select-none pointer-events-none">
                      <path d="M20 10C20 4.47715 15.5228 0 10 0C4.47715 0 0 4.47715 0 10C0 15.5228 4.47715 20 10 20C15.5228 20 20 15.5228 20 10Z" fill="#F24E1E"/>
                      <path d="M40 10C40 4.47715 35.5228 0 30 0C24.4772 0 20 4.47715 20 10C20 15.5228 24.4772 20 30 20C35.5228 20 40 15.5228 40 10Z" fill="#FF7262"/>
                      <path d="M20 30C20 24.4772 15.5228 20 10 20C4.47715 20 0 24.4772 0 30C0 35.5228 4.47715 40 10 40C15.5228 40 20 35.5228 20 30Z" fill="#A259FF"/>
                      <path d="M40 30C40 24.4772 35.5228 20 30 20C24.4772 20 20 24.4772 20 30C20 35.5228 24.4772 40 30 40C35.5228 40 40 35.5228 40 30Z" fill="#1ABCFE"/>
                      <path d="M20 50C20 44.4772 15.5228 40 10 40C4.47715 40 0 44.4772 0 50C0 55.5228 4.47715 60 10 60C15.5228 60 20 55.5228 20 50Z" fill="#0ACF83"/>
                    </svg>
                  ),
                }
              }
              if (u.includes('drive.google.com')) {
                const driveFileId = getGoogleDriveFileId(url)
                if (driveFileId && !driveImageFailed) {
                  return {
                    name: 'Google Drive Image',
                    color: 'from-[#00A859]/10 to-[#FFCC00]/10 border-[#00A859]/30',
                    iconColor: 'text-[#00A859]',
                    icon: (
                      <img
                        src={`https://drive.google.com/uc?export=view&id=${driveFileId}`}
                        alt="Google Drive image preview"
                        onError={() => setDriveImageFailed(true)}
                        className="h-36 w-48 object-contain rounded-xl border border-border bg-white shadow-md transition-transform group-hover:scale-105 select-none pointer-events-none"
                        draggable={false}
                      />
                    ),
                  }
                }
                return {
                  name: 'Google Drive File',
                  color: 'from-[#00A859]/20 to-[#FFCC00]/20 border-[#00A859]/40',
                  iconColor: 'text-[#00A859]',
                  icon: <HardDrive className="h-16 w-16 text-[#00A859] animate-bounce" />,
                }
              }
              return {
                name: 'External Preview URL',
                color: 'from-blue-500/10 to-indigo-500/10 border-primary/30',
                iconColor: 'text-primary',
                icon: <Globe className="h-16 w-16 text-primary animate-bounce" />,
              }
            }

            const branding = getLinkBranding(imageUrl)

            return (
              <div className={`relative flex flex-col justify-between items-center text-center w-[800px] h-[480px] rounded-3xl border-2 bg-gradient-to-tr ${branding.color} shadow-2xl p-8 backdrop-blur-xl transition-all duration-300 animate-fade-in group select-none`}>
                <div className="rounded-full px-4 py-1.5 text-xs font-bold bg-muted/80 border border-border shadow-sm tracking-wider uppercase text-foreground select-none">
                  {branding.name}
                </div>

                <div className="flex flex-col items-center justify-center space-y-4">
                  {branding.icon}
                  <div className="space-y-2">
                    <h3 className="text-3xl font-extrabold tracking-tight text-foreground select-none">
                      {boardTitle || 'Link Preview Asset'}
                    </h3>
                    <code className="text-xs text-muted-foreground bg-muted/80 px-3 py-1.5 rounded-lg border border-border/80 max-w-lg truncate block select-all">
                      {imageUrl}
                    </code>
                  </div>
                </div>

                <div className="w-full space-y-4">
                  <a
                    href={imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/25 pointer-events-auto"
                  >
                    Open Resource
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <p className="text-xs text-muted-foreground select-none leading-none">
                    Drop a pin comments anywhere on this board preview to leave feedback.
                  </p>
                </div>

                {/* Overlay div to intercept canvas mouse comments */}
                <div className="absolute inset-0 bg-transparent z-10 cursor-crosshair" />
              </div>
            )
          }

          return (
            <img
              src={imageUrl}
              alt="Annotated image"
              className="block max-w-full max-h-full object-contain select-none pointer-events-none"
              draggable={false}
            />
          )
        })()}

        {/* SVG Drawing/Shapes Overlay */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <marker
              id="arrowhead-canvas"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="currentColor" />
            </marker>
          </defs>

          {/* Render Saved Comment Shapes with Thicker highly visible stroke lines */}
          {comments.map((comment) => {
            if (comment.resolved) return null

            const isSelected = selectedCommentId === comment.id
            let shapeColor = '#ef4444'
            let shapeData: any = null

            try {
              if (comment.annotationData) {
                shapeData = JSON.parse(comment.annotationData)
                if (shapeData?.color) shapeColor = shapeData.color
              }
            } catch {}

            const strokeColor = isSelected ? 'var(--color-primary, #6366f1)' : shapeColor

            // 1. Rectangle Shape
            if (comment.annotationType === 'rectangle' && shapeData) {
              const x = Math.min(comment.xPercent, shapeData.x2Percent)
              const y = Math.min(comment.yPercent, shapeData.y2Percent)
              const w = Math.abs(comment.xPercent - shapeData.x2Percent)
              const h = Math.abs(comment.yPercent - shapeData.y2Percent)
              return (
                <rect
                  key={comment.id}
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill={isSelected ? 'rgba(99, 102, 241, 0.05)' : 'transparent'}
                  stroke={strokeColor}
                  strokeWidth={isSelected ? 10.0 : 6.0}
                  vectorEffect="non-scaling-stroke"
                  className={`transition-all ${
                    isCommentMode ? 'pointer-events-none' : 'pointer-events-auto cursor-pointer'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePinClick(comment.id)
                  }}
                />
              )
            }

            // 2. Line Shape
            if (comment.annotationType === 'line' && shapeData) {
              return (
                <line
                  key={comment.id}
                  x1={comment.xPercent}
                  y1={comment.yPercent}
                  x2={shapeData.x2Percent}
                  y2={shapeData.y2Percent}
                  stroke={strokeColor}
                  strokeWidth={isSelected ? 10.0 : 6.0}
                  vectorEffect="non-scaling-stroke"
                  className={`transition-all ${
                    isCommentMode ? 'pointer-events-none' : 'pointer-events-auto cursor-pointer'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePinClick(comment.id)
                  }}
                />
              )
            }

            // 3. Arrow Shape
            if (comment.annotationType === 'arrow' && shapeData) {
              return (
                <line
                  key={comment.id}
                  x1={comment.xPercent}
                  y1={comment.yPercent}
                  x2={shapeData.x2Percent}
                  y2={shapeData.y2Percent}
                  stroke={strokeColor}
                  strokeWidth={isSelected ? 10.0 : 6.0}
                  markerEnd="url(#arrowhead-canvas)"
                  color={strokeColor}
                  vectorEffect="non-scaling-stroke"
                  className={`transition-all ${
                    isCommentMode ? 'pointer-events-none' : 'pointer-events-auto cursor-pointer'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePinClick(comment.id)
                  }}
                />
              )
            }

            // 4. Circle / Ellipse Shape
            if (comment.annotationType === 'circle' && shapeData) {
              const rx = Math.abs(shapeData.x2Percent - comment.xPercent)
              const ry = Math.abs(shapeData.y2Percent - comment.yPercent)
              return (
                <ellipse
                  key={comment.id}
                  cx={comment.xPercent}
                  cy={comment.yPercent}
                  rx={rx}
                  ry={ry}
                  fill={isSelected ? 'rgba(99, 102, 241, 0.05)' : 'transparent'}
                  stroke={strokeColor}
                  strokeWidth={isSelected ? 10.0 : 6.0}
                  vectorEffect="non-scaling-stroke"
                  className={`transition-all ${
                    isCommentMode ? 'pointer-events-none' : 'pointer-events-auto cursor-pointer'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePinClick(comment.id)
                  }}
                />
              )
            }

            // 5. Freehand Pencil Shape
            if (comment.annotationType === 'freehand' && shapeData && Array.isArray(shapeData.points)) {
              const polyPoints = shapeData.points.map((p: any) => `${p.x},${p.y}`).join(' ')
              return (
                <polyline
                  key={comment.id}
                  points={polyPoints}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isSelected ? 10.0 : 6.0}
                  vectorEffect="non-scaling-stroke"
                  className={`transition-all ${
                    isCommentMode ? 'pointer-events-none' : 'pointer-events-auto cursor-pointer'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePinClick(comment.id)
                  }}
                />
              )
            }

            return null
          })}

          {/* Temporary Shape Drag Previews */}
          {isDrawing && drawStart && drawCurrent && (
            <>
              {effectiveTool === 'rectangle' && (
                <rect
                  x={Math.min(drawStart.x, drawCurrent.x)}
                  y={Math.min(drawStart.y, drawCurrent.y)}
                  width={Math.abs(drawStart.x - drawCurrent.x)}
                  height={Math.abs(drawStart.y - drawCurrent.y)}
                  fill="rgba(99, 102, 241, 0.1)"
                  stroke={activeColor}
                  strokeWidth={6.0}
                  strokeDasharray="2 2"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {effectiveTool === 'line' && (
                <line
                  x1={drawStart.x}
                  y1={drawStart.y}
                  x2={drawCurrent.x}
                  y2={drawCurrent.y}
                  stroke={activeColor}
                  strokeWidth={6.0}
                  strokeDasharray="2 2"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {effectiveTool === 'arrow' && (
                <line
                  x1={drawStart.x}
                  y1={drawStart.y}
                  x2={drawCurrent.x}
                  y2={drawCurrent.y}
                  stroke={activeColor}
                  strokeWidth={6.0}
                  markerEnd="url(#arrowhead-canvas)"
                  color={activeColor}
                  strokeDasharray="2 2"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {effectiveTool === 'circle' && (
                <ellipse
                  cx={drawStart.x}
                  cy={drawStart.y}
                  rx={Math.abs(drawCurrent.x - drawStart.x)}
                  ry={Math.abs(drawCurrent.y - drawStart.y)}
                  fill="rgba(99, 102, 241, 0.1)"
                  stroke={activeColor}
                  strokeWidth={6.0}
                  strokeDasharray="2 2"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {effectiveTool === 'freehand' && pencilPoints.length >= 2 && (
                <polyline
                  points={pencilPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={activeColor}
                  strokeWidth={6.0}
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </>
          )}
        </svg>



        </div>

      {/* Popover Connector Line (rendered in outer SVG so it is independent of zoom scale) */}
      {/* Connector lines for all active non-resolved comments */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
        {activeComments
          .filter((c) => !c.resolved && !hiddenCommentIds[c.id])
          .map((comment) => {
            const calculated = screenPositions[comment.id]
            if (!calculated) return null
            const outerRect = outerContainerRef.current?.getBoundingClientRect()
            if (!outerRect) return null

            const offset = popoverOffsets[comment.id] || { x: 0, y: 0 }
            const goLeft = calculated.x > 60
            const goUp = calculated.y > 70

            const marginXPercent = (16 / outerRect.width) * 100
            const marginYPercent = (16 / outerRect.height) * 100

            const baseStartX = goLeft
              ? calculated.x - marginXPercent - (320 / outerRect.width) * 100
              : calculated.x + marginXPercent

            const baseStartY = goUp
              ? calculated.y - marginYPercent - (200 / outerRect.height) * 100
              : calculated.y + marginYPercent

            const targetX = baseStartX + (offset.x / outerRect.width) * 100 + (160 / outerRect.width) * 100
            const targetY = baseStartY + (offset.y / outerRect.height) * 100 + (100 / outerRect.height) * 100

            return (
              <line
                key={`line-${comment.id}`}
                x1={`${calculated.x}%`}
                y1={`${calculated.y}%`}
                x2={`${targetX}%`}
                y2={`${targetY}%`}
                stroke="var(--color-primary, #6366f1)"
                strokeWidth={3.5}
              />
            )
          })}
      </svg>

      {/* Existing Comment Pins (positioned outside zoom container, z-25, so they sit on top of the connector lines!) */}
      {activeComments.map((comment) => {
        const pos = screenPositions[comment.id]
        if (!pos) return null

        let customColor = undefined
        try {
          if (comment.annotationData) {
            const data = JSON.parse(comment.annotationData)
            customColor = data.color
          }
        } catch {}

        return (
          <div
            key={comment.id}
            className="absolute z-25 pointer-events-auto select-none"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
            }}
          >
            <CommentPin
              number={comments.findIndex((c) => c.id === comment.id) + 1}
              isSelected={selectedCommentId === comment.id}
              isResolved={comment.resolved}
              onClick={() => handlePinClick(comment.id)}
              customColor={customColor}
            />
          </div>
        )
      })}

      {/* Temporary draft pin if it exists */}
      {newPinPosition && screenPositions['new-pin'] && (
        <div
          className="absolute z-25 pointer-events-auto select-none"
          style={{
            left: `${screenPositions['new-pin'].x}%`,
            top: `${screenPositions['new-pin'].y}%`,
          }}
        >
          <div className="flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-white font-black border-2 border-white/50 shadow-lg animate-pin-pulse text-xs">
            +
          </div>
        </div>
      )}

      {/* Active Non-Resolved Comment Popovers (positioned outside zoom container) */}
      {activeComments
        .filter((c) => !c.resolved && !hiddenCommentIds[c.id])
        .map((comment) => {
          const calculated = screenPositions[comment.id]
          if (!calculated) return null
          const isSelected = selectedCommentId === comment.id
          return (
            <CommentPopover
              key={comment.id}
              comment={comment}
              position={{
                xPercent: calculated.x,
                yPercent: calculated.y,
              }}
              onSubmit={() => {}}
              onClose={() => {
                setHiddenCommentIds((prev) => ({ ...prev, [comment.id]: true }))
                if (isSelected) {
                  onSelectComment(null)
                }
              }}
              onResolve={onResolve}
              onEdit={onEdit}
              onDelete={onDelete}
              isOwner={isOwner}
              currentUserId={currentUserId}
              currentGuestName={currentGuestName}
              onOffsetChange={(newOffset) => {
                setPopoverOffsets((prev) => ({ ...prev, [comment.id]: newOffset }))
              }}
              initialOffset={popoverOffsets[comment.id] || { x: 0, y: 0 }}
              onShapeSelect={onShapeSelect}
              onColorSelect={onColorSelect}
              isSelected={isSelected}
              ownerPlan={ownerPlan}
            />
          )
        })}

      {/* New Comment Pin & Popover (outside zoom container) */}
      {newPinPosition && (() => {
        const calculated = screenPositions['new-pin']
        if (!calculated) return null
        return (
          <CommentPopover
            comment={null}
            position={{
              xPercent: calculated.x,
              yPercent: calculated.y,
            }}
            onSubmit={handleNewCommentSubmit}
            onClose={handleCloseNewComment}
            ownerPlan={ownerPlan}
          />
        )
      })()}


      {/* PDF Page Navigation Controls */}
      {isPDF && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-xl border border-border bg-card/90 px-3 py-1.5 shadow-lg backdrop-blur-md select-none pointer-events-auto">
          <button
            type="button"
            onClick={() => setPdfPage((p) => Math.max(1, p - 1))}
            disabled={pdfPage === 1}
            className="flex h-7 px-2.5 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-tiny-10 font-bold border border-transparent hover:border-border"
          >
            Prev Page
          </button>
          <span className="text-tiny-11 font-bold text-foreground min-w-[56px] text-center bg-muted/40 px-2.5 py-1 rounded-md border border-border/30">
            Page {pdfPage}
          </span>
          <button
            type="button"
            onClick={() => setPdfPage((p) => p + 1)}
            className="flex h-7 px-2.5 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-95 text-tiny-10 font-bold border border-transparent hover:border-border"
          >
            Next Page
          </button>
        </div>
      )}

      {/* Zoom Controls (Bottom Right) */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-xl border border-border bg-card/90 px-2.5 py-1.5 shadow-lg backdrop-blur-md select-none pointer-events-auto">
        <button
          onClick={() => setScale((s) => Math.max(0.25, s - 0.25))}
          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-95 border border-transparent hover:border-border"
          title="Zoom Out"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="text-tiny-11 font-bold text-foreground min-w-[36px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => Math.min(10, s + 0.25))}
          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-95 border border-transparent hover:border-border"
          title="Zoom In"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <div className="h-4 w-px bg-border" />
        <button
          onClick={() => {
            setScale(0.55)
            setPan({ x: 0, y: 0 })
          }}
          className="flex h-7 px-2 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-95 text-tiny-10 font-bold border border-transparent hover:border-border"
          title="Reset Zoom & Pan"
        >
          Reset
        </button>
      </div>

      {/* Comment Mode Overlay Hint */}
      {isCommentMode && comments.length === 0 && !newPinPosition && !isDrawing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-xl bg-black/50 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm animate-fade-in text-center">
            {redrawingCommentId
              ? `Draw a new ${effectiveTool} figure to replace this comment's shape`
              : effectiveTool === 'pin'
              ? 'Click anywhere on the design to pin a comment'
              : `Drag to draw a ${effectiveTool} outline to add a comment`}
          </div>
        </div>
      )}
    </div>
  )
}
