/**
 * 环境标签卡导航栏组件
 * 显示所有ComfyUI环境，支持快速切换、删除、添加
 * 设计参考：蓝色高亮激活环境，显示别名，支持删除和添加环境
 */

import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useEnvStore } from '@/stores/useEnvStore'
import { useEnvSwitchGuard } from '@/contexts/EnvSwitchGuardContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Plus, X } from 'lucide-react'
import { DeleteConfirmDialog } from '@/components/env/DeleteConfirmDialog'
import { useToast } from '@/hooks/useToast'
import { EnvironmentTypeBadge } from '@/components/environment/EnvironmentTypeBadge'

export function TopNavBar() {
  const { t } = useTranslation()
  const { 
    environments, 
    currentEnvId, 
    switchEnvironment,
    deleteEnvironment,
    createEnvironment
  } = useEnvStore()
  const { checkBeforeSwitch } = useEnvSwitchGuard()
  const { success, error: showError } = useToast()

  // 删除确认对话框状态
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleteTargetAlias, setDeleteTargetAlias] = useState<string>('')

  // 处理环境切换
  const handleSwitch = useCallback(async (envId: string) => {
    if (envId !== currentEnvId) {
      try {
        // 检查是否允许切换（会触发守卫）
        const canSwitch = await checkBeforeSwitch(envId)
        
        // 如果守卫允许切换，执行切换
        if (canSwitch) {
          await switchEnvironment(envId)
        }
      } catch (error) {
        console.error('Failed to switch environment:', error)
      }
    }
  }, [currentEnvId, switchEnvironment, checkBeforeSwitch])

  // 处理删除按钮点击
  const handleDeleteClick = useCallback((envId: string, alias: string, e: React.MouseEvent) => {
    e.stopPropagation() // 阻止事件冒泡，避免触发环境切换
    setDeleteTargetId(envId)
    setDeleteTargetAlias(alias)
    setShowDeleteConfirm(true)
  }, [])

  // 处理删除确认
  const handleDeleteConfirm = useCallback(async () => {
    if (deleteTargetId) {
      try {
        await deleteEnvironment(deleteTargetId)
        setShowDeleteConfirm(false)
        setDeleteTargetId(null)
        setDeleteTargetAlias('')
        success(t('env.message.deleteSuccess'))
      } catch (error) {
        console.error('Failed to delete environment:', error)
        showError(t('env.message.deleteFailed'))
      }
    }
  }, [deleteTargetId, deleteEnvironment, t, success, showError])

  // 处理删除取消
  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false)
    setDeleteTargetId(null)
    setDeleteTargetAlias('')
  }, [])

  // 处理添加环境
  const handleAddEnvironment = useCallback(async () => {
    console.log('[TopNavBar] 点击添加环境按钮')
    
    try {
      let selectedPath: string | undefined

      // 检查pywebview API是否可用
      if (window.pywebview?.api?.select_directory) {
        console.log('[TopNavBar] 使用pywebview API选择文件夹')
        // 生产环境：使用pywebview API
        const response = await window.pywebview.api.select_directory()
        console.log('[TopNavBar] 文件夹选择响应:', response)
        
        // 用户取消选择或失败
        if (!response.success || !response.path) {
          console.log('[TopNavBar] 用户取消或选择失败')
          return
        }
        
        selectedPath = response.path
        
        // 等待文件对话框完全关闭
        await new Promise(resolve => setTimeout(resolve, 300))
      } else {
        // 开发环境：使用prompt模拟
        const path = prompt(t('topNavBar.inputPathDev'), 'C:\\ComfyUI-New')
        
        // 用户取消
        if (!path) {
          return
        }
        
        selectedPath = path
      }

      await createEnvironment(selectedPath)
      success(t('env.message.createSuccess'))
    } catch (error) {
      console.error('[TopNavBar] 创建环境失败:', error)
      const errorMessage = error instanceof Error ? error.message : t('env.message.createFailed')
      showError(errorMessage)
    }
  }, [createEnvironment, t, success, showError])

  if (environments.length === 0) {
    // 没有环境时，只显示添加环境按钮
    return (
      <>
        <div className="dark:bg-dark-primary dark:border-dark-border flex h-12 items-center justify-between gap-2 overflow-x-auto border-b border-border bg-background px-4">
          <div className="flex items-center gap-2">
            {/* 添加环境按钮 */}
            <Button
              onClick={handleAddEnvironment}
              className="flex items-center gap-2 whitespace-nowrap"
              aria-label={t('common.addEnv')}
              title={t('common.addEnv')}
            >
              <Plus size={16} />
              <span>{t('common.addEnv')}</span>
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="dark:bg-dark-primary dark:border-dark-border flex h-12 items-center justify-between gap-2 border-b border-border bg-background px-4">
        {/* 左侧：环境标签列表 */}
        <div className="flex flex-1 items-center gap-2">
          {environments.map((env) => {
            const isActive = env.id === currentEnvId
            
            return (
              <Button
                key={env.id}
                onClick={() => handleSwitch(env.id)}
                variant={isActive ? "default" : "outline"}
                className="flex items-center gap-2 whitespace-nowrap"
                title={`${env.alias}${env.version ? ` v${env.version}` : ''}`}
              >
                <span className="flex items-center gap-1">
                  <span>{env.alias}</span>
                  <EnvironmentTypeBadge type={env.envType} />
                  {env.version && env.version !== "Unknown" && (
                    <span className={cn(
                      "text-xs",
                      isActive 
                        ? "text-blue-200 dark:text-blue-200" 
                        : "text-gray-500 dark:text-gray-500"
                    )}>
                      v{env.version}
                    </span>
                  )}
                </span>
                
                {/* 删除按钮（所有环境都可以删除） */}
                <X
                  size={14}
                  className={cn(
                    "ml-1 transition-colors",
                    isActive 
                      ? "hover:text-red-300" 
                      : "hover:text-red-500"
                  )}
                  onClick={(e) => handleDeleteClick(env.id, env.alias, e)}
                />
              </Button>
            )
          })}

          {/* 添加环境按钮 */}
          <Button
            onClick={handleAddEnvironment}
            variant="outline"
            className="flex items-center gap-2 whitespace-nowrap"
            aria-label={t('common.addEnv')}
            title={t('common.addEnv')}
          >
            <Plus size={16} />
            <span>{t('common.addEnv')}</span>
          </Button>
        </div>


      </div>

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <DeleteConfirmDialog
          alias={deleteTargetAlias}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </>
  )
}
