/**
 * ResultDisplay 组件
 * 
 * 显示版本切换的最终结果（成功/失败）
 */

import React from 'react';
import { CheckCircle2, AlertCircle, FileText, Archive } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { SwitchProgress } from '@/types/version';

interface ResultDisplayProps {
  /** 切换进度 */
  progress: SwitchProgress;
  /** 查看日志回调 */
  onViewLog?: () => void;
}

/**
 * ResultDisplay 组件
 */
export const ResultDisplay: React.FC<ResultDisplayProps> = ({ progress, onViewLog }) => {
  // 如果还没有最终结果，不显示
  if (progress.success === null) return null;

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'p-4 rounded-lg border',
          progress.success
            ? 'bg-success/10 border-success/50'
            : 'bg-danger/10 border-danger/50'
        )}
      >
        <div className="flex items-start gap-3">
          {/* 状态图标 */}
          {progress.success ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
          ) : (
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" />
          )}

          {/* 结果信息 */}
          <div className="min-w-0 flex-1">
            <h4
              className={cn(
                'font-semibold mb-1',
                progress.success
                  ? 'text-success'
                  : 'text-danger'
              )}
            >
              {progress.success ? '切换成功' : '切换失败'}
            </h4>
            <p
              className={cn(
                'text-sm',
                progress.success
                  ? 'text-success/80'
                  : 'text-danger/80'
              )}
            >
              {progress.message}
            </p>

            {/* 查看日志按钮 */}
            {progress.logFile && onViewLog && (
              <Button
                size="sm"
                variant="outline"
                onClick={onViewLog}
                className={cn(
                  'mt-3',
                  progress.success
                    ? 'border-success text-success hover:bg-success/10'
                    : 'border-danger text-danger hover:bg-danger/10'
                )}
              >
                <FileText className="mr-2 size-4" />
                查看日志
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stash 提示 */}
      {progress.stashed && progress.success && (
        <div className="rounded-lg border border-info/50 bg-info/10 p-3">
          <div className="flex items-start gap-2">
            <Archive className="mt-0.5 size-4 shrink-0 text-info" />
            <div className="flex-1">
              <p className="text-sm font-medium text-info">
                本地文件已暂存
              </p>
              <p className="mt-1 text-xs text-info/80">
                您的本地文件已暂存到 Git stash。如需恢复，请在 ComfyUI 目录执行：
                <code className="ml-1 rounded bg-info/20 px-1.5 py-0.5 font-mono text-xs">
                  git stash pop
                </code>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultDisplay;
