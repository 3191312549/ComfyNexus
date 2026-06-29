import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Minimize2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface CloseConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClose: (dontAskAgain: boolean) => void
  onMinimize: (dontAskAgain: boolean) => void
}

export function CloseConfirmDialog({
  open,
  onOpenChange,
  onClose,
  onMinimize,
}: CloseConfirmDialogProps) {
  const { t } = useTranslation()
  const [dontAskAgain, setDontAskAgain] = useState(false)

  useEffect(() => {
    if (open) {
      setDontAskAgain(false)
    }
  }, [open])

  const handleCloseApp = () => {
    console.log('[CloseConfirmDialog] handleCloseApp called, dontAskAgain:', dontAskAgain)
    onOpenChange(false)
    console.log('[CloseConfirmDialog] onOpenChange(false) called, onClose next')
    onClose(dontAskAgain)
    console.log('[CloseConfirmDialog] onClose called')
  }

  const handleMinimizeToTray = () => {
    onOpenChange(false)
    onMinimize(dontAskAgain)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg font-semibold">
            {t('titleBar.window.closeConfirmTitle')}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t('titleBar.window.closeConfirmDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4 space-y-3">
          <button
            onClick={handleMinimizeToTray}
            className={cn(
              "w-full group flex items-center gap-4 p-4 rounded-lg",
              "border border-border bg-surface hover:bg-surface-active",
              "transition-all duration-200 cursor-pointer"
            )}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand/10 group-hover:bg-brand/20 transition-colors">
              <Minimize2 className="size-5 text-brand" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-foreground">
                {t('titleBar.window.minimizeToTray')}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {t('titleBar.window.minimizeToTrayHint')}
              </div>
            </div>
          </button>

          <button
            onClick={handleCloseApp}
            className={cn(
              "w-full group flex items-center gap-4 p-4 rounded-lg",
              "border border-danger/30 bg-danger/5 hover:bg-danger/10",
              "transition-all duration-200 cursor-pointer"
            )}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-danger/10 group-hover:bg-danger/20 transition-colors">
              <X className="size-5 text-danger" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-danger">
                {t('titleBar.window.closeAppAction')}
              </div>
              <div className="text-xs text-danger/70 mt-0.5">
                {t('titleBar.window.closeAppHint')}
              </div>
            </div>
          </button>
        </div>

        <div className="px-6 py-4 bg-muted/30 border-t border-border">
          <Label className="flex cursor-pointer items-center gap-2.5 select-none">
            <Checkbox
              checked={dontAskAgain}
              onCheckedChange={(checked) => setDontAskAgain(checked === true)}
            />
            <span className="text-sm text-muted-foreground">
              {t('titleBar.window.dontShowAgainHint')}
            </span>
          </Label>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CloseConfirmDialog