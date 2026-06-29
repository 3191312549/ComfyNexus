import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Button } from '@/components/ui/Button'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface FixConflictDialogProps {
  open: boolean
  onClose: () => void
  onReanalyze: () => void
  packageName: string
  status: 'fixing' | 'success' | 'error'
  message?: string
}

export function FixConflictDialog({
  open,
  onClose,
  onReanalyze,
  packageName,
  status,
  message
}: FixConflictDialogProps) {
  const { t } = useTranslation()
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const handleClose = () => {
    onClose()
  }

  const handleReanalyze = () => {
    onClose()
    onReanalyze()
  }

  const handleOpenChange = (open: boolean) => {
    if (!open && status === 'fixing') {
      setShowCloseConfirm(true)
      return
    }
    if (!open) onClose()
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("common.title.fixDependencyConflict")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center py-6">
            {status === 'fixing' && (
              <>
                <Loader2 className="text-primary mb-4 size-12 animate-spin" />
                <p className="text-lg font-medium">{t("dependency.fixingConflicts")}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('common.packageName')}: {packageName}
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle2 className="text-success mb-4 size-12" />
                <p className="text-success text-lg font-medium">
                  {t('common.fixSuccess')}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {packageName} {t('common.fixedSuccess')}
                </p>
                {message && (
                  <p className="mt-2 text-center text-sm text-muted-foreground">
                    {message}
                  </p>
                )}
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="text-danger mb-4 size-12" />
                <p className="text-danger text-lg font-medium">
                  {t('common.fixFailed')}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {packageName} {t('common.fixFailed')}
                </p>
                {message && (
                  <p className="text-danger mt-2 text-center text-sm">
                    {message}
                  </p>
                )}
              </>
            )}
          </div>

          {status !== 'fixing' && (
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                variant="outline"
                onClick={handleClose}
              >
                {t('common.close')}
              </Button>
              {status === 'success' && (
                <Button
                  onClick={handleReanalyze}
                >
                  {t('dependency.reanalyze')}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('dependency.fixCloseWarningTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('dependency.fixCloseWarningDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.continueWaiting')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => { setShowCloseConfirm(false); onClose() }}
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            {t('common.forceClose')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
