/**
 * 更新日志弹窗组件
 * 
 * 功能：
 * - 首次打开或版本更新后首次打开自动弹出
 * - 显示最近3个版本的更新日志
 * - 支持 Markdown 格式渲染
 * - 从 GitHub Releases 获取数据
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { MarkdownRenderer } from '@/components/ai/MarkdownRenderer'
import { fetchReleases, GitHubRelease, formatReleaseDate } from '@/api/githubApi'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronRight, ExternalLink, RefreshCw } from 'lucide-react'
import { GITHUB_RELEASES_URL } from '@/api/githubApi'

interface ChangelogDialogProps {
  open: boolean
  onClose: () => void
  currentVersion: string
  onVersionRecorded: (version: string) => void
}

export function ChangelogDialog({
  open,
  onClose,
  currentVersion,
  onVersionRecorded
}: ChangelogDialogProps) {
  const { t } = useTranslation()
  const [releases, setReleases] = useState<GitHubRelease[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedReleases, setExpandedReleases] = useState<Set<string>>(new Set())

  const fetchChangelog = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchReleases()
      const latest3Releases = data.slice(0, 3)
      setReleases(latest3Releases)
      
      if (latest3Releases.length > 0) {
        setExpandedReleases(new Set([latest3Releases[0].tag_name]))
      }
    } catch (err) {
      console.error('[ChangelogDialog] 获取更新日志失败:', err)
      setError(t('about.changelog.error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchChangelog()
    }
  }, [open])

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onVersionRecorded(currentVersion)
      onClose()
    }
  }

  const toggleRelease = (tagName: string) => {
    setExpandedReleases(prev => {
      const newSet = new Set(prev)
      if (newSet.has(tagName)) {
        newSet.delete(tagName)
      } else {
        newSet.add(tagName)
      }
      return newSet
    })
  }

  const openExternal = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col sm:max-h-[80vh] sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>{t('changelog.title')}</DialogTitle>
          <DialogDescription>{t('changelog.subtitle', { version: currentVersion })}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loading size="lg" text={t('about.changelog.loading')} />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" onClick={fetchChangelog}>
                <RefreshCw className="mr-2 size-4" />
                {t('about.changelog.retry')}
              </Button>
            </div>
          ) : releases.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">{t('about.changelog.noData')}</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {releases.map((release, index) => {
                  const isExpanded = expandedReleases.has(release.tag_name)
                  const isLatest = index === 0
                  
                  return (
                    <div
                      key={release.id}
                      className={`
                        rounded-lg border border-border
                        ${isLatest ? 'bg-primary/5' : 'bg-background'}
                      `}
                    >
                      <Button
                        onClick={() => toggleRelease(release.tag_name)}
                        variant="ghost"
                        className="w-full justify-between rounded-t-lg p-4 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <ChevronRight
                            className={`
                              size-4 text-muted-foreground transition-transform duration-200
                              ${isExpanded ? 'rotate-90' : ''}
                            `}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">
                                {release.name || release.tag_name}
                              </span>
                              {isLatest && (
                                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                                  {t('about.changelog.latest')}
                                </span>
                              )}
                              {release.prerelease && (
                                <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning">
                                  {t('about.changelog.beta')}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatReleaseDate(release.published_at)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            openExternal(release.html_url)
                          }}
                          className="shrink-0"
                        >
                          <ExternalLink className="size-4" />
                        </Button>
                      </Button>
                      
                      {isExpanded && (
                        <div className="border-t border-border px-4 pb-4 pt-0">
                          <div className="mt-3 text-sm">
                            <MarkdownRenderer
                              content={release.body || t('update.noReleaseNotes')}
                              className="changelog-markdown"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openExternal(GITHUB_RELEASES_URL)}
            className="text-muted-foreground"
          >
            <ExternalLink className="mr-2 size-4" />
            {t('about.viewFullLog')}
          </Button>
          <Button onClick={() => handleOpenChange(false)}>
            {t('common.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ChangelogDialog
