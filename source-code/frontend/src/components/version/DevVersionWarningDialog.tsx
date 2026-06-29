/**
 * 开发版警告弹窗组件
 * 
 * 当用户切换到开发版标签页时显示警告
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertTriangle } from 'lucide-react'

interface DevVersionWarningDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDontShowAgain: (dontShow: boolean) => void
}

export function DevVersionWarningDialog({
  open,
  onOpenChange,
  onDontShowAgain,
}: DevVersionWarningDialogProps) {
  const { t } = useTranslation()
  const [dontShowAgain, setDontShowAgain] = useState(false)

  const handleConfirm = () => {
    if (dontShowAgain) {
      onDontShowAgain(true)
    }
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="size-5" />
            {t('version.devWarningTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 text-left">
            <p>{t('version.devWarningMessage')}</p>
            <ul className="space-y-1 text-sm">
              <li>{t('version.devWarningRisk1')}</li>
              <li>{t('version.devWarningRisk2')}</li>
              <li>{t('version.devWarningRisk3')}</li>
            </ul>
            <p className="text-sm font-medium text-warning">
              {t('version.devWarningNote')}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-3 sm:flex-col">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <label
              htmlFor="dont-show-again"
              className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {t('version.dontShowAgain')}
            </label>
          </div>
          <AlertDialogAction onClick={handleConfirm} className="w-full">
            {t('version.iKnow')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
