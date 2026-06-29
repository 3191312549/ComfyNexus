/**
 * 系统提示词管理弹窗组件
 * 
 * 集成预设列表和表单，提供完整的预设管理功能
 * 
 * 验证需求：4.1-4.9, 5.1-5.5, 6.1-6.7
 */

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Button } from '../ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { PromptList } from './PromptList'
import { PromptForm } from './PromptForm'
import { useSystemPromptStore } from '../../stores/useSystemPromptStore'
import type { SystemPromptPreset } from '../../stores/useSystemPromptStore'

interface PromptManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const PromptManagementDialog: React.FC<PromptManagementDialogProps> = React.memo(({
  open,
  onOpenChange
}) => {
  const { t } = useTranslation()
  const {
    presets,
    loadPresets,
    createPreset,
    updatePreset,
    deletePreset,
    isLoading,
    error
  } = useSystemPromptStore()
  
  const [showForm, setShowForm] = useState(false)
  const [editingPreset, setEditingPreset] = useState<SystemPromptPreset | null>(null)
  
  // 加载预设列表
  useEffect(() => {
    if (open) {
      loadPresets()
    }
  }, [open, loadPresets])
  
  // 处理新增预设
  const handleAddNew = () => {
    setEditingPreset(null)
    setShowForm(true)
  }
  
  // 处理编辑预设
  const handleEdit = (preset: SystemPromptPreset) => {
    setEditingPreset(preset)
    setShowForm(true)
  }
  
  // 处理删除预设
  const handleDelete = async (presetId: string) => {
    const success = await deletePreset(presetId)
    if (success) {
      // 删除成功，重新加载列表
      await loadPresets()
    }
  }
  
  // 处理保存预设
  const handleSave = async (data: { name: string; content: string }) => {
    let success = false
    
    if (editingPreset) {
      // 更新现有预设
      success = await updatePreset(editingPreset.id, data)
    } else {
      // 创建新预设
      const newPreset = await createPreset(data)
      success = newPreset !== null
    }
    
    if (success) {
      // 保存成功，关闭表单并重新加载列表
      setShowForm(false)
      setEditingPreset(null)
      await loadPresets()
    }
  }
  
  // 处理取消
  const handleCancel = () => {
    setShowForm(false)
    setEditingPreset(null)
  }
  
  // 获取现有预设名称列表（用于验证重名）
  const existingNames = presets
    .filter(p => !editingPreset || p.id !== editingPreset.id)
    .map(p => p.name)
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-[600px] flex-col">
        <DialogHeader>
          <DialogTitle>{t("ai.systemPromptManagement")}</DialogTitle>
          <DialogDescription>
            创建和管理系统提示词预设，用于引导 AI 的行为和响应风格
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          {showForm ? (
            // 显示表单
            <PromptForm
              preset={editingPreset}
              existingNames={existingNames}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            // 显示列表
            <div className="space-y-4">
              {/* 新增按钮 */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  共 {presets.length} 个预设
                </p>
                <Button
                  onClick={handleAddNew}
                  size="sm"
                  disabled={isLoading}
                >
                  <Plus className="mr-1 size-4" />
                  新增预设
                </Button>
              </div>
              
              {/* 错误提示 */}
              {error && (
                <div className="rounded-lg border border-danger/30 bg-danger/10 p-3">
                  <p className="text-sm text-danger">
                    {error}
                  </p>
                </div>
              )}
              
              {/* 加载状态 */}
              {isLoading && (
                <div className="flex justify-center py-8">
                  <div className="size-8 animate-spin rounded-full border-b-2 border-primary"></div>
                </div>
              )}
              
              {/* 预设列表 */}
              {!isLoading && (
                <PromptList
                  presets={presets}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
})

PromptManagementDialog.displayName = 'PromptManagementDialog'
