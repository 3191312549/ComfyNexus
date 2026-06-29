/**
 * 系统提示词预设列表组件
 * 
 * 显示所有系统提示词预设，支持编辑和删除操作
 * 
 * 验证需求：4.1, 4.7, 4.8, 5.1, 5.2, 5.3, 5.4, 5.5
 */

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Edit2, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '../ui/Button'
import {
  Dialog,
  DialogContent,
} from '../ui/dialog'
import type { SystemPromptPreset } from '../../stores/useSystemPromptStore'

interface PromptListProps {
  presets: SystemPromptPreset[]
  onEdit: (preset: SystemPromptPreset) => void
  onDelete: (presetId: string) => void
  className?: string
}

export const PromptList: React.FC<PromptListProps> = React.memo(({
  presets,
  onEdit,
  onDelete,
  className = ''
}) => {
  const { t } = useTranslation()
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [presetToDelete, setPresetToDelete] = useState<SystemPromptPreset | null>(null)
  
  // 处理删除按钮点击
  const handleDeleteClick = (preset: SystemPromptPreset) => {
    setPresetToDelete(preset)
    setDeleteConfirmOpen(true)
  }
  
  // 确认删除
  const handleConfirmDelete = () => {
    if (presetToDelete) {
      onDelete(presetToDelete.id)
    }
    setDeleteConfirmOpen(false)
    setPresetToDelete(null)
  }
  
  // 取消删除
  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false)
    setPresetToDelete(null)
  }
  
  // 如果没有预设，显示空状态
  if (presets.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <p className="text-sm text-muted-foreground">
          {t('ai.noPromptPreset')}
        </p>
        <p className="mt-2 text-xs text-muted-foreground/60">
          {t('ai.clickCreatePreset')}
        </p>
      </div>
    )
  }
  
  return (
    <>
      <div className={`space-y-2 ${className}`}>
        {presets.map((preset) => (
          <div
            key={preset.id}
            className="group flex items-start gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:bg-muted"
            style={{ minHeight: '60px' }}
          >
            {/* 预设信息 */}
            <div className="min-w-0 flex-1">
              <h4 className="mb-1 text-sm font-medium text-foreground">
                {preset.name}
              </h4>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {preset.content}
              </p>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(preset)}
                title={t("common.title.editPreset")}
                className="size-8"
              >
                <Edit2 className="size-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteClick(preset)}
                title={t("common.title.deletePreset")}
                className="size-8 text-danger hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      
      {/* 删除确认对话框 */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md overflow-hidden rounded-lg bg-surface p-0 shadow-xl">
          {/* 标题栏 */}
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-danger/10">
              <AlertTriangle className="size-4 text-danger" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              确认删除
            </h2>
          </div>
          
          {/* 内容区域 */}
          <div className="space-y-3 px-4 py-3">
            <div className="text-sm leading-relaxed text-muted-foreground">
              <p className="mb-1.5">
                确定要删除预设 <span className="font-medium text-foreground">"{presetToDelete?.name}"</span> 吗？
              </p>
              <p className="text-danger">
                此操作无法撤销。
              </p>
            </div>
            
            {/* 按钮区域 */}
            <div className="flex justify-end gap-2.5 pt-1">
              <Button
                variant="outline"
                onClick={handleCancelDelete}
                className="px-4 py-1.5"
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5"
              >
                删除
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
})

PromptList.displayName = 'PromptList'
