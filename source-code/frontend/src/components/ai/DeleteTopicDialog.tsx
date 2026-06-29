/**
 * 删除话题确认对话框
 * 
 * 功能：
 * - 统一样式的删除确认对话框
 * - 支持"本次会话不再提示"选项
 * - 替代原生 confirm 弹窗
 */

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertTriangle } from 'lucide-react'

interface DeleteTopicDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  topicName?: string
}

/**
 * 删除话题确认对话框组件
 */
export const DeleteTopicDialog: React.FC<DeleteTopicDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  topicName
}) => {
  const { t } = useTranslation()
  const [dontShowAgain, setDontShowAgain] = useState(false)
  
  /**
   * 处理确认删除
   */
  const handleConfirm = () => {
    // 如果勾选了"不再提示"，保存到 sessionStorage
    if (dontShowAgain) {
      sessionStorage.setItem('hideDeleteTopicConfirm', 'true')
    }
    
    onConfirm()
    onOpenChange(false)
  }
  
  /**
   * 处理取消
   */
  const handleCancel = () => {
    setDontShowAgain(false)
    onOpenChange(false)
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden rounded-lg bg-surface p-0 shadow-xl">
        {/* 标题栏 - 顶部 */}
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-danger/10">
            <AlertTriangle className="size-4 text-danger" />
          </div>
          <h2 className="text-base font-semibold text-foreground">
            {t('aiAssistant.deleteTopic.title')}
          </h2>
        </div>
        
        {/* 内容区域 */}
        <div className="space-y-3 px-4 py-3">
          {/* 描述文本 */}
          <div className="text-sm leading-relaxed text-muted-foreground">
            <p className="mb-1.5">
              {t('aiAssistant.deleteTopic.confirmMessage', { name: topicName || t('aiAssistant.deleteTopic.defaultName') })}
            </p>
            <p className="text-danger">
              {t('aiAssistant.deleteTopic.permanentWarning')}
            </p>
          </div>
          
          {/* 不再提示选项 */}
          <div className="flex items-center gap-2 rounded-lg bg-muted px-2.5 py-2">
            <Checkbox
              id="dontShowAgain"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <label
              htmlFor="dontShowAgain"
              className="cursor-pointer select-none text-sm text-muted-foreground"
            >
              {t('common.dontShowAgain')}
            </label>
          </div>
          
          {/* 按钮区域 */}
          <div className="flex justify-end gap-2.5 pt-1">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="px-4 py-1.5"
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              className="px-4 py-1.5"
            >
              {t('aiAssistant.deleteTopic.confirm')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
