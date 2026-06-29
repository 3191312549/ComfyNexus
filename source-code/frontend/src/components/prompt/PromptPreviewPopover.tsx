/**
 * 提示词预览气泡组件
 */

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import type { Prompt } from '@/stores/usePromptStore'

interface PromptPreviewPopoverProps {
  prompt: Prompt | null
  position: { x: number; y: number }
}

function formatPrompt(text: string): React.ReactNode {
  if (!text) return null

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let key = 0

  const regex = /\(([^)]+):(\d+\.?\d*)\)|\(([^)]+)\)|\[([^\]]+)\]/g
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    if (match[1] && match[2]) {
      parts.push(
        <span key={key++}>
          (
          <span className="text-info">{match[1]}</span>
          :
          <span className="text-warning">{match[2]}</span>
          )
        </span>
      )
    } else if (match[3]) {
      parts.push(
        <span key={key++}>
          (<span className="text-info">{match[3]}</span>)
        </span>
      )
    } else if (match[4]) {
      parts.push(
        <span key={key++}>
          [<span className="text-danger">{match[4]}</span>]
        </span>
      )
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}

export function PromptPreviewPopover({
  prompt,
  position
}: PromptPreviewPopoverProps) {
  const { t } = useTranslation()
  const style = useMemo(() => {
    const popoverWidth = 440
    const popoverHeight = 200

    let x = position.x + 20
    let y = position.y + 20

    if (typeof window !== 'undefined') {
      if (x + popoverWidth > window.innerWidth) {
        x = position.x - popoverWidth - 20
      }
      if (y + popoverHeight > window.innerHeight) {
        y = window.innerHeight - popoverHeight - 20
      }
    }

    return {
      left: `${x}px`,
      top: `${y}px`
    }
  }, [position])

  if (!prompt) return null

  return (
    <div
      className={cn(
        'fixed z-[9999] w-[440px] rounded-lg border border-border p-4',
        'bg-surface/95 backdrop-blur-sm shadow-soft-lg',
        'pointer-events-none'
      )}
      style={style}
    >
      <div className="mb-3">
        <div className="mb-1.5 flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          <span className="size-1.5 rounded-full bg-success" />
          {t('prompt.preview.positivePrompt')}
        </div>
        <div className="rounded-md border border-border-subtle bg-muted p-2.5 font-mono text-xs leading-relaxed text-foreground">
          {formatPrompt(prompt.positivePrompt)}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          <span className="size-1.5 rounded-full bg-danger" />
          {t('prompt.preview.negativePrompt')}
        </div>
        <div className="rounded-md border border-border-subtle bg-muted p-2.5 font-mono text-xs leading-relaxed text-foreground">
          {formatPrompt(prompt.negativePrompt)}
        </div>
      </div>
    </div>
  )
}
