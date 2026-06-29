/**
 * PluginRow 组件
 * 
 * 展示单个插件的信息，提供插件操作入口
 * 管理插件行的交互状态
 * 支持逐步填充显示（基础信息立即显示，Git信息和依赖信息逐步加载）
 * 
 * 验证需求: 1.2, 1.3, 1.4, 10.1（插件信息展示）
 */

import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next';
import { PluginInfo } from '@/types/plugin';
import { pluginAPI } from '@/services/PluginAPIService';
import { Switch } from '@/components/ui/Switch';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Trash2, Github, Loader2, Pencil, ArrowDownCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { DependencyBadge } from './DependencyBadge';
import { DependencyCard } from './DependencyCard';
import { UpdateCard } from './UpdateCard';
import { BranchSelector } from './BranchSelector';
import { GitErrorPopover } from './GitErrorPopover';
import { PluginUpdateProgressDialog } from './PluginUpdateProgressDialog';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

/**
 * PluginRow 组件属性
 */
export interface PluginRowProps {
  /** 插件数据 */
  plugin: PluginInfo;
  /** 刷新回调（用于更新后刷新列表） */
  onRefresh: () => void;
  /** 更新单个插件回调（局部更新） */
  onUpdate: (plugin: PluginInfo) => void;
  /** 移除单个插件回调（用于卸载） */
  onRemove: (pluginName: string) => void;
  /** 单插件 Git 信息重试回调 */
  onRetrySingle: (pluginName: string) => void;
  /** 插件备注（由父组件传入，避免每个插件单独请求） */
  note?: string | null;
  /** 备注变更回调 */
  onNoteChange?: (pluginId: string, note: string) => void;
}

/**
 * PluginRow 组件
 */
