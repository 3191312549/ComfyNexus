/**
 * 删除环境确认对话框组件
 */

import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'

export interface DeleteConfirmDialogProps {
  alias: string
  onConfirm: () => void
  onCancel: () => void
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  alias,
  onConfirm,
  onCancel
}) => {
  const { t } = useTranslation()

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('env.deleteEnvTitle')}</DialogTitle>
        </DialogHeader>

        <p className="text-muted-foreground mb-3">
          {t('env.deleteEnvConfirm', { alias })}
        </p>

        <div className="border-warning bg-warning/10 mb-6 rounded border-l-4 p-3">
          <p className="text-warning text-sm">
            {t('env.deleteEnvWarning')}
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t('common.delete')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
