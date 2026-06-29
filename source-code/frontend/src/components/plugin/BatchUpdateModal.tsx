/**
 * BatchUpdateModal 组件
 * 
 * 批量更新模态窗口
 * - 展示批量更新进度
 * - 管理并发更新流程
 * - 显示更新结果摘要
 * - 支持二次确认
 * 
 * 验证需求: 2.1, 2.3, 7.1, 7.2, 7.3, 7.6, 7.7（批量更新）
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
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
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw,
  Package,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { pluginAPI } from '@/services/PluginAPIService';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { ConfirmUpdateDialog } from './ConfirmUpdateDialog';
import type { 
  PluginInfo, 
  UpdateProgress, 
  UpdateSummary,
  UpdateResult 
} from '@/types/plugin';

/**
 * BatchUpdateModal 组件属性
 */
export interface BatchUpdateModalProps {
  /** 待更新插件列表 */
  plugins: PluginInfo[];
  /** 关闭回调（仅更新完成后可用） */
  onClose: () => void;
  /** 完成回调 - 传入更新后的插件列表进行局部更新 */
  onComplete: (updatedPlugins: PluginInfo[]) => void;
  /** Git 并发数（可选，默认使用配置值） */
  maxWorkers?: number;
}

/**
 * BatchUpdateModal 组件
 */
