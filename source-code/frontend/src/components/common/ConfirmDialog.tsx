/**
 * 确认对话框组件
 * 
 * 用于确认操作的对话框
 * 支持自定义标题、内容、确认按钮文本
 * 支持危险操作警告样式和输入确认文本
 * 支持详细信息展示
 * 支持 children 注入自定义内容
 */

import { useState, useEffect, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'

export interface ConfirmDialogDetails {
  packageName?: string
  version?: string
  source?: string
}

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmText?: ReactNode
  cancelText?: string
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  variant?: 'default' | 'destructive' | 'warning'
  requireTextConfirm?: boolean
  confirmKeyword?: string
  details?: ConfirmDialogDetails
  showDontAskAgain?: boolean
  dontAskAgain?: boolean
  onDontAskAgainChange?: (checked: boolean) => void
  children?: ReactNode
  loading?: boolean
  maxWidth?: string
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  variant = 'default',
  requireTextConfirm = false,
  confirmKeyword = '确认',
  details,
  showDontAskAgain = false,
  dontAskAgain = false,
  onDontAskAgainChange,
  children,
  loading = false,
  maxWidth = 'sm:max-w-[600px]'
}: ConfirmDialogProps) {
  const { t } = useTranslation()
  const [inputValue, setInputValue] = useState('')
  const [localDontAskAgain, setLocalDontAskAgain] = useState(dontAskAgain)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  useEffect(() => {
    if (open) {
      setInputValue('')
      setLocalDontAskAgain(dontAskAgain)
    }
  }, [open, dontAskAgain])

  const isConfirmEnabled = !requireTextConfirm || inputValue === confirmKeyword

  const handleConfirm = async () => {
    if (isConfirmEnabled && !loading) {
      try {
        await onConfirm()
        onOpenChange(false)
      } catch (error) {
        console.error('[ConfirmDialog] onConfirm error:', error)
      }
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
    onOpenChange(false)
  }

  const handleDontAskAgainChange = (checked: boolean) => {
    setLocalDontAskAgain(checked)
    onDontAskAgainChange?.(checked)
  }

  const getIcon = () => {
    switch (variant) {
      case 'destructive':
        return <AlertTriangle className="size-5 text-danger" />
      case 'warning':
        return <AlertCircle className="size-5 text-warning" />
      default:
        return null
    }
  }

  const handleOpenChange = (v: boolean) => {
    if (!v && loading) {
      setShowCloseConfirm(true)
      return
    }
    onOpenChange(v)
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={maxWidth}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            <span>{title}</span>
          </DialogTitle>
          {description && (
            <DialogDescription className="whitespace-pre-wrap break-words text-left">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {details && (
          <div className="mb-4 space-y-2 rounded-lg border border-border bg-muted/50 px-4 py-3">
            {details.packageName && (
              <div className="flex items-center gap-2 text-sm">
                <span className="w-16 shrink-0 text-content-muted">{t("dependency.packageName")}:</span>
                <span className="break-all font-mono font-medium text-content-primary">{details.packageName}</span>
              </div>
            )}
            {details.version && (
              <div className="flex items-center gap-2 text-sm">
                <span className="w-16 text-content-muted">{t("dependency.version")}:</span>
                <span className="font-mono text-content-primary">{details.version}</span>
              </div>
            )}
            {details.source && (
              <div className="flex items-center gap-2 text-sm">
                <span className="w-16 text-content-muted">{t("dependency.source")}:</span>
                <span className="text-content-primary">{details.source === 'core' ? t('dependency.comfyUICore') : details.source}</span>
              </div>
            )}
          </div>
        )}

        {children}

        {requireTextConfirm && (
          <div className="space-y-2 pt-4">
            <Label htmlFor="confirm-input" className="text-sm">
              {t("common.confirmInputPrompt", { value: confirmKeyword })}
            </Label>
            <Input
              id="confirm-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t("common.placeholder.confirmKeyword", { keyword: confirmKeyword })}
              className="font-mono"
              disabled={loading}
            />
          </div>
        )}

        {showDontAskAgain && (
          <label className="mt-4 flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={localDontAskAgain}
              onCheckedChange={(checked) => handleDontAskAgainChange(checked === true)}
              disabled={loading}
            />
            <span className="text-sm text-muted-foreground">{t("common.dontShowAgain")}</span>
          </label>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            {cancelText || t('common.cancel')}
          </Button>
          <Button
            variant={variant === 'warning' ? 'default' : variant}
            onClick={handleConfirm}
            disabled={!isConfirmEnabled || loading}
          >
            {loading ? t('common.processing') : (confirmText || t('common.confirm'))}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('common.confirmClose')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('common.operationInProgressCloseWarning')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.continueWaiting')}</AlertDialogCancel>
          <AlertDialogAction onClick={() => { setShowCloseConfirm(false); onOpenChange(false) }}>
            {t('common.confirmClose')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}

export default ConfirmDialog
