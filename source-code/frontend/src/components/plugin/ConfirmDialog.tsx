/**
 * ConfirmDialog 组件
 * 
 * 版本切换确认对话框，用于在切换插件版本前向用户确认操作
 * 显示目标版本的详细信息，并提供确认和取消选项
 * 
 * 验证需求: 3.1, 3.2, 3.3, 3.4
 */

import React from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/components/common'
import { Loading } from '@/components/ui/Loading'
import { AlertCircle, GitCommit, Calendar, Hash } from 'lucide-react'
import type { CommitInfo } from '@/types/plugin'

/**
 * ConfirmDialog 组件属性
 */
export interface PluginConfirmDialogProps {
  /** 对话框是否打开 */
  open: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 确认回调 */
  onConfirm: () => void
  /** 目标提交信息 */
  commit: CommitInfo
  /** 加载状态 */
  loading?: boolean
}

/**
 * 格式化日期
 */
const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

/**
 * PluginConfirmDialog 组件
 * 
 * 显示版本切换确认对话框，包含：
 * - 目标版本的提交信息（哈希值、消息、时间）
 * - 警告提示信息
 * - 确认和取消按钮
 * - 加载状态支持
 * 
 * 验证需求: 3.1, 3.2, 3.3, 3.4
 */
export const PluginConfirmDialog: React.FC<PluginConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  commit,
  loading = false
}) => {
  const { t } = useTranslation()

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title={t('plugin.versionSwitch.title')}
      description={t('plugin.versionSwitch.description')}
      confirmText={loading ? (
        <>
          <Loading size="sm" className="mr-2" />
          {t('common.processing')}
        </>
      ) : t('plugin.versionSwitch.confirm')}
      cancelText={t('common.cancel')}
      onConfirm={onConfirm}
      variant="warning"
      loading={loading}
      maxWidth="max-w-2xl"
    >
      {/* 目标版本信息 */}
      <div className="mb-4 rounded-lg border border-border bg-muted/50 p-4">
        <h4 className="mb-3 text-sm font-semibold text-content-primary">
          {t('plugin.versionSwitch.targetVersion')}
        </h4>

        <div className="space-y-3">
          {/* 提交哈希 */}
          <div>
            <div className="mb-1 text-xs text-content-muted">
              {t('plugin.versionSwitch.commitHash')}
            </div>
            <div className="flex items-center gap-2">
              <Hash className="size-4 text-content-muted" />
              <code className="rounded bg-background px-2 py-1 font-mono text-sm text-content-primary">
                {commit.hash}
              </code>
            </div>
          </div>

          {/* 提交消息 */}
          <div>
            <div className="mb-1 text-xs text-content-muted">
              {t('plugin.versionSwitch.commitMessage')}
            </div>
            <div className="flex items-start gap-2">
              <GitCommit className="mt-0.5 size-4 text-content-muted" />
              <p className="text-sm leading-relaxed text-content-primary">
                {commit.message}
              </p>
            </div>
          </div>

          {/* 提交时间 */}
          <div>
            <div className="mb-1 text-xs text-content-muted">
              {t('plugin.versionSwitch.commitDate')}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-content-muted" />
              <span className="text-sm text-content-primary">
                {formatDate(commit.date)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 警告提示 */}
      <div className="border-yellow-200 border-l-yellow-500 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30 mb-4 rounded-lg border border-l-4 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-yellow-600 dark:text-yellow-500 mt-0.5 size-5 shrink-0" />
          <div className="flex-1">
            <h4 className="text-yellow-800 dark:text-yellow-400 mb-1 text-sm font-semibold">
              {t('plugin.versionSwitch.notice')}
            </h4>
            <p className="text-yellow-700 dark:text-yellow-300 text-sm">
              {t('plugin.versionSwitch.noticeContent')}
            </p>
          </div>
        </div>
      </div>
    </ConfirmDialog>
  )
}

export default PluginConfirmDialog