export const PluginRow: React.FC<PluginRowProps> = ({ plugin, onRefresh, onUpdate, onRemove, onRetrySingle, note, onNoteChange }) => {
  const { t } = useTranslation()
  const [showDependency, setShowDependency] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [showUpdateProgress, setShowUpdateProgress] = useState(false);
  const [updateProgressPluginName, setUpdateProgressPluginName] = useState('');
  const [showBranches, setShowBranches] = useState(false);
  const [showUninstallDialog, setShowUninstallDialog] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);
  const [toggling, setToggling] = useState(false);

  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [editingNote, setEditingNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipText, setTooltipText] = useState('');
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showSwitchProgress, setShowSwitchProgress] = useState(false);
  const [switchProgressPluginName, setSwitchProgressPluginName] = useState('');
  const [switchCommitHash, setSwitchCommitHash] = useState('');
  const [switchCommitDate, setSwitchCommitDate] = useState('');
  const [switchBehindCommits, setSwitchBehindCommits] = useState(0);

  const [retryingGitInfo, setRetryingGitInfo] = useState(false);

  const { success, error: showError } = useToast();
  
  const isEnabled = !plugin.name.endsWith('.disabled');
  const actualPluginName = isEnabled ? plugin.name : plugin.name.replace(/\.disabled$/, '');

  const hasGitError = plugin.git_fetch_error && plugin.git_fetch_error !== '';
  const hasCommitHash = plugin.commit_hash && plugin.commit_hash !== '' && plugin.commit_hash !== '-';
  const isGitInfoLoading = plugin.is_git_repo && !hasGitError && !hasCommitHash;

  // 当插件信息更新后（重试成功或失败），清除 loading 状态
  useEffect(() => {
    if (retryingGitInfo && (hasCommitHash || hasGitError)) {
      setRetryingGitInfo(false);
    }
  }, [plugin.commit_hash, plugin.git_fetch_error, retryingGitInfo, hasCommitHash, hasGitError]);

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  const formatDateTime = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr;
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
      console.error('[PluginRow] 日期格式化失败', error);
      return dateStr;
    }
  };

  const handleOpenFolder = async () => {
    try {
      const result = await pluginAPI.openPluginFolder(plugin.name);
      if (!result.success) {
        console.error('[PluginRow] 打开文件夹失败', result.error);
      }
    } catch (error) {
      console.error('[PluginRow] 打开文件夹异常', error);
    }
  };

  const handleOpenNoteDialog = () => {
    setEditingNote(note || '');
    setShowNoteDialog(true);
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      const result = await pluginAPI.savePluginNote(actualPluginName, editingNote);
      if (result.success) {
        success(t('plugin.row.noteSaveSuccess'));
        onNoteChange?.(actualPluginName, editingNote);
        setShowNoteDialog(false);
      } else {
        showError(result.message || t('plugin.row.noteSaveFailed'));
      }
    } catch (error) {
      console.error('[PluginRow] 保存备注异常', error);
      showError(t('plugin.row.noteSaveFailed'));
    } finally {
      setSavingNote(false);
    }
  };

  const handleCancelNote = () => {
    setShowNoteDialog(false);
  };

  const handlePluginNameMouseEnter = (e: React.MouseEvent) => {
    if (!note) return;
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    let x = rect.left;
    let y = rect.bottom + 6;
    if (y + 100 > viewportHeight) {
      y = rect.top - 6;
    }
    if (x + 320 > viewportWidth) {
      x = Math.max(8, viewportWidth - 328);
    }
    const pos = { x, y };
    tooltipTimeoutRef.current = setTimeout(() => {
      setTooltipPos(pos);
      setTooltipText(note);
      setTooltipVisible(true);
    }, 300);
  };

  const handlePluginNameMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    setTooltipVisible(false);
  };

  const handleOpenDependencies = () => {
    setShowDependency(true);
  };

  const handleCloseDependency = () => {
    setShowDependency(false);
    const updatedPlugin: PluginInfo = {
      ...plugin,
      dependency_viewed: true,
      dependency_updated: false,
    };
    onUpdate(updatedPlugin);
  };

  const handleUpdate = () => {
    setShowUpdate(true);
  };

  const handleUpdateComplete = (updatedPlugin?: PluginInfo) => {
    setShowUpdate(false);
    if (updatedPlugin) {
      onUpdate(updatedPlugin);
    } else {
      onRefresh();
    }
  };

  const handleStartUpdate = (pluginName: string) => {
    setUpdateProgressPluginName(pluginName);
    setShowUpdateProgress(true);
  };

  const handleStartSwitch = (pluginName: string, commitHash: string, commitDate: string, behindCommits: number) => {
    setSwitchProgressPluginName(pluginName);
    setSwitchCommitHash(commitHash);
    setSwitchCommitDate(commitDate);
    setSwitchBehindCommits(behindCommits);
    setShowSwitchProgress(true);
  };

  const handleSwitchBranch = () => {
    setShowBranches(true);
  };

  const handleBranchChanged = (updatedPlugin?: PluginInfo) => {
    setShowBranches(false);
    if (updatedPlugin) {
      onUpdate(updatedPlugin);
    } else {
      onRefresh();
    }
  };

  const handleUninstallClick = () => {
    setShowUninstallDialog(true);
  };

  const handleConfirmUninstall = async () => {
    setUninstalling(true);
    setShowUninstallDialog(false);

    try {
      const result = await pluginAPI.uninstallPlugin(plugin.name);
      if (result.success) {
        success(t('plugin.row.uninstallSuccess', { name: actualPluginName }));
        onRemove(plugin.name);
      } else {
        showError(result.error || t('plugin.row.uninstallFailed'));
      }
    } catch (error) {
      console.error('[PluginRow] 插件卸载异常', error);
      showError(t('plugin.row.uninstallError'));
    } finally {
      setUninstalling(false);
    }
  };

  const handleRetryGitInfo = () => {
    setRetryingGitInfo(true);
    onRetrySingle(plugin.name);
    // loading 状态会在插件信息更新后自动消失（因为 git_fetch_error 被清除）
    // 设置一个超时保底，防止后端无响应时一直 loading
    setTimeout(() => setRetryingGitInfo(false), 30000);
  };

  const handleSetRemoteUrl = async (url: string): Promise<boolean> => {
    try {
      const result = await pluginAPI.setPluginRemoteUrl(plugin.name, url);
      if (result.success) {
        success(t('plugin.row.remoteUrlSetSuccess'));
        return true;
      } else {
        showError(result.error || t('plugin.row.remoteUrlSetFailed'));
        return false;
      }
    } catch (error) {
      console.error('[PluginRow] 设置远端地址异常', error);
      showError(t('plugin.row.remoteUrlSetError'));
      return false;
    }
  };

  const handleCancelUninstall = () => {
    setShowUninstallDialog(false);
  };

  const handleToggleEnabled = async (checked: boolean) => {
    setToggling(true);
    
    try {
      const result = await pluginAPI.togglePluginEnabled(actualPluginName, checked);
      
      if (result.success) {
        success(checked ? t('plugin.row.enabledSuccess', { name: actualPluginName }) : t('plugin.row.disabledSuccess', { name: actualPluginName }));
        
        if (result.plugin) {
          onUpdate(result.plugin);
        } else {
          onRefresh();
        }
      } else {
        showError(result.error || t('plugin.row.toggleFailed'));
      }
    } catch (error) {
      console.error('[PluginRow] 插件状态切换异常', error);
      showError(t('plugin.row.toggleError'));
    } finally {
      setToggling(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-[60px_1fr_80px_120px_110px_150px_220px] gap-4 px-6 py-3.5 items-center",
          "border-b border-border",
          "transition-colors hover:bg-muted/50",
          plugin.has_update && "bg-gradient-to-r from-primary/10 to-transparent border-l-4 border-l-primary pl-5",
          !isEnabled && "opacity-60"
        )}
      >
        {/* 启用开关 */}
        <div className="flex items-center justify-center">
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggleEnabled}
            disabled={toggling}
          />
        </div>
        
        {/* 插件名 */}
        <div
          className="flex min-w-0 items-center justify-start gap-2 font-semibold text-content-primary"
          onMouseEnter={note ? handlePluginNameMouseEnter : undefined}
          onMouseLeave={note ? handlePluginNameMouseLeave : undefined}
        >
          <Button
            onClick={handleOpenNoteDialog}
            variant="ghost"
            size="icon"
            className={cn(
              "size-6 shrink-0 p-0",
              note
                ? "text-primary hover:bg-primary/10"
                : "text-content-muted hover:bg-muted hover:text-content-primary"
            )}
            title={t('plugin.row.editNote')}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            onClick={handleOpenFolder}
            variant="link"
            className="h-auto w-full justify-start truncate p-0 text-left text-content-primary hover:text-primary"
          >
            {actualPluginName}
          </Button>
        </div>

        {/* 分支 */}
        <div className="text-center text-content-secondary">
          {isGitInfoLoading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="size-3 animate-spin text-content-muted" />
            </div>
          ) : plugin.branch ? (
            <Button
              onClick={handleSwitchBranch}
              variant="link"
              className="h-auto p-0 text-primary hover:underline"
            >
              {plugin.branch}
            </Button>
          ) : (
            <span className="text-content-muted">-</span>
          )}
        </div>

        {/* 版本/状态 */}
        <div className="flex flex-col items-center gap-1 text-center">
          {retryingGitInfo ? (
            <div className="flex items-center gap-2">
              <Loader2 className="size-3 animate-spin text-primary" />
            </div>
          ) : isGitInfoLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="size-3 animate-spin text-content-muted" />
            </div>
          ) : plugin.git_fetch_error ? (
            <div className="flex flex-col items-center gap-1">
              <GitErrorPopover
                errorType={plugin.git_fetch_error_type as 'remote' | 'timeout' | 'permission' | 'network' | 'unknown'}
                errorMessage={plugin.git_fetch_error}
                errorDetail={plugin.git_fetch_error_detail || ''}
                pluginName={actualPluginName}
                causes={(() => {
                  try {
                    return plugin.git_fetch_error_causes 
                      ? JSON.parse(plugin.git_fetch_error_causes) 
                      : undefined;
                  } catch (error) {
                    console.error('[PluginRow] 解析 git_fetch_error_causes 失败', error);
                    return undefined;
                  }
                })()}
                solutions={(() => {
                  try {
                    return plugin.git_fetch_error_solutions 
                      ? JSON.parse(plugin.git_fetch_error_solutions) 
                      : undefined;
                  } catch (error) {
                    console.error('[PluginRow] 解析 git_fetch_error_solutions 失败', error);
                    return undefined;
                  }
                })()}
                onRetry={handleRetryGitInfo}
                onSetRemoteUrl={handleSetRemoteUrl}
              />
            </div>
          ) : (
            <>
              <code className="font-mono text-xs font-semibold text-content-primary">
                {plugin.commit_hash || '-'}
              </code>
              {plugin.is_git_repo && plugin.has_update && plugin.behind_commits > 0 && (
                <span className="flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  <ArrowDownCircle className="size-3" />
                  {t('plugin.row.behindCommits', { count: plugin.behind_commits })}
                </span>
              )}
            </>
          )}
        </div>

        {/* 安装日期 */}
        <div className="text-center font-mono text-sm text-content-secondary">
          {plugin.install_date ? (
            (() => {
              try {
                const date = new Date(plugin.install_date);
                if (isNaN(date.getTime())) {
                  return '-';
                }
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
              } catch (error) {
                console.error('[PluginRow] 安装日期格式化失败', error);
                return '-';
              }
            })()
          ) : (
            '-'
          )}
        </div>

        {/* 更新时间 */}
        <div className="text-center font-mono text-sm text-content-secondary">
          {isGitInfoLoading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="size-3 animate-spin" />
            </div>
          ) : (
            formatDateTime(plugin.commit_date)
          )}
        </div>

        {/* 操作 */}
        <div className="flex items-center justify-end gap-1.5">
          <div className="relative">
            <Button
              onClick={handleOpenDependencies}
              variant="ghost"
              size="sm"
              className="h-7 w-14"
            >
              {t('plugin.row.dependencies')}
            </Button>
            <DependencyBadge
              show={plugin.dependency_updated && !plugin.dependency_viewed}
            />
          </div>

          {plugin.has_update ? (
            <Button
              onClick={handleUpdate}
              variant="outline"
              size="sm"
              className="h-7 w-14 border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
            >
              {t('plugin.row.update')}
            </Button>
          ) : (
            <Button
              onClick={handleUpdate}
              variant="ghost"
              size="sm"
              className="h-7 w-14"
              disabled={!plugin.git_url || plugin.git_url.trim() === ''}
              title={!plugin.git_url || plugin.git_url.trim() === '' ? t('plugin.row.cannotSwitchNoRemote') : undefined}
            >
              {t('plugin.row.switch')}
            </Button>
          )}

          <div className="mx-0.5 h-3.5 w-px bg-border" />

          <Button
            onClick={handleUninstallClick}
            disabled={uninstalling}
            variant="ghost"
            size="icon"
            className="size-7 text-content-muted hover:bg-danger/10 hover:text-danger disabled:opacity-50"
            title={t("common.title.uninstall")}
          >
            <Trash2 className="size-4" />
          </Button>

          {plugin.git_url ? (
            <a
              href={plugin.git_url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "w-7 h-7 rounded-md transition-all flex items-center justify-center",
                "bg-transparent text-content-muted",
                "hover:bg-muted hover:text-content-primary"
              )}
              title={plugin.git_url}
            >
              <Github className="size-4" />
            </a>
          ) : (
            <span className="flex size-7 items-center justify-center rounded-md text-content-muted">
              <Github className="size-4 opacity-30" />
            </span>
          )}
        </div>
      </div>

      {/* 备注编辑弹窗 */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('plugin.row.noteDialogTitle', { name: actualPluginName })}</DialogTitle>
            <DialogDescription>{t('plugin.row.noteDialogDesc')}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={editingNote}
            onChange={(e) => setEditingNote(e.target.value)}
            placeholder={t('plugin.row.notePlaceholder')}
            className="min-h-[120px] resize-y"
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelNote}
              disabled={savingNote}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSaveNote}
              disabled={savingNote}
            >
              {savingNote ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 备注Tooltip */}
      {tooltipVisible && tooltipText && (
        <div
          className="animate-in fade-in-0 zoom-in-95 fixed z-[100000] max-w-xs rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md duration-100"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
          }}
        >
          <p className="whitespace-pre-wrap break-words">{tooltipText}</p>
        </div>
      )}

      {/* 依赖卡片 */}
      {showDependency && (
        <DependencyCard
          pluginName={plugin.name}
          onClose={handleCloseDependency}
        />
      )}

      {/* 更新卡片 */}
      {showUpdate && (
        <UpdateCard
          plugin={plugin}
          onClose={() => setShowUpdate(false)}
          onUpdateComplete={handleUpdateComplete}
          onStartUpdate={handleStartUpdate}
          onStartSwitch={handleStartSwitch}
        />
      )}

      {/* 分支选择器 */}
      {showBranches && (
        <BranchSelector
          pluginName={plugin.name}
          currentBranch={plugin.branch || ''}
          onClose={() => setShowBranches(false)}
          onBranchChanged={handleBranchChanged}
        />
      )}

      {/* 卸载确认对话框 */}
      <AlertDialog open={showUninstallDialog} onOpenChange={setShowUninstallDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-danger">
              <Trash2 className="size-5" />
              {t('plugin.row.uninstallConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left">
              <p>
                {t('plugin.row.uninstallConfirmDesc', { name: actualPluginName })}
              </p>
              <p className="font-medium text-danger">
                {t('plugin.row.uninstallWarning')}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelUninstall}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUninstall}
              className="bg-danger text-primary-foreground hover:bg-danger/90"
            >
              {t('plugin.row.uninstallConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PluginUpdateProgressDialog
        open={showUpdateProgress}
        onOpenChange={setShowUpdateProgress}
        pluginName={updateProgressPluginName}
        mode="update"
        onComplete={(result) => {
          if (result.success) {
            setShowUpdateProgress(false);
            if (result.plugin) {
              onUpdate(result.plugin);
            } else {
              onRefresh();
            }
          }
        }}
      />

      <PluginUpdateProgressDialog
        open={showSwitchProgress}
        onOpenChange={setShowSwitchProgress}
        pluginName={switchProgressPluginName}
        mode="switch"
        commitHash={switchCommitHash}
        commitDate={switchCommitDate}
        behindCommits={switchBehindCommits}
        onComplete={(result) => {
          if (result.success) {
            setShowSwitchProgress(false);
            if (result.plugin) {
              onUpdate(result.plugin);
            } else {
              onRefresh();
            }
          }
        }}
      />
    </>
  );
};

/**
 * 默认导出
 */
export default PluginRow;
