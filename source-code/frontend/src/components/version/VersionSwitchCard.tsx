/**
 * VersionSwitchCard 组件
 * 
 * 版本切换进度卡片，显示切换过程的各个阶段和结果
 */

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/Button';
import { VersionInfo } from './VersionInfo';
import { ProgressSteps } from './ProgressSteps';
import { ResultDisplay } from './ResultDisplay';
import type { VersionInfo as VersionInfoType, SwitchProgress } from '@/types/version';

interface VersionSwitchCardProps {
  open: boolean;
  onClose: () => void;
  currentVersion: VersionInfoType;
  targetVersion: VersionInfoType;
  progress: SwitchProgress;
  switching: boolean;
  onConfirm: (force?: boolean) => Promise<void>;
}

export const VersionSwitchCard: React.FC<VersionSwitchCardProps> = ({
  open,
  onClose,
  currentVersion,
  targetVersion,
  progress,
  switching,
  onConfirm,
}) => {
  const { t } = useTranslation()
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const handleViewLog = () => {
    if (progress.logFile && window.pywebview?.api?.open_log_file) {
      window.pywebview.api.open_log_file(progress.logFile);
    }
  };

  const handleClose = () => {
    if (switching && progress.success === null) {
      setShowCloseConfirm(true)
      return
    }
    onClose();
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) handleClose()
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("common.title.versionSwitch")}</DialogTitle>
          <DialogDescription>{t("version.switchCoreVersion")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <VersionInfo current={currentVersion} target={targetVersion} />

          {progress.currentStep !== 'idle' && <ProgressSteps progress={progress} />}

          <ResultDisplay progress={progress} onViewLog={handleViewLog} />
          
          {progress.requiresForce && progress.currentStep === 'idle' && (
            <div className="rounded-lg border-2 border-warning/50 bg-warning/10 p-4">
              <div className="flex items-start gap-3">
                <div className="text-warning-foreground mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-warning text-xs font-bold">
                  !
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-warning">
                    检测到本地修改
                  </p>
                  <p className="text-sm text-warning/80">
                    {t('version.coreDirModified')}
                  </p>
                  <p className="text-sm text-warning/80">
                    {t('version.youCanChoose')}:
                  </p>
                  <ul className="ml-2 list-inside list-disc space-y-1 text-sm text-warning/80">
                    <li>{t('version.clickForceSwitch')}<span className="font-semibold">{t("version.discardChanges")}</span>{t("version.andSwitch")}</li>
                    <li>{t("version.orCancelAndBackup")}</li>
                  </ul>
                  <p className="mt-2 text-xs text-warning/70">
                    ⚠️ {t('version.forceSwitchWarning')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {switching && progress.currentStep !== 'complete' && (
            <div className="rounded-lg border border-info/50 bg-info/10 p-3">
              <p className="text-sm text-info">
                ⚠️ 正在切换版本，请勿关闭窗口
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
          >
            {progress.success === true ? t('common.close') : t('common.cancel')}
          </Button>

          {progress.currentStep === 'idle' && !progress.requiresForce && (
            <Button onClick={() => onConfirm(false)} disabled={switching}>
              {switching ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  切换中
                </>
              ) : (
                '确认切换'
              )}
            </Button>
          )}
          
          {progress.currentStep === 'idle' && progress.requiresForce && (
            <Button 
              onClick={() => onConfirm(true)} 
              disabled={switching}
              variant="destructive"
            >
              {switching ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  强制切换中
                </>
              ) : (
                '强制切换（会丢失修改）'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
    <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('version.closeWarningTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('version.closeWarningDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.continueWaiting')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => { setShowCloseConfirm(false); onClose() }}
            className="bg-danger text-white hover:bg-danger/90"
          >
            {t('common.forceClose')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default VersionSwitchCard;
