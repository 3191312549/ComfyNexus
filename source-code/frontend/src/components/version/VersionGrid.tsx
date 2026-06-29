/**
 * 版本网格组件
 * 响应式网格布局，支持加载更多
 */

import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { VersionInfo } from '@/types/version'
import { Button } from '@/components/ui/Button'

interface VersionGridProps {
  versions: VersionInfo[]
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  renderCard: (version: VersionInfo) => React.ReactNode
  emptyMessage?: string
}

export function VersionGrid({
  versions,
  loading = false,
  hasMore = false,
  onLoadMore,
  renderCard,
  emptyMessage,
}: VersionGridProps) {
  const { t } = useTranslation()

  // 空状态
  if (!loading && versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">
          {emptyMessage || t('version.noVersions')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 版本网格 */}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {versions.map((version) => (
          <div key={version.id}>
            {renderCard(version)}
          </div>
        ))}
      </div>

      {/* 加载更多按钮 */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t('version.loading')}
              </>
            ) : (
              t('version.loadMore')
            )}
          </Button>
        </div>
      )}

      {/* 初始加载状态 */}
      {loading && versions.length === 0 && (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
