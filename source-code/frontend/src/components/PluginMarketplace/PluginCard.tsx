/**
 * 插件卡片组件
 * 
 * 显示单个插件的信息，采用 Glassmorphism 风格
 * 
 * 功能：
 * - 显示插件基本信息
 * - 显示安装状态（已安装/未安装）
 * - 提供安装按钮
 * - 支持加载状态
 * - 描述固定2行，始终显示"阅读详情"
 */

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plugin, InstallStatusType } from '@/types/plugin-marketplace'
import { cn } from '@/lib/utils'
import { ExternalLink, Check, Download, Clock, User, GitBranch, Star, Ban, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface PluginCardProps {
  plugin: Plugin
  autoInstallDeps: boolean
  onInstall: (plugin: Plugin) => void
  isInstalling?: boolean
  onShowMore?: (plugin: Plugin) => void
}

const truncateText = (text: string, maxLength: number): string => {
  if (text === null || text === undefined) {
    return ''
  }
  const str = String(text)
  if (str.length <= maxLength) {
    return str
  }
  return str.substring(0, maxLength) + '...'
}

export const PluginCard: React.FC<PluginCardProps> = ({
  plugin,
  onInstall,
  isInstalling = false,
  onShowMore
}) => {
  const { t } = useTranslation()
  const [isHoveringButton, setIsHoveringButton] = useState(false)
  
  const installStatus: InstallStatusType = plugin.install_status || 'not_installed'
  const isInstalledOrDisabled = installStatus === 'installed' || installStatus === 'disabled'
  const showReinstall = isInstalledOrDisabled && isHoveringButton && !isInstalling

  const formatUpdateTime = (isoString: string): string => {
    try {
      if (!isoString || isoString === 'null' || isoString === 'undefined') {
        return t('common.unknown')
      }
      const dateStr = String(isoString)
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        return t('common.unknown')
      }
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch (_error) {
      return t('common.unknown')
    }
  }

  const handleInstallClick = () => {
    if (!isInstalling) {
      onInstall(plugin)
    }
  }

  const handleShowMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onShowMore) {
      onShowMore(plugin)
    }
  }

  return (
    <div 
      className={cn(
        "relative overflow-hidden group",
        "flex flex-col h-full",
        "bg-surface border border-border rounded-xl",
        "hover:border-border-strong transition-all duration-200"
      )}
    >
      { }
      <div 
        className="duration-400 absolute inset-x-0 top-0 h-px opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--bg-surface)/0.25), transparent)' }}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
        <div className="flex shrink-0 items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <h3 
              className="truncate text-sm font-semibold text-content-primary"
              title={typeof plugin.name === 'string' ? plugin.name : JSON.stringify(plugin.name)}
            >
              {typeof plugin.name === 'string' ? plugin.name : JSON.stringify(plugin.name)}
            </h3>
          </div>
          {plugin.repository && (
            <a
              href={plugin.repository}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-lg",
                "bg-muted",
                "text-content-muted hover:text-content-primary",
                "border border-transparent hover:border-border",
                "transition-all duration-200 hover:scale-105 flex-shrink-0"
              )}
              title={t("common.title.viewOnGithub")}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-1">
          <p className="line-clamp-2 min-h-8 text-xs leading-relaxed text-content-secondary">
            {plugin.description || t('plugin.noDescription')}
          </p>
          <Button
            onClick={handleShowMoreClick}
            variant="link"
            className="h-auto self-start p-0 text-xs font-medium text-content-muted hover:text-primary"
          >
            {t('pluginMarket.readMore')}
            <ExternalLink className="size-3" />
          </Button>
        </div>

        <div className="mt-auto grid shrink-0 grid-cols-2 gap-x-3 gap-y-1 border-t border-border pt-2 text-xs text-content-muted">
          <div className="flex items-center gap-1 overflow-hidden">
            <Clock className="size-3 shrink-0 opacity-80" />
            <span className="meta-val truncate">{formatUpdateTime(plugin.updated_at)}</span>
          </div>
          <div className="flex items-center gap-1 overflow-hidden" title={plugin.author || ''}>
            <User className="size-3 shrink-0 opacity-80" />
            <span className="meta-val max-w-16 truncate font-medium">
              {truncateText(plugin.author || '', 10)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <GitBranch className="size-3 shrink-0 opacity-80" />
            <span className="truncate">{t('plugin.nodes')}: <span className="meta-val">{plugin.node_count || 0}</span></span>
          </div>
          {plugin.stars > 0 && (
            <div className="flex items-center gap-1 text-warning">
              <Star className="size-3 shrink-0 fill-current" />
              <span className="meta-val truncate text-warning">{plugin.stars}</span>
            </div>
          )}
        </div>
      </div>

      <div 
        className={cn(
          "px-4 py-3 flex justify-end items-center flex-shrink-0",
          "border-t border-border",
          "bg-muted"
        )}
      >
        <Button
          onClick={handleInstallClick}
          disabled={isInstalling}
          variant={showReinstall ? 'default' : 'outline'}
          size="sm"
          className="gap-2"
          onMouseEnter={() => setIsHoveringButton(true)}
          onMouseLeave={() => setIsHoveringButton(false)}
        >
          {isInstalling ? (
            <>
              <span className="mr-1 inline-block animate-spin">⏳</span>
              {t('plugin.installing')}
            </>
          ) : showReinstall ? (
            <>
              <RefreshCw className="size-3.5" />
              {t('plugin.marketplace.reinstall')}
            </>
          ) : installStatus === 'disabled' ? (
            <>
              <Ban className="size-3.5 text-warning" />
              {t('plugin.marketplace.disabled')}
            </>
          ) : installStatus === 'installed' ? (
            <>
              <Check className="size-3.5 text-success" />
              {t('plugin.marketplace.installed')}
            </>
          ) : (
            <>
              <Download className="size-3.5" />
              {t('common.install')}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

PluginCard.displayName = 'PluginCard'

export default PluginCard
