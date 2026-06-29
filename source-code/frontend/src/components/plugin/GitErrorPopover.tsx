/**
 * GitErrorPopover 组件
 * 
 * 显示 Git 信息获取失败的详细错误信息和解决方案
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ChevronDown, ChevronUp, Copy, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

/**
 * 错误类型定义
 */
export type ErrorType = 
  | 'remote'
  | 'branch'
  | 'commit'
  | 'permission'
  | 'network'
  | 'repository'
  | 'authentication'
  | 'conflict'
  | 'timeout'
  | 'unknown';

/**
 * GitErrorPopover 组件属性
 */
export interface GitErrorPopoverProps {
  /** 错误类型 */
  errorType: ErrorType;
  /** 简短错误描述 */
  errorMessage: string;
  /** 详细错误日志 */
  errorDetail: string;
  /** 插件名称 */
  pluginName: string;
  /** 可能的原因列表（可选，优先使用后端提供的数据） */
  causes?: string[];
  /** 解决方案列表（可选，优先使用后端提供的数据） */
  solutions?: string[];
  /** 重试回调 */
  onRetry?: () => void;
  /** 设置远端地址回调 */
  onSetRemoteUrl?: (url: string) => Promise<boolean>;
}

/**
 * GitErrorPopover 组件
 */
