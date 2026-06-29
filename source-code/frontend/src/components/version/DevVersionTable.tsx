/**
 * 开发版表格组件
 * 表格布局显示开发版版本列表
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { VersionInfo } from '@/types/version'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { useSettingsStore } from '@/stores/useSettingsStore'

interface DevVersionTableProps {
  versions: VersionInfo[]
  currentVersionId?: string
  onSwitch?: (version: VersionInfo) => void
  disabled?: boolean
}

const CONCURRENCY = 3

/* eslint-disable no-restricted-syntax */
const AUTHOR_COLORS = [
  '#eab308', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', 
  '#f97316', '#06b6d4', '#84cc16', '#f43f5e', '#6366f1'
]
/* eslint-enable no-restricted-syntax */

function getAuthorColor(author: string): string {
  let hash = 0
  for (let i = 0; i < author.length; i++) {
    hash = author.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AUTHOR_COLORS[Math.abs(hash) % AUTHOR_COLORS.length]
}

function getAuthorInitial(author: string): string {
  return author.charAt(0).toUpperCase()
}

export function DevVersionTable({
  versions,
  currentVersionId,
  onSwitch,
  disabled = false,
}: DevVersionTableProps) {
  const { t } = useTranslation()
  const { systemSettings } = useSettingsStore()
  const autoTranslate = systemSettings.autoTranslateChangelog ?? false
  
  const [translations, setTranslations] = useState<Map<string, string>>(new Map())
  const [showOriginal, setShowOriginal] = useState<Set<string>>(new Set())
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set())
  
  const translatedRef = useRef<Set<string>>(new Set())
  const cancelledRef = useRef(false)
  const queueRef = useRef<{ id: string; text: string }[]>([])
  const processingRef = useRef(false)

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).replace(/\//g, '/')
  }

  const translateOne = useCallback(async (item: { id: string; text: string }) => {
    if (cancelledRef.current) return
    
    setTranslatingIds(prev => new Set(prev).add(item.id))
    
    try {
      const result = await window.pywebview.api.translate_text(item.text)
      
      if (!cancelledRef.current && result.success && result.translated_text) {
        setTranslations(prev => {
          const next = new Map(prev)
          next.set(item.id, result.translated_text!)
          return next
        })
      }
    } catch (error) {
      console.error(`翻译失败 [${item.id}]:`, error)
    } finally {
      setTranslatingIds(prev => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }, [])

  const processQueue = useCallback(async () => {
    if (processingRef.current) return
    processingRef.current = true
    
    const active: Promise<void>[] = []
    
    while (queueRef.current.length > 0 || active.length > 0) {
      if (cancelledRef.current) break
      
      while (active.length < CONCURRENCY && queueRef.current.length > 0) {
        const item = queueRef.current.shift()!
        const promise = translateOne(item)
        active.push(promise)
        promise.finally(() => {
          const index = active.indexOf(promise)
          if (index > -1) active.splice(index, 1)
        })
      }
      
      if (active.length > 0) {
        await Promise.race(active)
      }
    }
    
    processingRef.current = false
  }, [translateOne])

  useEffect(() => {
    if (!autoTranslate || versions.length === 0) return
    
    const toTranslate = versions
      .filter(v => !translatedRef.current.has(v.id) && v.message)
      .map(v => ({ id: v.id, text: v.message }))
    
    if (toTranslate.length === 0) return
    
    toTranslate.forEach(item => translatedRef.current.add(item.id))
    
    queueRef.current.push(...toTranslate)
    
    processQueue()
  }, [versions, autoTranslate, processQueue])

  useEffect(() => {
    if (!autoTranslate) {
      cancelledRef.current = true
      translatedRef.current = new Set()
      queueRef.current = []
      processingRef.current = false
      setTranslations(new Map())
      setShowOriginal(new Set())
      setTranslatingIds(new Set())
    }
  }, [autoTranslate])

  useEffect(() => {
    return () => {
      cancelledRef.current = true
    }
  }, [])

  const handleMessageClick = (versionId: string) => {
    if (!translations.has(versionId)) return
    
    setShowOriginal(prev => {
      const next = new Set(prev)
      if (next.has(versionId)) {
        next.delete(versionId)
      } else {
        next.add(versionId)
      }
      return next
    })
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div
        className="grid gap-4 border-b border-border bg-muted px-6 py-3.5"
        style={{ gridTemplateColumns: '120px 1fr 140px 160px 100px' }}
      >
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('version.table.commit')}
        </div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('version.table.message')}
        </div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('version.table.author')}
        </div>
        <div className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('version.table.time')}
        </div>
        <div className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('version.table.action')}
        </div>
      </div>

      <div className="divide-y divide-border">
        {versions.map((version) => {
          const isCurrent = version.id === currentVersionId
          const author = version.author || 'Unknown'
          const authorColor = getAuthorColor(author)
          const authorInitial = getAuthorInitial(author)
          const hasTranslation = translations.has(version.id)
          const isShowingOriginal = showOriginal.has(version.id)
          const isTranslating = translatingIds.has(version.id)
          const displayMessage = hasTranslation && !isShowingOriginal
            ? translations.get(version.id)
            : version.message

          return (
            <div
              key={version.id}
              className={cn(
                'grid gap-4 px-6 py-4 items-center transition-all duration-200',
                isCurrent && [
                  'bg-gradient-to-r from-warning/10 to-warning/[0.01]',
                  'border-l-[3px] border-warning',
                  'pl-[21px]'
                ],
                !isCurrent && 'hover:bg-muted/50'
              )}
              style={{ gridTemplateColumns: '120px 1fr 140px 160px 100px' }}
            >
              <div
                className={cn(
                  'font-mono text-sm font-semibold flex items-center gap-1.5',
                  isCurrent ? 'text-warning' : 'text-foreground'
                )}
              >
                <svg
                  className={cn('w-4 h-4', isCurrent ? 'text-warning/70' : 'text-muted-foreground')}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="4" />
                  <line x1="1.05" y1="12" x2="7" y2="12" />
                  <line x1="17.01" y1="12" x2="22.96" y2="12" />
                </svg>
                {version.id}
              </div>

              <div
                className={cn(
                  'line-clamp-2 text-[13px] leading-relaxed',
                  hasTranslation ? 'cursor-pointer hover:text-foreground text-muted-foreground' : 'text-muted-foreground'
                )}
                title={hasTranslation && !isShowingOriginal ? version.message : undefined}
                onClick={() => handleMessageClick(version.id)}
              >
                {displayMessage}
                {isTranslating && (
                  <Loader2 className="size-3 animate-spin inline ml-1.5 text-primary" />
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-foreground">
                <div
                  className="flex size-[22px] items-center justify-center rounded-full text-[10px] font-bold text-primary-foreground"
                  style={{ background: authorColor }}
                >
                  {authorInitial}
                </div>
                <span className="max-w-[90px] truncate">{author}</span>
              </div>

              <div className="text-center font-mono text-[13.5px] font-medium text-muted-foreground">
                {formatDate(version.timestamp)}
              </div>

              <div className="flex justify-center">
                {isCurrent ? (
                  <span className="text-[13px] font-semibold text-warning">
                    {t('version.running')}
                  </span>
                ) : (
                  <Button
                    onClick={() => onSwitch?.(version)}
                    disabled={disabled}
                    variant="outline"
                    size="sm"
                  >
                    {t('version.switchVersion')}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DevVersionTable
