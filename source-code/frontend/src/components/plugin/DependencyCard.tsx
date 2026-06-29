/**
 * DependencyCard 组件
 * 
 * 展示插件的依赖列表，提供依赖安装功能
 * 管理依赖安装状态
 * 
 * 验证需求: 3.1, 3.2, 3.3, 3.4, 3.7（依赖卡片）
 */

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next';
import { useDependencies } from '@/hooks/useDependencies';
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
import { Loading } from '@/components/ui/Loading';
import { Badge } from '@/components/ui/Badge';
import { AlertCircle, Package, CheckCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * DependencyCard 组件属性
 */
export interface DependencyCardProps {
  /** 插件名称 */
  pluginName: string;
  /** 关闭回调 */
  onClose: () => void;
}

/**
 * DependencyCard 组件
 */
export const DependencyCard: React.FC<DependencyCardProps> = ({
  pluginName,
  onClose,
}) => {
  const { t } = useTranslation()
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const {
    dependencies,
    loading,
    installing,
    error,
    installResult,
    loadDependencies,
    installDependency,
    clearDependencies,
    openLogFile,
  } = useDependencies();

  // 获取显示用的插件名（去除 .disabled 后缀）
  const displayName = pluginName.endsWith('.disabled') 
    ? pluginName.replace(/\.disabled$/, '') 
    : pluginName;

  /**
   * 组件挂载时加载依赖列表
   * 注意：后端的 get_plugin_dependencies API 会自动标记依赖为已查看
   */
  useEffect(() => {
    // 加载依赖列表（从缓存立即读取，后端会自动标记为已查看）
    loadDependencies(pluginName);
  }, [pluginName, loadDependencies]);

  /**
   * 组件卸载时清除依赖列表
   */
  useEffect(() => {
    return () => {
      clearDependencies();
    };
  }, [clearDependencies]);

  /**
   * 处理关闭
   * 验证需求: 3.7（用户查看依赖后，清除依赖更新提示）
   * 注意：后端在打开时已自动标记为已查看，关闭时无需再次刷新
   */
  const handleClose = () => {
    // 直接关闭卡片，无需刷新列表
    // 因为后端在 loadDependencies 时已经标记为已查看
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && installing) {
      setShowCloseConfirm(true)
      return
    }
    if (!open) handleClose()
  }

  /**
   * 处理安装依赖
   * 验证需求: 3.5（后台安装，保存日志）
   */
  const handleInstall = async (pkg: string, version: string) => {
    const success = await installDependency(pluginName, pkg, version);
    
    if (success) {
      console.log('[DependencyCard] 依赖安装成功', { pkg, version });
    } else {
      console.error('[DependencyCard] 依赖安装失败', { pkg, version });
    }
  };

  /**
   * 处理查看日志
   */
  const handleViewLog = () => {
    if (installResult?.logFile) {
      openLogFile(installResult.logFile);
    }
  };

  return (
    <>
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("common.title.dependencyList", { name: displayName })}</DialogTitle>
          <DialogDescription>{t("plugin.viewDependencyDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 加载状态 */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loading size="md" text={t('plugin.loadingDependencyList')} />
            </div>
          )}

          {/* 错误状态 */}
          {error && !loading && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 size-5 text-destructive" />
                <div className="flex-1">
                  <h4 className="mb-1 font-semibold text-destructive">{t("plugin.dependency.loadFailed")}</h4>
                  <p className="text-sm text-muted-foreground">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 安装结果提示 */}
          {installResult && !loading && (
            <div className={cn(
              "rounded-lg border p-4 mb-4",
              installResult.success 
                ? "border-success/50 bg-success/10" 
                : "border-destructive bg-destructive/10"
            )}>
              <div className="flex items-start gap-3">
                {installResult.success ? (
                  <CheckCircle className="text-success mt-0.5 size-5" />
                ) : (
                  <AlertCircle className="mt-0.5 size-5 text-destructive" />
                )}
                <div className="flex-1">
                  <h4 className={cn(
                    "font-semibold mb-1",
                    installResult.success 
                      ? "text-success" 
                      : "text-destructive"
                  )}>
                    {installResult.success ? t('plugin.installSuccess') : t('plugin.installFailed')}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {installResult.message}
                  </p>
                  
                  {!installResult.success && installResult.logFile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleViewLog}
                      className="mt-3"
                    >
                      <FileText className="mr-2 size-4" />
                      {t('plugin.viewDetailedLog')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 依赖列表 */}
          {!loading && !error && dependencies.length === 0 && (
            <div className="py-12 text-center">
              <Package className="mx-auto mb-3 size-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                {t('plugin.noDependencies')}
              </p>
            </div>
          )}

          {!loading && !error && dependencies.length > 0 && (
            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-2">
              {dependencies.map((dep, index) => (
                <div
                  key={`${dep.package}-${index}`}
                  className={cn(
                    'rounded-lg border p-4 transition-colors',
                    'border-border bg-card',
                    'hover:bg-accent/50',
                    dep.environment_marker && !dep.marker_match && 'opacity-60'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* 依赖信息 */}
                    <div className="min-w-0 flex-1">
                      {/* 包名和状态徽章 */}
                      <div className="mb-2 flex items-center gap-2">
                        <h4 className="break-all text-base font-semibold">
                          {dep.package}
                        </h4>
                        
                        {/* 状态徽章 */}
                        {dep.installed && dep.version_match && (
                          <Badge 
                            variant="outline" 
                            className="border-success/30 bg-success/10 text-success h-5 px-1.5 py-0 text-xs"
                          >
                            ✓ {t('plugin.installed')}
                          </Badge>
                        )}
                        
                        {dep.installed && !dep.version_match && (
                          <Badge 
                            variant="outline" 
                            className="border-warning/30 bg-warning/10 text-warning h-5 px-1.5 py-0 text-xs"
                          >
                            ⚠ {t('plugin.versionMismatch')}
                          </Badge>
                        )}
                        
                        {/* 环境标记不匹配提示 */}
                        {dep.environment_marker && !dep.marker_match && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <AlertCircle className="size-3.5" />
                            <span>{t("plugin.dependency.notRequired")}</span>
                          </div>
                        )}
                      </div>

                      {/* 版本信息 - 并排显示 */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {t('plugin.requiredVersion')}:
                          </span>
                          <code className="rounded bg-muted px-2 py-0.5 text-foreground">
                            {dep.version}
                          </code>
                        </div>

                        {dep.installed && dep.installed_version && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              {t('plugin.installedVersion')}:
                            </span>
                            <code className="rounded bg-muted px-2 py-0.5 text-foreground">
                              {dep.installed_version}
                            </code>
                          </div>
                        )}
                      </div>
                      
                      {/* 环境标记详情 */}
                      {dep.environment_marker && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          <span className="font-medium">{t("plugin.dependency.envRequirement")}:</span> {dep.environment_marker}
                        </div>
                      )}
                    </div>

                    {/* 安装按钮 */}
                    <div className="shrink-0">
                      {dep.installed && dep.version_match ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="min-w-[80px]"
                        >
                          {t('plugin.installed')}
                        </Button>
                      ) : dep.environment_marker && !dep.marker_match ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="min-w-[80px]"
                          title={t("common.title.notRequiredForEnv")}
                        >
                          {t('plugin.notRequired')}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleInstall(dep.package, dep.version)}
                          disabled={installing === dep.package}
                          className="min-w-[80px]"
                        >
                          {installing === dep.package ? (
                            <>
                              <Loading size="sm" className="mr-2" />
                              {t('plugin.installing')}
                            </>
                          ) : (
                            t('common.install')
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 底部按钮 */}
          <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={handleClose}>
              {t('common.close')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('plugin.dependency.closeWarningTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('plugin.dependency.closeWarningDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.continueWaiting')}</AlertDialogCancel>
          <AlertDialogAction onClick={() => { setShowCloseConfirm(false); handleClose() }}>
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
export default DependencyCard;
