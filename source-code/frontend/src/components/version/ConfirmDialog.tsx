/**
 * 版本切换确认对话框组件
 */

import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/components/common'
import { VersionInfo } from '@/types/version'

interface VersionConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentVersion: VersionInfo | null
  targetVersion: VersionInfo | null
  onConfirm: () => void
}

export function VersionConfirmDialog({
  open,
  onOpenChange,
  currentVersion,
  targetVersion,
  onConfirm,
}: VersionConfirmDialogProps) {
  const { t } = useTranslation()

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('version.confirmSwitch')}
      description={t('version.confirmSwitchMessage')}
      confirmText={t('common.confirm')}
      cancelText={t('common.cancel')}
      onConfirm={onConfirm}
      variant="default"
    >
      {/* 版本信息 */}
      <div className="space-y-3 py-4">
        {currentVersion && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t('version.from')}:
            </span>
            <span className="font-mono text-sm font-medium">
              {currentVersion.tag || currentVersion.id}
            </span>
          </div>
        )}

        {targetVersion && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t('version.to')}:
            </span>
            <span className="font-mono text-sm font-medium">
              {targetVersion.tag || targetVersion.id}
            </span>
          </div>
        )}

        {/* 操作步骤 */}
        <div className="mt-4 rounded-md bg-muted p-3">
          <p className="mb-2 text-sm font-medium">
            {t('version.switchSteps')}
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>{t('version.step1')}</li>
            <li>{t('version.step2')}</li>
            <li>{t('version.step3')}</li>
          </ul>
        </div>
      </div>
    </ConfirmDialog>
  )
}

export default VersionConfirmDialog
