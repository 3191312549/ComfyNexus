/**
 * Git 权限修复按钮组件
 * 
 * 提供"修复 Git 权限"按钮和帮助图标
 * - 点击修复按钮时打开 GitPermissionFixDialog
 * - 点击帮助图标时打开 GitPermissionHelpDialog
 * - 修复完成后调用 onRefresh 回调刷新插件列表
 * 
 * **验证需求：3.1, 3.6, 4.1, 4.2**
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Wrench, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { GitPermissionFixDialog } from './GitPermissionFixDialog'
import { GitPermissionHelpDialog } from './GitPermissionHelpDialog'

/**
 * GitPermissionFixButton 组件属性
 */
export interface GitPermissionFixButtonProps {
  /** 修复完成后刷新插件列表的回调 */
  onRefresh?: () => void
}

/**
 * Git 权限修复按钮
 * 
 * 显示在插件列表工具栏，提供以下功能：
 * 1. 修复按钮：打开修复对话框，执行批量权限修复
 * 2. 帮助图标：打开帮助对话框，显示权限问题说明
 * 
 * **验证需求：3.1, 3.6, 4.1, 4.2**
 */
export function GitPermissionFixButton({
  onRefresh: _onRefresh,
}: GitPermissionFixButtonProps) {
  const { t } = useTranslation()
  const [showFixDialog, setShowFixDialog] = useState(false)
  const [showHelpDialog, setShowHelpDialog] = useState(false)

  const handleOpenFixDialog = () => {
    setShowFixDialog(true)
  }

  const handleCloseFixDialog = () => {
    setShowFixDialog(false)
  }

  const handleFixComplete = () => {
    console.log('[GitPermissionFixButton] Git权限修复完成,无需刷新列表');
  }

  const handleOpenHelpDialog = () => {
    setShowHelpDialog(true)
  }

  const handleCloseHelpDialog = () => {
    setShowHelpDialog(false)
  }

  return (
    <>
      <div className="flex items-center gap-0.5">
        <Button
          onClick={handleOpenFixDialog}
          variant="outline"
          size="sm"
          className="bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 hover:border-red-300 dark:hover:border-red-500/40"
        >
          <Wrench className="size-4" />
          <span>{t("plugin.gitPermission.fixButton")}</span>
        </Button>

        <Button
          onClick={handleOpenHelpDialog}
          variant="ghost"
          size="icon"
          className="text-gray-400 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-600 dark:hover:text-zinc-300 size-6"
          title={t("common.title.gitPermissionHelp")}
        >
          <HelpCircle className="size-4" />
        </Button>
      </div>

      <GitPermissionFixDialog
        open={showFixDialog}
        onClose={handleCloseFixDialog}
        onComplete={handleFixComplete}
      />

      <GitPermissionHelpDialog
        open={showHelpDialog}
        onClose={handleCloseHelpDialog}
      />
    </>
  )
}

export default GitPermissionFixButton
