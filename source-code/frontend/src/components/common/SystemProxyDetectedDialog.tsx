/**
 * 系统代理检测弹窗
 * 当检测到系统有代理设置但应用内未开启时显示
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Wifi } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/utils/toast'

interface SystemProxyDetectedDialogProps {
  open: boolean
  onClose: () => void
  systemProxy: {
    host: string
    port: string
  }
  onConfirm: (dontShowAgain: boolean) => Promise<void>
  onDontShowAgain: () => Promise<void>
}

export function SystemProxyDetectedDialog({
  open,
  onClose,
  systemProxy,
  onConfirm,
  onDontShowAgain,
}: SystemProxyDetectedDialogProps) {
  const { t } = useTranslation()
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm(dontShowAgain)
      toast.success(t('settings.proxySettings.autoEnableSuccess'))
      onClose()
    } catch (error) {
      console.error('[SystemProxyDetectedDialog] 启用代理失败:', error)
      toast.error(t('settings.proxySettings.autoEnableFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (dontShowAgain) {
      await onDontShowAgain()
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="size-5 text-primary" />
            {t('settings.proxySettings.detectedDialogTitle')}
          </DialogTitle>
          <DialogDescription className="whitespace-pre-wrap text-left">
            {t('settings.proxySettings.detectedDialogDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 rounded-lg bg-muted p-3">
          <div className="text-sm">
            <span className="text-muted-foreground">{t('settings.proxySettings.detectedProxy')}:</span>
            <span className="ml-2 font-mono font-medium">
              {systemProxy.host}:{systemProxy.port}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              disabled={loading}
            />
            <span className="text-sm text-muted-foreground">
              {t('settings.proxySettings.dontShowAgainHint')}
            </span>
          </label>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              {t('common.no')}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
            >
              {t('common.yes')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
