/**
 * Git 权限问题帮助对话框
 * 
 * 解释权限问题的原因和解决方法
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useTranslation } from 'react-i18next'

interface GitPermissionHelpDialogProps {
  open: boolean
  onClose: () => void
}

export function GitPermissionHelpDialog({
  open,
  onClose,
}: GitPermissionHelpDialogProps) {
  const { t } = useTranslation()

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent 
        className="max-h-[80vh] max-w-2xl overflow-y-auto" 
        closeOnOverlayClick={true}
        onOverlayClick={onClose}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{t("plugin.gitPermission.aboutTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('plugin.gitPermission.aboutDesc')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* 帮助内容 */}
        <div className="space-y-4 py-4">
          {/* 问题原因 */}
          <section>
            <h3 className="mb-2 text-base font-semibold text-foreground">
              🔍 {t('plugin.gitPermission.whyPermissionIssue')}
            </h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>{t("plugin.gitPermission.ownershipIssue")}</p>
              <ul className="ml-2 list-inside list-disc space-y-1">
                <li>{t("plugin.gitPermission.osReinstall")}</li>
                <li>{t("plugin.gitPermission.switchUser")}</li>
                <li>{t("plugin.gitPermission.copyFromOther")}</li>
                <li>{t("plugin.gitPermission.adminToUser")}</li>
              </ul>
            </div>
          </section>

          {/* 问题表现 */}
          <section>
            <h3 className="mb-2 text-base font-semibold text-foreground">
              ⚠️ {t('plugin.gitPermission.permissionSymptoms')}
            </h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>{t("plugin.gitPermission.permissionIssue")}</p>
              <ul className="ml-2 list-inside list-disc space-y-1">
                <li>{t('plugin.gitPermission.cannotGetGithubInfo')}</li>
                <li>{t("plugin.gitPermission.cannotUpdate")}</li>
                <li>{t("plugin.gitPermission.cannotSwitchBranch")}</li>
                <li>{t('plugin.gitPermission.gitUnsafeRepo')}</li>
              </ul>
            </div>
          </section>

          {/* 修复原理 */}
          <section>
            <h3 className="mb-2 text-base font-semibold text-foreground">
              🔧 {t('plugin.gitPermission.howFixWorks')}
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                {t('plugin.gitPermission.gitSecurityDesc')}
              </p>
              <p>
                {t('plugin.gitPermission.fixMechanism')}
              </p>
              <div className="rounded-md bg-muted p-3 font-mono text-xs">
                git config --global --add safe.directory &lt;{t('plugin.gitPermission.pluginPath')}&gt;
              </div>
            </div>
          </section>

          {/* 安全性说明 */}
          <section>
            <h3 className="mb-2 text-base font-semibold text-foreground">
              🛡️ {t('plugin.gitPermission.isItSafe')}
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>{t("plugin.gitPermission.isSafe")}</strong>{t('plugin.gitPermission.fixOnlyWill')}
              </p>
              <ul className="ml-2 list-inside list-disc space-y-1">
                <li>{t('plugin.gitPermission.modifyGitGlobalConfig')}</li>
                <li>{t("plugin.gitPermission.addPluginPath")}</li>
                <li>{t("plugin.gitPermission.noModify")}</li>
                <li>{t("plugin.gitPermission.noAffectOther")}</li>
              </ul>
              <p className="mt-2">
                {t('plugin.gitPermission.officialSolution')}
              </p>
            </div>
          </section>

          {/* 注意事项 */}
          <section className="border-info bg-info/10 rounded border-l-4 p-3">
            <h3 className="text-info mb-1 text-sm font-semibold">
              💡 {t('plugin.gitPermission.tip')}
            </h3>
            <p className="text-muted-foreground text-sm">
              {t('plugin.gitPermission.oneTimeFix')}
            </p>
          </section>
        </div>

        {/* 关闭按钮 */}
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>
            {t('plugin.gitPermission.gotIt')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
