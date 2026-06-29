/**
 * 开发版警告对话框组件
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertTriangle } from 'lucide-react'

interface DevWarningDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (dontShowAgain: boolean) => void
}

export function DevWarningDialog({
  open,
  onOpenChange,
  onConfirm,
}: DevWarningDialogProps) {
  const { t } = useTranslation()
  const [dontShowAgain, setDontShowAgain] = useState(false)

  const handleConfirm = () => {
    onConfirm(dontShowAgain)
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-warning size-6" />
            <AlertDialogTitle>{t('version.devWarningTitle')}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {t('version.devWarningMessage')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* 风险列表 */}
        <div className="space-y-2 py-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>{t('version.devWarningRisk1')}</li>
            <li>{t('version.devWarningRisk2')}</li>
            <li>{t('version.devWarningRisk3')}</li>
          </ul>

          <div className="bg-warning/10 text-warning mt-4 rounded-md p-3 text-sm">
            {t('version.devWarningNote')}
          </div>
        </div>

        {/* 不再提示选项 */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="dont-show-again"
            checked={dontShowAgain}
            onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
          />
          <label
            htmlFor="dont-show-again"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {t('version.dontShowAgain')}
          </label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            {t('version.iKnow')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
