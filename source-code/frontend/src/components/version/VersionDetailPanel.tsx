/**
 * 版本详情面板组件
 * 从右侧滑入的悬浮面板，显示版本详情和更新日志
 */

import { useEffect, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ExternalLink, Loader2, Languages } from 'lucide-react'
import { VersionInfo } from '@/types/version'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { toast } from '@/utils/toast'

function formatGithubLinks(html: string): string {
  html = html.replace(
    /<a[^>]*href=["'](https?:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/(\d+))["'][^>]*>([^<]*)<\/a>/gi,
    '<a href="$1" target="_blank" class="text-primary hover:underline">#$2</a>'
  )
  
  html = html.replace(
    /<a[^>]*href=["'](https?:\/\/github\.com\/[^\/]+\/[^\/]+\/issues\/(\d+))["'][^>]*>([^<]*)<\/a>/gi,
    '<a href="$1" target="_blank" class="text-primary hover:underline">#$2</a>'
  )
  
  html = html.replace(
    /<a[^>]*href=["'](https?:\/\/github\.com\/[^\/]+\/[^\/]+\/commit\/([a-f0-9]+))["'][^>]*>([^<]*)<\/a>/gi,
    (_match, url, hash) => {
      return `<a href="${url}" target="_blank" class="text-primary hover:underline">${hash.substring(0, 7)}</a>`
    }
  )
  
  html = html.replace(
    /`?(https?:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/(\d+))`?/gi,
    '<a href="$1" target="_blank" class="text-primary hover:underline">#$2</a>'
  )
  
  html = html.replace(
    /`?(https?:\/\/github\.com\/[^\/]+\/[^\/]+\/issues\/(\d+))`?/gi,
    '<a href="$1" target="_blank" class="text-primary hover:underline">#$2</a>'
  )
  
  html = html.replace(
    /`?(https?:\/\/github\.com\/[^\/]+\/[^\/]+\/commit\/([a-f0-9]+))`?/gi,
    (_match, url, hash) => {
      return `<a href="${url}" target="_blank" class="text-primary hover:underline">${hash.substring(0, 7)}</a>`
    }
  )
  
  return html
}

interface VersionDetailPanelProps {
  open: boolean
  version: VersionInfo | null
  isCurrent: boolean
  onClose: () => void
  onSwitch: () => void
  switching?: boolean
}

export function VersionDetailPanel({
  open,
  version,
  isCurrent,
  onClose,
  onSwitch,
  switching = false,
}: VersionDetailPanelProps) {
  const { t } = useTranslation()
  const { systemSettings } = useSettingsStore()
  const autoTranslate = systemSettings.autoTranslateChangelog ?? false
  
  const [translatedContent, setTranslatedContent] = useState<string | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)

  const formatDate = useCallback((timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])
  
  useEffect(() => {
    if (!open || !version || !autoTranslate) {
      setTranslatedContent(null)
      setShowOriginal(false)
      return
    }
    
    const hasContent = version.releaseNotesHtml && version.releaseNotesHtml.length > 0
    if (!hasContent) return
    
    const translateContent = async () => {
      setIsTranslating(true)
      setTranslatedContent(null)
      
      try {
        const textToTranslate = version.releaseNotesHtml || ''
        const result = await window.pywebview.api.translate_text(textToTranslate)
        
        if (result.success && result.translated_text) {
          setTranslatedContent(result.translated_text)
        } else {
          toast.error(t('version.translateFailed'))
        }
      } catch (error) {
        toast.error(t('version.translateFailed'))
      } finally {
        setIsTranslating(false)
      }
    }
    
    translateContent()
  }, [open, version, autoTranslate, t])

  if (!version) return null

  const hasReleaseNotes = version.releaseNotesHtml && version.releaseNotesHtml.length > 0

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-[30%] bg-surface shadow-2xl transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border p-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold">
                {version.tag || version.id}
              </h2>
              <div className="text-sm text-muted-foreground">
                {formatDate(version.timestamp)}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-lg"
            >
              <X className="size-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {isTranslating ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex items-center gap-3">
                  <Loader2 className="size-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">
                    {t('version.translating')}
                  </span>
                </div>
              </div>
            ) : (
              <>
                {translatedContent && (
                  <div className="mb-4 flex items-center justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowOriginal(!showOriginal)}
                      className="gap-2"
                    >
                      <Languages className="size-4" />
                      {showOriginal ? t('version.showTranslated') : t('version.showOriginal')}
                    </Button>
                  </div>
                )}
                
                <div
                  className="prose prose-sm dark:prose-invert prose-headings:mt-4 
                    prose-headings:mb-2 prose-p:my-2 prose-li:my-0.5 
                    prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                    prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                    prose-pre:bg-muted prose-pre:p-4 max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: formatGithubLinks(
                      (translatedContent && !showOriginal) 
                        ? translatedContent 
                        : (version.releaseNotesHtml || '')
                    )
                  }}
                />
              </>
            )}
            
            {!isTranslating && !hasReleaseNotes && (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">
                  {t('version.detailPanel.noReleaseNotes')}
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-border p-6">
            {isCurrent ? (
              <Badge variant="default" className="w-full justify-center py-3 text-base">
                {t('version.current')}
              </Badge>
            ) : (
              <div className="space-y-3">
                {version.releaseUrl && (
                  <a
                    href={version.releaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 text-sm text-primary hover:underline"
                  >
                    {t('version.viewOnGithub')}
                    <ExternalLink className="size-3" />
                  </a>
                )}
                <Button
                  onClick={onSwitch}
                  disabled={switching}
                  className="w-full"
                >
                  {switching ? t('version.switching') : t('version.detailPanel.switchToVersion')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default VersionDetailPanel