export const GitErrorPopover: React.FC<GitErrorPopoverProps> = ({
  errorType,
  errorMessage,
  errorDetail,
  pluginName,
  causes,
  solutions,
  onRetry,
  onSetRemoteUrl,
}) => {
  const { t } = useTranslation();
  const [showDetail, setShowDetail] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { success, error: showError } = useToast();
  
  const [remoteUrl, setRemoteUrl] = useState('');
  const [isSettingRemote, setIsSettingRemote] = useState(false);
  const [remoteUrlError, setRemoteUrlError] = useState('');

  /**
   * 根据错误类型获取图标颜色
   */
  const getIconColor = () => {
    switch (errorType) {
      case 'remote':
        return 'text-info';
      case 'branch':
        return 'text-primary';
      case 'commit':
        return 'text-success';
      case 'authentication':
        return 'text-warning';
      case 'conflict':
        return 'text-warning';
      case 'timeout':
        return 'text-warning';
      case 'permission':
        return 'text-danger';
      case 'network':
        return 'text-warning';
      case 'repository':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  /**
   * 根据错误类型获取解决方案
   */
  const getSolution = () => {
    // 优先使用后端提供的 causes 和 solutions
    if (causes && causes.length > 0 && solutions && solutions.length > 0) {
      return (
        <div className="space-y-2">
          <p className="text-foreground text-sm">{t("plugin.gitError.possibleCauses")}:</p>
          <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
            {causes.map((cause, index) => (
              <li key={index}>{cause}</li>
            ))}
          </ul>
          <p className="text-foreground mt-2 text-sm">{t("plugin.gitError.suggestedAction")}:</p>
          <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
            {solutions.map((solution, index) => (
              <li key={index}>{solution}</li>
            ))}
          </ul>
        </div>
      );
    }

    // 回退到硬编码的解决方案（向后兼容）
    switch (errorType) {
      case 'timeout':
        return (
          <div className="space-y-2">
            <p className="text-foreground text-sm">{t("plugin.gitError.possibleCauses")}:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>{t("plugin.gitError.networkUnstable")}</li>
              <li>{t("plugin.gitError.remoteSlow")}</li>
            </ul>
            <p className="text-foreground mt-2 text-sm">{t("plugin.gitError.suggestedAction")}:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>{t("plugin.gitError.checkNetwork")}</li>
              <li>{t("plugin.gitError.retryLater")}</li>
              <li>{t('plugin.gitError.configProxyInSettings')}</li>
            </ul>
          </div>
        );
      case 'permission':
        return (
          <div className="space-y-2">
            <p className="text-foreground text-sm">{t("plugin.gitError.possibleCauses")}:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>{t('plugin.gitError.gitRepoCorrupted')}</li>
              <li>{t("plugin.gitError.folderPermission")}</li>
            </ul>
            <p className="text-foreground mt-2 text-sm">{t("plugin.gitError.suggestedAction")}:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>{t("plugin.gitError.clickTopRight")} <strong className="text-foreground">{t('plugin.gitError.gitPermissionFix')}</strong> {t('plugin.gitError.button')}</li>
              <li>{t("plugin.gitError.orRunCommand")}:<code className="bg-muted text-foreground rounded px-1 py-0.5 text-xs">git config --global --add safe.directory [{t('plugin.gitError.pluginPath')}]</code></li>
            </ul>
          </div>
        );
      case 'repository':
        return (
          <div className="space-y-2">
            <p className="text-foreground text-sm">{t("plugin.gitError.possibleCauses")}:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>{t('plugin.gitError.gitRepoCorrupted')}</li>
              <li>{t("plugin.gitError.emptyRepo")}</li>
              <li>{t('plugin.gitError.headRefLost')}</li>
            </ul>
            <p className="text-foreground mt-2 text-sm">{t("plugin.gitError.suggestedAction")}:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>{t("plugin.gitError.tryReclone")}</li>
              <li>{t("plugin.gitError.orRunInFolder")}:<code className="bg-muted text-foreground rounded px-1 py-0.5 text-xs">git fsck</code> {t('plugin.gitError.checkIntegrity')}</li>
              <li>{t("plugin.gitError.needCommit")}</li>
            </ul>
          </div>
        );
      case 'network':
        return (
          <div className="space-y-2">
            <p className="text-foreground text-sm">{t("plugin.gitError.possibleCauses")}:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>{t("plugin.gitError.cannotConnect")}</li>
              <li>{t('plugin.gitError.dnsFailed')}</li>
              <li>{t('plugin.gitError.sslCertIssue')}</li>
            </ul>
            <p className="text-foreground mt-2 text-sm">{t("plugin.gitError.suggestedAction")}:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>{t("plugin.gitError.checkNetwork")}</li>
              <li>{t('plugin.gitError.configProxyInSettings')}</li>
              <li>{t("plugin.gitError.checkFirewall")}</li>
            </ul>
          </div>
        );
      case 'remote':
        return (
          <div className="space-y-2">
            <p className="text-foreground text-sm">{t("plugin.gitError.possibleCauses")}:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>{t("plugin.gitError.noRemote")}</li>
              <li>{t("plugin.gitError.remoteCorrupted")}</li>
            </ul>
            <p className="text-foreground mt-2 text-sm">{t("plugin.gitError.suggestedAction")}:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>{t("plugin.gitError.checkValidRepo")}</li>
              <li>{t("plugin.gitError.reconfigureRemote")}</li>
            </ul>
          </div>
        );
      case 'branch':
        return (
          <div className="space-y-2">
            <p className="text-foreground text-sm">{t("plugin.gitError.possibleCauses")}:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>{t("plugin.gitError.branchNotExist")}</li>
              <li>{t("plugin.gitError.noUpstream")}</li>
              <li>{t("plugin.gitError.detachedHead")}</li>
            </ul>
            <p className="text-foreground mt-2 text-sm">{t("plugin.gitError.suggestedAction")}:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>{t("plugin.gitError.viewBranches")}</li>
              <li>{t("plugin.gitError.configureUpstream")}</li>
            </ul>
          </div>
        );
      case 'commit':
        return (
          <div className="space-y-2">
            <p className="text-foreground text-sm">{t("plugin.gitError.possibleCauses")}:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>{t("plugin.gitError.noCommits")}</li>
              <li>{t("plugin.gitError.commitCorrupted")}</li>
            </ul>
            <p className="text-foreground mt-2 text-sm">{t("plugin.gitError.suggestedAction")}:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>{t("plugin.gitError.checkIntegrity")}</li>
              <li>{t("plugin.gitError.mayNeedReclone")}</li>
            </ul>
          </div>
        );
      case 'authentication':
        return (
          <div className="space-y-2">
            <p className="text-foreground text-sm">{t("plugin.gitError.possibleCauses")}:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>{t("plugin.gitError.authFailed")}</li>
              <li>{t("plugin.gitError.tokenExpired")}</li>
            </ul>
            <p className="text-foreground mt-2 text-sm">{t("plugin.gitError.suggestedAction")}:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>{t("plugin.gitError.checkCredentials")}</li>
              <li>{t("plugin.gitError.useSshOrToken")}</li>
            </ul>
          </div>
        );
      case 'conflict':
        return (
          <div className="space-y-2">
            <p className="text-foreground text-sm">{t("plugin.gitError.possibleCauses")}:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>{t("plugin.gitError.conflictChanges")}</li>
              <li>{t("plugin.gitError.unstagedChanges")}</li>
            </ul>
            <p className="text-foreground mt-2 text-sm">{t("plugin.gitError.suggestedAction")}:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>{t("plugin.gitError.resolveConflict")}</li>
              <li>{t("plugin.gitError.commitOrStage")}</li>
            </ul>
          </div>
        );
      default:
        return (
          <div className="space-y-2">
            <p className="text-foreground text-sm">{t("plugin.gitError.suggestedAction")}:</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
              <li>{t("plugin.gitError.viewDetailLog")}</li>
              <li>{t("plugin.gitError.tryFetch")}</li>
              <li>{t("plugin.gitError.contactSupport")}</li>
            </ul>
          </div>
        );
    }
  };

  /**
   * 复制错误日志
   */
  const handleCopyLog = () => {
    navigator.clipboard.writeText(errorDetail);
    success(t('plugin.gitError.logCopied'));
  };

  /**
   * 验证 Git URL 格式
   */
  const validateGitUrl = (url: string): boolean => {
    if (!url || !url.trim()) return false;
    const patterns = [
      /^https?:\/\/.+\.git$/,
      /^https?:\/\/github\.com\/[^/]+\/[^/]+$/,
      /^https?:\/\/gitlab\.com\/[^/]+\/[^/]+$/,
      /^git@[^:]+:[^/]+\/[^/]+\.git$/,
      /^git:\/\/.+\.git$/,
    ];
    return patterns.some(pattern => pattern.test(url.trim()));
  };

  /**
   * 处理重试
   */
  const handleRetry = async () => {
    if (errorType === 'remote' && remoteUrl.trim() && onSetRemoteUrl) {
      if (!validateGitUrl(remoteUrl)) {
        setRemoteUrlError(t('plugin.gitError.invalidUrlFormat'));
        return;
      }
      
      setIsSettingRemote(true);
      setRemoteUrlError('');
      try {
        const result = await onSetRemoteUrl(remoteUrl.trim());
        if (result) {
          setIsOpen(false);
          onRetry?.();
        }
      } catch (err) {
        showError(t('plugin.gitError.setRemoteUrlFailed'));
      } finally {
        setIsSettingRemote(false);
      }
    } else {
        setIsOpen(false);
        onRetry?.();
      }
  };

  return (
    <>
      {/* 触发按钮 */}
      <Button
        onClick={() => setIsOpen(true)}
        variant="link"
        className={cn(
          'h-auto p-0 inline-flex items-center gap-1 text-sm hover:opacity-80 transition-opacity',
          getIconColor()
        )}
        title={errorMessage}
      >
        <AlertCircle className="size-4" />
        <span className="text-xs">{errorMessage}</span>
      </Button>

      {/* 使用标准 Dialog 组件 */}
      <Dialog open={isOpen} onOpenChange={(open) => !open && setIsOpen(false)}>
        <DialogContent className="max-h-[80vh] max-w-md overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <AlertCircle className={cn('h-5 w-5 mt-0.5 shrink-0', getIconColor())} />
              <div className="flex-1">
                <h4 className="text-foreground text-base font-semibold">{t('plugin.gitError.gitInfoFetchFailed')}</h4>
                <p className="text-muted-foreground mt-1 text-sm">
                  {t('plugin.plugin')}: {pluginName}
                </p>
              </div>
            </div>

            <div className="border-border bg-muted rounded-md border p-3">
              <p className="text-foreground text-sm font-medium">{errorMessage}</p>
            </div>

            <div className="border-border border-t pt-4">
              {getSolution()}
            </div>

            {errorType === 'remote' && onSetRemoteUrl && (
              <div className="border-border border-t pt-4">
                <div className="space-y-2">
                  <label htmlFor="remote-url-input" className="text-foreground text-sm font-medium">
                    {t('plugin.gitError.inputRemoteUrl')}
                  </label>
                  <Input
                    id="remote-url-input"
                    type="text"
                    value={remoteUrl}
                    onChange={(e) => {
                      setRemoteUrl(e.target.value);
                      setRemoteUrlError('');
                    }}
                    placeholder={t('plugin.gitError.inputRemoteUrlPlaceholder')}
                    disabled={isSettingRemote}
                    className={cn(
                      'bg-muted border border-border rounded-md font-mono text-sm',
                      remoteUrlError && 'border-danger focus-visible:ring-danger'
                    )}
                  />
                  {remoteUrlError && (
                    <p className="text-sm text-danger">{remoteUrlError}</p>
                  )}
                </div>
              </div>
            )}

            <div className="border-border border-t pt-4">
              <Button
                onClick={() => setShowDetail(!showDetail)}
                variant="ghost"
                className="text-foreground h-auto w-full justify-start gap-2 p-0 text-sm font-medium transition-colors"
              >
                {showDetail ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
                <span>{t("plugin.gitError.detailedLog")}</span>
              </Button>
              {showDetail && (
                <div className="border-border bg-muted mt-2 max-h-48 overflow-y-auto rounded-md border p-3">
                  <pre className="text-foreground whitespace-pre-wrap break-words font-mono text-xs">
                    {errorDetail}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyLog}
                className="flex-1"
              >
                <Copy className="mr-1 size-3" />
                {t('plugin.gitError.copyLog')}
              </Button>
              {onRetry && (
                <Button
                  size="sm"
                  onClick={handleRetry}
                  disabled={isSettingRemote}
                  className="flex-1"
                >
                  {isSettingRemote ? (
                    <>
                      <Loader2 className="mr-1 size-3 animate-spin" />
                      {t('plugin.gitError.settingRemoteUrl')}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-1 size-3" />
                      {t('plugin.gitError.retry')}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GitErrorPopover;