export const BatchUpdateModal: React.FC<BatchUpdateModalProps> = ({
  plugins,
  onClose,
  onComplete,
  maxWorkers,
}) => {
  const { t } = useTranslation();
  // 从 settings store 读取 Git 并发数配置
  // 验证需求: 13.5（使用配置的并发数）
  const { systemSettings } = useSettingsStore();
  
  // 状态管理
  const [showConfirm, setShowConfirm] = useState<boolean>(true);  // 是否显示确认对话框
  const [isUpdating, setIsUpdating] = useState<boolean>(false);   // 是否正在更新
  const [updateProgress, setUpdateProgress] = useState<Map<string, UpdateProgress>>(new Map());
  const [completed, setCompleted] = useState<boolean>(false);
  const [summary, setSummary] = useState<UpdateSummary>({
    total: plugins.length,
    success: 0,
    failed: 0,
    dependencies_installed: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState<boolean>(false);

  /**
   * 初始化更新进度
   */
  useEffect(() => {
    const initialProgress = new Map<string, UpdateProgress>();
    
    plugins.forEach(plugin => {
      initialProgress.set(plugin.name, {
        status: 'waiting',
        progress: 0,
        message: t('plugin.batchUpdate.waiting'),
        dependenciesInstalled: 0,
      });
    });
    
    console.log('[BatchUpdateModal] 初始化进度状态', {
      pluginCount: plugins.length,
      pluginNames: Array.from(initialProgress.keys())
    });
    
    setUpdateProgress(initialProgress);
  }, [plugins]);

  /**
   * 更新单个插件的进度
   */
  const updatePluginProgress = useCallback((
    pluginName: string,
    progress: Partial<UpdateProgress>
  ) => {
    setUpdateProgress(prev => {
      const newProgress = new Map(prev);
      const current = newProgress.get(pluginName);
      
      if (current) {
        newProgress.set(pluginName, {
          ...current,
          ...progress,
        });
      } else {
        // 如果插件不在进度 Map 中，记录警告并创建新条目
        console.warn(`[BatchUpdateModal] 插件 ${pluginName} 不在进度 Map 中，创建新条目`);
        newProgress.set(pluginName, {
          status: 'waiting',
          progress: 0,
          message: t('plugin.batchUpdate.waiting'),
          dependenciesInstalled: 0,
          ...progress,
        });
      }
      
      return newProgress;
    });
  }, []);

  /**
   * 执行批量更新
   */
  const executeBatchUpdate = useCallback(async () => {
    try {
      // 设置更新状态
      setIsUpdating(true);
      
      // 日志：记录传入的插件列表
      console.log('[BatchUpdateModal] 开始批量更新', {
        pluginCount: plugins.length,
        pluginNames: plugins.map(p => p.name),
        pluginsWithUpdate: plugins.filter(p => p.has_update).map(p => p.name)
      });
      
      // 设置所有插件为更新中状态
      plugins.forEach(plugin => {
        updatePluginProgress(plugin.name, {
          status: 'updating',
          progress: 10,
          message: t('plugin.batchUpdate.updatingPlugin'),
        });
      });

      // 使用传入的 maxWorkers 或配置的 gitConcurrency
      // 验证需求: 13.5（使用配置的并发数调用 API）
      const concurrency = maxWorkers ?? systemSettings.gitConcurrency;
      
      console.log('[BatchUpdateModal] API 调用参数', {
        concurrency,
        source: maxWorkers !== undefined ? 'props' : 'settings'
      });

      // 调用批量更新 API
      const response = await pluginAPI.updateAllPlugins(undefined, concurrency);

      // 日志：记录 API 响应
      console.log('[BatchUpdateModal] API 响应', {
        success: response.success,
        resultsCount: response.results?.length || 0,
        summary: response.summary,
        error: response.error
      });

      if (response.success && response.results) {
        // 日志：记录每个插件的更新结果
        console.log('[BatchUpdateModal] 更新结果详情', 
          response.results.map((r: UpdateResult) => ({
            name: r.plugin_name,
            success: r.success,
            message: r.message
          }))
        );
        
        // 处理每个插件的更新结果
        response.results.forEach((result: UpdateResult) => {
          const newStatus = result.success ? 'success' : 'failed';
          
          // 构建消息：优先显示依赖变化信息
          let newMessage = '';
          if (result.success) {
            if (result.dependency_changed && result.new_dependencies && result.new_dependencies.length > 0) {
              newMessage = t('plugin.updateSuccessWithDeps', { count: result.new_dependencies.length });
            } else {
              newMessage = t('plugin.updateSuccess');
            }
          } else {
            newMessage = result.message || t('plugin.updateFailed');
          }
          
          console.log(`[BatchUpdateModal] 更新插件状态: ${result.plugin_name}`, {
            status: newStatus,
            message: newMessage,
            dependencyChanged: result.dependency_changed,
            newDependenciesCount: result.new_dependencies?.length || 0
          });
          
          updatePluginProgress(result.plugin_name, {
            status: newStatus,
            progress: 100,
            message: newMessage,
            dependenciesInstalled: 0, // 不再自动安装，始终为 0
          });
        });

        // 更新摘要
        if (response.summary) {
          setSummary(response.summary);
        }

        // 标记为完成
        setCompleted(true);

        // 调用完成回调,传入更新后的插件信息进行局部更新
        // 从API响应中提取更新后的插件信息
        const updatedPlugins: PluginInfo[] = response.results
          .filter((result: UpdateResult) => result.success && result.plugin)
          .map((result: UpdateResult) => result.plugin!);
        
        console.log('[BatchUpdateModal] 批量更新完成,局部更新插件', {
          updatedCount: updatedPlugins.length,
          pluginNames: updatedPlugins.map(p => p.name),
          failedCount: response.summary?.failed || 0
        });
        
        onComplete(updatedPlugins);

        // 如果有失败的插件，设置全局错误提示
        if (response.summary && response.summary.failed > 0) {
          setError(t('plugin.batchUpdate.partialFailed', { count: response.summary.failed }));
        }

        // 记录日志
        console.log('[BatchUpdateModal] 批量更新完成', response.summary);
      } else {
        const errorMsg = response.error || t('plugin.batchUpdate.failed');
        setError(errorMsg);
        
        // 将所有插件标记为失败
        plugins.forEach(plugin => {
          updatePluginProgress(plugin.name, {
            status: 'failed',
            progress: 0,
            message: errorMsg,
          });
        });

        console.error('[BatchUpdateModal] 批量更新失败', errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err?.message || t('plugin.batchUpdate.error');
      setError(errorMsg);
      
      // 将所有插件标记为失败
      plugins.forEach(plugin => {
        updatePluginProgress(plugin.name, {
          status: 'failed',
          progress: 0,
          message: errorMsg,
        });
      });

      console.error('[BatchUpdateModal] 批量更新异常', err);
    } finally {
      // 确保更新状态被重置
      setIsUpdating(false);
    }
  }, [plugins, maxWorkers, systemSettings.gitConcurrency, updatePluginProgress, onComplete]);

  /**
   * 处理确认更新
   * 验证需求: 2.3
   */
  const handleConfirm = () => {
    setShowConfirm(false);
    executeBatchUpdate();
  };

  /**
   * 处理取消更新
   * 验证需求: 2.4
   */
  const handleCancel = () => {
    onClose();
  };

  /**
   * 控制 body overflow，防止背景滚动
   */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  /**
   * 处理关闭
   * 验证需求: 3.1, 3.2（更新完成前不可关闭）
   */
  const handleClose = () => {
    if (isUpdating) {
      setShowCloseConfirm(true);
      return;
    }
    onClose();
  };

  /**
   * 获取状态图标
   */
  const getStatusIcon = (status: UpdateProgress['status']) => {
    switch (status) {
      case 'waiting':
        return <Clock className="size-4 text-muted-foreground" />;
      case 'updating':
        return <RefreshCw className="text-info size-4 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="text-success size-4" />;
      case 'failed':
        return <XCircle className="size-4 text-destructive" />;
      default:
        return null;
    }
  };

  /**
   * 获取状态文本
   */
  const getStatusText = (status: UpdateProgress['status']) => {
    switch (status) {
      case 'waiting':
        return t('plugin.batchUpdate.status.waiting');
      case 'updating':
        return t('plugin.batchUpdate.status.updating');
      case 'success':
        return t('plugin.batchUpdate.status.success');
      case 'failed':
        return t('plugin.batchUpdate.status.failed');
      default:
        return '';
    }
  };

  return (
    <>
      {/* 确认对话框 */}
      {showConfirm && (
        <ConfirmUpdateDialog
          plugins={plugins}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      {/* 批量更新进度对话框 */}
      {!showConfirm && (
        <Dialog open onOpenChange={(open) => { if (!open) handleClose() }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('plugin.batchUpdate.title')}</DialogTitle>
              <DialogDescription>
                {completed ? t('plugin.batchUpdate.completed') : t('plugin.batchUpdate.inProgress')}
              </DialogDescription>
            </DialogHeader>

        {/* 全局错误提示 */}
        {error && (
          <div className="mb-4 rounded-lg border border-destructive bg-destructive/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-5 text-destructive" />
              <div className="flex-1">
                <h4 className="mb-1 font-semibold text-destructive">{t("plugin.batchUpdate.failed")}</h4>
                <p className="text-sm text-muted-foreground">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 更新结果摘要 */}
        {completed && (
          <div className="mb-4 rounded-lg border border-border bg-muted/50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                {t('plugin.batchUpdate.summary')}
              </h3>
            </div>
            
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-xl font-bold text-foreground">
                  {summary.total}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('plugin.batchUpdate.summaryTotal')}
                </div>
              </div>

              <div className="text-center">
                <div className="text-success text-xl font-bold">
                  {summary.success}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('plugin.batchUpdate.summarySuccess')}
                </div>
              </div>

              <div className="text-center">
                <div className="text-xl font-bold text-destructive">
                  {summary.failed}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('plugin.batchUpdate.summaryFailed')}
                </div>
              </div>

              <div className="text-center">
                <div className="text-info text-xl font-bold">
                  {Array.from(updateProgress.values()).filter(p => 
                    p.status === 'success' && p.message.includes(t('plugin.batchUpdate.newDeps'))
                  ).length}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('plugin.batchUpdate.summaryDeps')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 插件更新列表 */}
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {plugins.map(plugin => {
            const progress = updateProgress.get(plugin.name);
            
            if (!progress) return null;

            return (
              <div
                key={plugin.name}
                className={cn(
                  'rounded-lg border p-2 transition-colors',
                  'border-border bg-card'
                )}
              >
                {/* 插件名称和状态 */}
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {/* 状态图标 */}
                    {getStatusIcon(progress.status)}
                    
                    {/* 插件名称 */}
                    <span className="break-all font-medium text-foreground">
                      {plugin.name}
                    </span>
                    
                    {/* 状态徽章 */}
                    <Badge
                      variant={progress.status === 'success' ? 'default' : 'secondary'}
                      className={cn(
                        'text-xs flex-shrink-0',
                        progress.status === 'success' && 'bg-success/10 text-success',
                        progress.status === 'failed' && 'bg-danger/10 text-danger',
                        progress.status === 'updating' && 'bg-info/10 text-info'
                      )}
                    >
                      {getStatusText(progress.status)}
                    </Badge>
                  </div>

                  {/* 依赖安装数 */}
                  {progress.dependenciesInstalled > 0 && (
                    <div className="ml-2 flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <Package className="size-3" />
                      <span>{progress.dependenciesInstalled}</span>
                    </div>
                  )}
                </div>
                
                {/* 失败时显示错误提示 */}
                {progress.status === 'failed' && (
                  <div className="border-danger bg-danger/10 mt-2 rounded border p-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="text-danger mt-0.5 size-3 shrink-0" />
                      <div className="text-danger text-xs">
                        {progress.message || t('plugin.batchUpdate.unknownError')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 底部按钮 */}
        <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
          {isUpdating && (
            <div className="mr-auto flex items-center gap-2 text-sm text-muted-foreground">
              <Loading size="sm" />
              <span>{t("plugin.batchUpdate.updating")}</span>
            </div>
          )}
          
          <Button
            onClick={handleClose}
            variant={!isUpdating ? 'default' : 'outline'}
          >
            {isUpdating ? t('plugin.batchUpdate.closeAnyway') : t('common.close')}
          </Button>
        </div>
          </DialogContent>
        </Dialog>
      )}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('plugin.batchUpdate.closeWarningTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('plugin.batchUpdate.closeWarningDescription')}
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
  );
};

/**
 * 默认导出
 */
export default BatchUpdateModal;
