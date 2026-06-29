/**
 * UpdateCard 组件
 * 
 * 展示插件的更新信息（提交日志），提供确认更新或切换版本功能
 * 显示更新进度和结果
 * 支持两种模式：
 * 1. 更新模式（has_update=true）：显示待更新的提交，按钮为"确定更新"
 * 2. 切换版本模式（has_update=false）：显示历史提交，按钮为"查看历史"
 * 
 * 验证需求: 6.1, 6.2, 6.4, 6.5（更新卡片）
 */

import React, { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next';
import { usePluginUpdate } from '@/hooks/usePluginUpdate';
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
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { CheckCircle2, AlertCircle, GitCommit, Calendar, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PluginInfo, CommitInfo } from '@/types/plugin';
import { PluginConfirmDialog } from './ConfirmDialog';
import { switchPluginVersion } from '@/services/versionApi';

/**
 * UpdateCard 组件属性
 */
export interface UpdateCardProps {
  /** 插件数据 */
  plugin: PluginInfo;
  /** 关闭回调 */
  onClose: () => void;
  /** 更新完成回调 - 传入更新后的插件信息进行局部更新 */
  onUpdateComplete: (updatedPlugin?: PluginInfo) => void;
  /** 开始更新回调 - 点击确定更新时触发，由父组件打开进度弹窗 */
  onStartUpdate?: (pluginName: string) => void;
  /** 开始切换版本回调 - 点击确认切换时触发，由父组件打开进度弹窗 */
  onStartSwitch?: (pluginName: string, commitHash: string, commitDate: string, behindCommits: number) => void;
}

/**
 * UpdateCard 组件
 */
export const UpdateCard: React.FC<UpdateCardProps> = ({
  plugin,
  onClose,
  onUpdateComplete,
  onStartUpdate,
  onStartSwitch,
}) => {
  const { t } = useTranslation()
  // 使用 usePluginUpdate Hook 管理更新数据
  const {
    commits,
    loading,
    updating,
    error,
    loadUpdateInfo,
    updatePlugin,
    clearUpdateInfo,
  } = usePluginUpdate();

  // 本地状态：更新结果
  const [updateSuccess, _setUpdateSuccess] = useState<boolean | null>(null);
  const [updateMessage, _setUpdateMessage] = useState<string>('');

  // 本地状态：版本切换
  const [switching, setSwitching] = useState<boolean>(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [switchSuccess, setSwitchSuccess] = useState<boolean | null>(null);
  const [switchMessage, setSwitchMessage] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [targetCommit, setTargetCommit] = useState<CommitInfo | null>(null);

  /**
   * 组件挂载时加载更新信息
   */
  useEffect(() => {
    loadUpdateInfo(plugin.name);
  }, [plugin.name, loadUpdateInfo]);

  /**
   * 组件卸载时清除更新信息和重置状态
   */
  useEffect(() => {
    return () => {
      clearUpdateInfo();
      // 重置版本切换状态
      setSwitching(false);
      setSwitchSuccess(null);
      setSwitchMessage('');
      setShowConfirmDialog(false);
      setTargetCommit(null);
    };
  }, [clearUpdateInfo]);

  /**
   * 处理确认更新
   * 验证需求: 6.3（点击确定，执行 Git pull 更新插件）
   */
  const handleUpdate = async (force: boolean = false) => {
    if (onStartUpdate && !force) {
      onStartUpdate(plugin.name);
      onClose();
      return;
    }
    if (force && onStartUpdate) {
      onStartUpdate(plugin.name);
      onClose();
      return;
    }

    const result = await updatePlugin(plugin.name, force);

    if (result) {
      if (result.success) {
        setTimeout(() => {
          onUpdateComplete(result.plugin);
        }, 1500);
      }
    }
  };

  /**
   * 检查错误是否为本地修改冲突
   */
  const isLocalChangesError = (errorMessage: string): boolean => {
    const keywords = [
      // 未合并文件 (rebase/merge 中断后残留)
      'unmerged files',
      'your index file is unmerged',
      // 本地修改会被覆盖
      'would be overwritten by merge',
      'would be overwritten',
      'Your local changes to the following files would be overwritten',
      'your local changes would be overwritten',
      // 未跟踪文件冲突
      'untracked working tree files would be overwritten',
      'untracked working tree files would be removed',
      'Untracked working tree file',
      'untracked files in way',
      // 未暂存/未提交的更改
      'unstaged changes',
      'uncommitted changes',
      'local changes',
      'working tree',
      'Please commit your changes or stash them',
      'Please move or remove',
      // 之前的 merge/rebase/cherry-pick 未完成
      'You have not concluded your merge',
      'MERGE_HEAD exists',
      'CHERRY_PICK_HEAD exists',
      'rebase is already in progress',
      'cherry-pick is already in progress',
      'revert is already in progress',
      'git rebase --abort',
      'git merge --abort',
      'git cherry-pick --abort',
      // stash 应用冲突
      'local changes are stashed, however applying them resulted in conflicts',
      'cannot apply a stash in the middle of a merge',
      // 合并冲突
      'Automatic merge failed',
      'Merge with strategy',
      // 中文提示
      '被合并时覆盖',
      '未跟踪的工作树文件',
    ];
    return keywords.some(keyword => errorMessage.toLowerCase().includes(keyword.toLowerCase()));
  };

  /**
   * 处理强制更新
   */
  const handleForceUpdate = async () => {
    await handleUpdate(true);
  };

  /**
   * 处理切换版本按钮点击
   * 显示确认对话框
   * 验证需求: 3.1, 3.2
   */
  const handleSwitchVersion = useCallback((commit: CommitInfo) => {
    setTargetCommit(commit);
    setShowConfirmDialog(true);
  }, []);

  /**
   * 确认切换版本
   * 执行版本切换操作
   * 验证需求: 2.1, 2.2, 2.3, 2.4, 2.5, 3.4
   */
  const confirmSwitchVersion = useCallback(async () => {
    if (!targetCommit) return;

    if (onStartSwitch) {
      const targetIndex = commits.findIndex(c => c.hash === targetCommit.hash);
      const behindCommits = targetIndex >= 0 ? targetIndex : 0;
      onStartSwitch(plugin.name, targetCommit.hash, targetCommit.date, behindCommits);
      setShowConfirmDialog(false);
      onClose();
      return;
    }

    setSwitchSuccess(null);
    setSwitchMessage('');
    setSwitching(true);

    try {
      const targetIndex = commits.findIndex(c => c.hash === targetCommit.hash);
      const behindCommits = targetIndex >= 0 ? targetIndex : 0;

      console.log('[UpdateCard] 切换版本:', {
        targetHash: targetCommit.hash,
        targetIndex,
        behindCommits,
        totalCommits: commits.length
      });

      const result = await switchPluginVersion(
        plugin.name, 
        targetCommit.hash, 
        targetCommit.date,
        behindCommits
      );

      console.log('[UpdateCard] 切换版本结果:', result);
      console.log('[UpdateCard] 返回的插件信息:', result.plugin);

      setSwitchSuccess(result.success);
      setSwitchMessage(result.message);

      if (result.success) {
        setTimeout(() => {
          console.log('[UpdateCard] 调用 onUpdateComplete，传入插件:', result.plugin);
          onUpdateComplete(result.plugin);
          setShowConfirmDialog(false);
        }, 1500);
      } else {
        setSwitching(false);
        setShowConfirmDialog(false);
      }
    } catch (error) {
      console.error(t('plugin.update.switchFailed'), error);
      setSwitchSuccess(false);
      setSwitchMessage(`${t('plugin.update.switchFailed')}: ${error}`);
      setSwitching(false);
      setShowConfirmDialog(false);
    }
  }, [targetCommit, plugin.name, onUpdateComplete, commits, t, onStartSwitch, onClose]);

  /**
   * 取消切换版本
   * 关闭确认对话框并保持当前状态不变
   * 验证需求: 3.3
   */
  const cancelSwitchVersion = useCallback(() => {
    setShowConfirmDialog(false);
    setTargetCommit(null);
  }, []);

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const isUpdateMode = plugin.has_update;
  const hasRemoteUrl = plugin.git_url && plugin.git_url.trim() !== '';
  const modalTitle = isUpdateMode ? t('plugin.update.cardTitle', { name: plugin.name }) : t('plugin.update.historyTitle', { name: plugin.name });
  const modalDescription = isUpdateMode ? t('plugin.update.viewCommitsDesc') : t('plugin.update.viewHistoryDesc');

  const handleOpenChange = (open: boolean) => {
    if (!open && (updating || switching)) {
      setShowCloseConfirm(true)
      return
    }
    if (!open) onClose()
  }

  return (
    <>
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>{modalDescription}</DialogDescription>
        </DialogHeader>
      {/* 版本信息 */}
      <div className="mb-6 rounded-lg border border-border bg-muted/50 p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* 当前版本 */}
          <div>
            <div className="mb-1 text-sm text-muted-foreground">
              {t('plugin.update.currentVersion')}
            </div>
            <div className="flex items-center gap-2">
              <Hash className="size-4 text-muted-foreground" />
              <code className="rounded bg-background px-2 py-1 font-mono text-sm">
                {plugin.commit_hash || 'unknown'}
              </code>
            </div>
          </div>

          {/* 最新版本 */}
          <div>
            <div className="mb-1 text-sm text-muted-foreground">
              {t('plugin.update.latestVersion')}
            </div>
            <div className="flex items-center gap-2">
              <Hash className="size-4 text-muted-foreground" />
              <code className="rounded bg-background px-2 py-1 font-mono text-sm">
                {commits.length > 0 ? commits[0].hash : plugin.commit_hash || 'unknown'}
              </code>
            </div>
          </div>
        </div>

        {/* 落后提交数 */}
        {plugin.behind_commits > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <Badge variant="secondary" className="bg-info/10 text-info">
              {t('plugin.update.behindCommitsBadge', { count: plugin.behind_commits })}
            </Badge>
          </div>
        )}
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loading size="md" text={t('plugin.update.loadingInfo')} />
        </div>
      )}

      {/* 错误状态 */}
      {error && !loading && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 text-destructive" />
            <div className="flex-1">
              <h4 className="mb-1 font-semibold text-destructive">{t("plugin.update.loadFailed")}</h4>
              <p className="text-sm text-muted-foreground">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 提交日志列表 */}
      {!loading && !error && commits.length === 0 && (
        <div className="py-12 text-center">
          <GitCommit className="mx-auto mb-3 size-12 text-muted-foreground" />
          <p className="text-muted-foreground">
            {isUpdateMode ? t('plugin.update.noUpdates') : t('plugin.update.noHistory')}
          </p>
        </div>
      )}

      {!loading && !error && commits.length > 0 && (
        <div className="max-h-96 space-y-3 overflow-y-auto">
          <h4 className="mb-2 text-sm font-semibold text-foreground">
            {isUpdateMode ? t('plugin.update.updateContent', { count: commits.length }) : t('plugin.update.historyCommits', { count: commits.length })}
          </h4>
          {commits.map((commit, index) => {
            // 判断是否为当前版本
            const isCurrentVersion = commit.hash === plugin.commit_hash;
            
            return (
              <div
                key={`${commit.hash}-${index}`}
                className={cn(
                  'rounded-lg border p-4 transition-colors',
                  'border-border bg-card bg-muted',
                  'hover:bg-accent/50'
                )}
              >
                {/* 提交哈希 */}
                <div className="mb-2 flex items-center gap-2">
                  <GitCommit className="size-4 text-muted-foreground" />
                  <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
                    {commit.hash}
                  </code>
                  {/* 标记最新提交 */}
                  {index === 0 && (
                    <Badge variant="secondary" className="bg-info/10 text-xs text-info">
                      {t('plugin.update.latest')}
                    </Badge>
                  )}
                  {/* 标记当前版本 */}
                  {isCurrentVersion && (
                    <Badge variant="secondary" className="bg-success/10 text-xs text-success">
                      {t('plugin.update.currentVersionBadge')}
                    </Badge>
                  )}
                </div>

                {/* 提交信息 */}
                <p className="mb-2 text-sm leading-relaxed text-foreground">
                  {commit.message}
                </p>

                {/* 提交时间和切换按钮 */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="size-3" />
                    {formatDate(commit.date)}
                  </div>

                  {/* 显示切换版本按钮（更新模式和历史模式都显示） */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSwitchVersion(commit)}
                    disabled={isCurrentVersion || switching || !hasRemoteUrl}
                    title={
                      isCurrentVersion
                        ? t('plugin.update.isCurrentVersion')
                        : !hasRemoteUrl
                          ? t('plugin.row.cannotSwitchNoRemote')
                          : t('plugin.update.switchToThisVersion')
                    }
                    aria-label={t("common.aria.switchToVersion", { hash: commit.hash })}
                  >
                    {isCurrentVersion ? t('plugin.update.currentVersionBadge') : t('plugin.update.switchToThisVersion')}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 更新进度和结果 */}
      {updating && (
        <div className="mt-6 rounded-lg border border-border bg-muted/50 p-4">
          <div className="flex items-center gap-3">
            <Loading size="sm" />
            <span className="text-sm text-foreground">
              {t('plugin.update.updatingPlugin')}
            </span>
          </div>
        </div>
      )}

      {/* 版本切换进度 */}
      {switching && (
        <div className="mt-6 rounded-lg border border-border bg-muted/50 p-4">
          <div className="flex items-center gap-3">
            <Loading size="sm" />
            <span className="text-sm text-foreground">
              {t('plugin.update.switchingVersion')}
            </span>
          </div>
        </div>
      )}

      {/* 更新成功提示 */}
      {updateSuccess === true && (
        <div className="mt-6 rounded-lg border border-success/50 bg-success/10 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 text-success" />
            <div className="flex-1">
              <h4 className="mb-1 font-semibold text-success">
                {t('plugin.update.updateSuccess')}
              </h4>
              <p className="text-sm text-success/80">
                {updateMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 版本切换成功提示 */}
      {switchSuccess === true && (
        <div className="mt-6 rounded-lg border border-success/50 bg-success/10 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 text-success" />
            <div className="flex-1">
              <h4 className="mb-1 font-semibold text-success">
                {t('plugin.update.switchSuccess')}
              </h4>
              <p className="text-sm text-success/80">
                {switchMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 更新失败提示 */}
      {updateSuccess === false && (
        <div className="mt-6 rounded-lg border border-destructive bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 text-destructive" />
            <div className="flex-1">
              <h4 className="mb-1 font-semibold text-destructive">{t("plugin.update.updateFailed")}</h4>
              
              {/* 检查是否为本地修改冲突 */}
              {isLocalChangesError(updateMessage) ? (
                <>
                  <p className="mb-3 text-sm text-muted-foreground">
                    {t('plugin.update.localChangesWarning')}
                  </p>
                  <div className="mb-3 rounded bg-muted/50 p-3">
                    <p className="mb-2 text-xs text-muted-foreground">
                      <strong>{t("plugin.update.youCanChoose")}:</strong>
                    </p>
                    <ul className="ml-4 list-disc space-y-1 text-xs text-muted-foreground">
                      <li>{t("plugin.update.clickForceUpdate")}<strong className="text-destructive">{t("plugin.update.discardChanges")}</strong>{t("plugin.update.andUpdate")}</li>
                      <li>{t("plugin.update.cancelAndBackup")}</li>
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleForceUpdate}
                      disabled={updating}
                    >
                      {updating ? (
                        <>
                          <Loading size="sm" className="mr-2" />
                          {t('plugin.update.forceUpdating')}
                        </>
                      ) : (
                        t('plugin.update.forceUpdateWithWarning')
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {updateMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 版本切换失败提示 */}
      {switchSuccess === false && (
        <div className="mt-6 rounded-lg border border-destructive bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 text-destructive" />
            <div className="flex-1">
              <h4 className="mb-1 font-semibold text-destructive">{t("plugin.update.switchFailed")}</h4>
              <p className="text-sm text-muted-foreground">
                {switchMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 底部按钮 */}
      <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
        <Button 
          variant="outline" 
          onClick={() => handleOpenChange(false)} 
          disabled={updating || switching}
        >
          {isUpdateMode ? t('common.cancel') : t('common.close')}
        </Button>
        {isUpdateMode && (
          <Button
            onClick={() => handleUpdate(false)}
            disabled={updating || switching || loading || commits.length === 0 || updateSuccess === true}
          >
            {updating ? (
              <>
                <Loading size="sm" className="mr-2" />
                {t('plugin.update.updating')}
              </>
            ) : updateSuccess === true ? (
              t('plugin.update.updated')
            ) : (
              t('plugin.update.confirmUpdate')
            )}
          </Button>
        )}
      </div>

      {/* 版本切换确认对话框 */}
      {targetCommit && (
        <PluginConfirmDialog
          open={showConfirmDialog}
          onClose={cancelSwitchVersion}
          onConfirm={confirmSwitchVersion}
          commit={targetCommit}
          loading={switching}
        />
      )}
    </DialogContent>
    </Dialog>
    <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('plugin.update.closeWarningTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('plugin.update.closeWarningDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.continueWaiting')}</AlertDialogCancel>
          <AlertDialogAction onClick={() => { setShowCloseConfirm(false); onClose() }}>
            {t('common.confirmClose')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

/**
 * 默认导出
 */
export default UpdateCard;
