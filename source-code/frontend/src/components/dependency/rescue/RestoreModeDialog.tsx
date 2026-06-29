/**
 * 恢复模式选择对话框
 *
 * 提供四种恢复模式：智能回滚、仅依赖、仅插件、全部。
 * 根据快照 backupOption 禁用不可用选项。
 * 选择直接恢复模式时显示二次确认警告。
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { useRescueStore } from '@/stores/useRescueStore'
import type { SnapshotInfo, RestoreMode } from '@/types/rescue'
import DiffDialog from './DiffDialog'

interface Props {
  snapshot: SnapshotInfo
  open: boolean
  onClose: () => void
}

interface RestoreOption {
  value: 'smart' | RestoreMode
  label: string
  description: string
}

export default function RestoreModeDialog({ snapshot, open, onClose }: Props) {
  const { t } = useTranslation()
  const { checkProcess, restoring } = useRescueStore()

  const ALL_OPTIONS: RestoreOption[] = [
    { value: 'smart', label: t('rescue.restoreMode.smart'), description: t('rescue.restoreMode.smartDesc') },
    { value: 'deps_only', label: t('rescue.restoreMode.depsOnly'), description: t('rescue.restoreMode.depsOnlyDesc') },
    { value: 'plugins_only', label: t('rescue.restoreMode.pluginsOnly'), description: t('rescue.restoreMode.pluginsOnlyDesc') },
    { value: 'all', label: t('rescue.restoreMode.all'), description: t('rescue.restoreMode.allDesc') },
  ]

  const [selected, setSelected] = useState<'smart' | RestoreMode>(
    snapshot.backupOption === 'all' ? 'smart' : snapshot.backupOption
  )
  const [showConfirm, setShowConfirm] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [showProcessWarn, setShowProcessWarn] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const isDisabled = (opt: 'smart' | RestoreMode): boolean => {
    const bo = snapshot.backupOption
    if (opt === 'smart') return bo !== 'all'
    if (bo === 'deps_only' && (opt === 'plugins_only' || opt === 'all')) return true
    if (bo === 'plugins_only' && (opt === 'deps_only' || opt === 'all')) return true
    return false
  }

  const handleConfirm = async () => {
    const running = await checkProcess()
    if (running) {
      setShowProcessWarn(true)
      return
    }
    proceed()
  }

  const proceed = () => {
    if (selected === 'smart') {
      setShowDiff(true)
    } else {
      setShowConfirm(true)
    }
  }

  const handleOpenChange = (v: boolean) => {
    if (!v && restoring) {
      setShowCloseConfirm(true)
      return
    }
    if (!v) onClose()
  }

  return (
    <>
      <Dialog open={open && !showDiff} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("common.title.selectRestoreMode")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {ALL_OPTIONS.map((opt) => {
              const disabled = isDisabled(opt.value)
              return (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                    disabled
                      ? 'cursor-not-allowed border-border opacity-40'
                      : selected === opt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => !disabled && setSelected(opt.value)}
                >
                  <div className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${selected === opt.value ? 'border-primary' : 'border-muted-foreground'}`}>
                    {selected === opt.value && <div className="size-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-content-primary">
                      {opt.label}
                    </div>
                    <div className="text-xs text-content-secondary">
                      {opt.description}
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button onClick={handleConfirm} disabled={restoring}>
              {restoring ? t('rescue.restoring') : t('rescue.snapshot.nextStep')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ {t('rescue.snapshot.confirmDirectRestore')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('rescue.snapshot.confirmDirectRestoreDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowConfirm(false)
                const { executeDirectRestore } = useRescueStore.getState()
                await executeDirectRestore(snapshot.filePath, selected as RestoreMode)
                onClose()
              }}
            >
              {t('rescue.snapshot.confirmRestore')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showProcessWarn} onOpenChange={setShowProcessWarn}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('rescue.snapshot.comfyuiRunning')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('rescue.snapshot.comfyuiRunningDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={proceed}>{t("rescue.continueRestore")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('rescue.closeWarningTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('rescue.restoreCloseWarningDescription')}
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

      {showDiff && (
        <DiffDialog
          snapshot={snapshot}
          open={showDiff}
          onClose={() => {
            setShowDiff(false)
            onClose()
          }}
        />
      )}
    </>
  )
}
