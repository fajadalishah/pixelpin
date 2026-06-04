'use client'

import { cn } from '@/lib/utils'

interface CommentPinProps {
  number: number
  isSelected: boolean
  isResolved: boolean
  onClick: () => void
  customColor?: string
}

export function CommentPin({ number, isSelected, isResolved, onClick, customColor }: CommentPinProps) {
  const useCustom = customColor && !isResolved

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'flex items-center justify-center rounded-full font-black leading-none transition-all duration-200 hover:scale-110 shadow-lg',
        'select-none focus:outline-none border-2 border-white/50',
        // Base size (decreased to fit design layout cleanly)
        isSelected ? 'h-8.5 w-8.5 text-xs' : 'h-6.5 w-6.5 text-tiny-9',
        // Colors
        isResolved
          ? 'bg-success text-white shadow-success/30'
          : useCustom
            ? 'text-white'
            : 'bg-primary text-primary-foreground shadow-primary/30',
        // Selected state
        isSelected && !isResolved && !useCustom && 'ring-4 ring-primary/30 shadow-xl shadow-primary/40',
        isSelected && isResolved && 'ring-4 ring-success/30 shadow-xl shadow-success/40',
        // Pulse for fresh pins
        !isResolved && !isSelected && 'animate-pin-pulse'
      )}
      style={{
        transform: 'translate(-50%, -50%)',
        backgroundColor: useCustom ? customColor : undefined,
        boxShadow: isSelected && useCustom ? `0 0 0 4px ${customColor}40, 0 10px 15px -3px ${customColor}50` : undefined,
      }}
      title={`Comment #${number}`}
    >
      {number}
    </button>
  )
}
