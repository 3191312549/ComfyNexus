/**
 * 版本卡片组件
 * 显示版本信息，高亮当前版本
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, User, GitCommit, ChevronDown, ChevronUp, ExternalLink, FileText } from 'lucide-react'
import { VersionInfo } from '@/types/version'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

interface VersionCardProps {
  version: VersionInfo
  isCurrent?: boolean
  isLatest?: boolean
  onSwitch?: (version: VersionInfo) => void
  switching?: boolean
}

export function VersionCard({
  version,
  isCurrent = false,
  isLatest = false,
  onSwitch,
  switching = false,
}: VersionCardProps) {
  const { t } = useTranslation()
  const [showReleaseNotes, setShowReleaseNotes] = useState(false)

  const isDev = version.type === 'dev'
  const hasReleaseNotes = version.releaseNotesHtml && version.releaseNotesHtml.length > 0

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 transition-all',
        'hover:shadow-md',
        isDev && 'border-yellow-500/50',
        isCurrent && 'ring-2 ring-primary'
      )}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {version.tag ? (
              <h3 className="text-lg font-semibold">{version.tag}</h3>
            ) : (
              <h3 className="font-mono text-sm text-muted-foreground">
                {version.id}
              </h3>
            )}
            {version.releaseName && version.releaseName !== version.tag && (
              <span className="text-xs text-muted-foreground">
                {version.releaseName}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {isCurrent && (
            <Badge variant="default" className="bg-blue-500">
              {t('version.currentVersion')}
            </Badge>
          )}
          {isLatest && !isCurrent && (
            <Badge variant="default" className="bg-green-500">
              {t('version.latestVersion')}
            </Badge>
          )}
          {isDev && (
            <Badge variant="default" className="bg-yellow-500 text-black">
              {t('version.dev')}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <GitCommit className="size-4" />
          <span className="font-mono">{version.id}</span>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="size-4" />
          <span>{formatDate(version.timestamp)}</span>
        </div>

        {version.author && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="size-4" />
            <span>{version.author}</span>
          </div>
        )}
      </div>

      <div
        className={cn(
          'mt-3 rounded-md p-3 text-sm',
          isDev ? 'bg-yellow-50 dark:bg-yellow-950/20' : 'bg-muted'
        )}
      >
        <p className="whitespace-pre-wrap break-words">{version.message}</p>
      </div>

      {hasReleaseNotes && !isDev && (
        <div className="mt-3">
          <Button
            variant="ghost"
            onClick={() => setShowReleaseNotes(!showReleaseNotes)}
            className="flex w-full items-center justify-between rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            <div className="flex items-center gap-2">
              <FileText className="size-4" />
              <span>{t('version.releaseNotes')}</span>
            </div>
            {showReleaseNotes ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </Button>
          
          {showReleaseNotes && (
            <div className="mt-2 rounded-md border bg-muted/30 p-3">
              <div 
                className="prose prose-sm dark:prose-invert max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: version.releaseNotesHtml || '' }}
              />
              {version.releaseUrl && (
                <a
                  href={version.releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  {t('version.viewOnGithub')}
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {isDev && (
        <div className="mt-3 rounded-md bg-yellow-50 p-3 text-xs text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-200">
          {'⚠️'} {t('version.devWarningMessage')}
        </div>
      )}

      {!isCurrent && onSwitch && (
        <div className="mt-4">
          <Button
            onClick={() => onSwitch(version)}
            disabled={switching}
            className="w-full"
            variant={isDev ? 'outline' : 'default'}
          >
            {switching ? t('version.switching') : t('version.switchVersion')}
          </Button>
        </div>
      )}
    </div>
  )
}
