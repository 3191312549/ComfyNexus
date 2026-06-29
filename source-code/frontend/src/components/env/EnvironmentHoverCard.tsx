/**
 * 环境悬停卡片组件
 * 显示环境的详细信息
 */

import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export interface EnvironmentDetailInfo {
  path: string
  alias: string
  version: string
  envType?: 'portable' | 'desktop' | 'unknown'
  commitHash?: string
  isDev?: boolean
  lastUpdated?: string
  pythonVersion?: string
  pytorchVersion?: string
  cudaVersion?: string
}

interface EnvironmentHoverCardProps {
  info: EnvironmentDetailInfo
  isVisible: boolean
  position?: { x: number; y: number }
}

export function EnvironmentHoverCard({ info, isVisible, position }: EnvironmentHoverCardProps) {
  const { t } = useTranslation()
  if (!isVisible) return null

  const cardContent = (
    <div
      className={cn(
        "fixed z-[9999] mt-2 w-80 rounded-lg border border-border",
        "bg-surface shadow-lg",
        "p-3 text-sm"
      )}
      style={position ? { left: position.x, top: position.y } : undefined}
    >
      <div className="mb-2 border-b border-border pb-2">
        <div className="font-semibold text-foreground">
          {info.alias}
        </div>
        <div className="break-all text-xs text-muted-foreground">
          {info.path}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("env.coreVersion")}:</span>
          <div className="flex items-center gap-1">
            {info.envType === 'desktop' ? (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                {t('env.desktopVersion')}
              </span>
            ) : (
              <>
                <span className="font-mono text-xs text-foreground">
                  {info.commitHash || t('env.unknown')}
                </span>
                {info.isDev && (
                  <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                    {t('env.dev')}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {info.envType !== 'desktop' && info.lastUpdated && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('env.updated')}:</span>
            <span className="text-xs text-foreground">
              {new Date(info.lastUpdated).toLocaleDateString()}
            </span>
          </div>
        )}

        {(info.pythonVersion || info.pytorchVersion || info.cudaVersion) && (
          <div className="my-2 border-t border-border" />
        )}

        {info.pythonVersion && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('env.python')}:</span>
            <span className="font-mono text-xs text-foreground">
              {info.pythonVersion}
            </span>
          </div>
        )}

        {info.pytorchVersion && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('env.pytorch')}:</span>
            <span className="font-mono text-xs text-foreground">
              {info.pytorchVersion}
            </span>
          </div>
        )}

        {info.cudaVersion && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('env.cuda')}:</span>
            <span className="font-mono text-xs text-foreground">
              {info.cudaVersion}
            </span>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(cardContent, document.body)
}
