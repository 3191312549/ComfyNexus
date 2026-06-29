/**
 * PluginUpdateProgress 组件
 * 
 * 显示插件后台更新的进度指示器
 * 
 * 功能:
 * - 显示总体进度百分比
 * - 显示当前正在更新的内容
 * - 更新完成后自动消失
 * - 支持动画效果
 * 
 * 验证需求: NFR-4（用户体验要求）
 */

import React from 'react'
import { useTranslation } from 'react-i18next';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui';
import { Loading } from '@/components/ui/Loading';
import { Button } from '@/components/ui/Button';

/**
 * PluginUpdateProgress 组件属性
 */
export interface PluginUpdateProgressProps {
  /** 是否正在更新 */
  isUpdating: boolean;
  /** 当前进度 */
  current: number;
  /** 总数 */
  total: number;
  /** 当前阶段标识 */
  stage?: string;
  /** 当前阶段名称 */
  stageName?: string;
  /** 取消回调 */
  onCancel?: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * PluginUpdateProgress 组件
 */
export const PluginUpdateProgress: React.FC<PluginUpdateProgressProps> = ({
  isUpdating,
  current,
  total,
  stage = '',
  stageName = '',
  onCancel,
  className = '',
}) => {
  const { t } = useTranslation()
  // 调试日志：打印接收到的props
  React.useEffect(() => {
    if (isUpdating) {
      console.log('[PluginUpdateProgress] 接收到props:', {
        stage,
        stageName,
        current,
        total,
      });
    }
  }, [isUpdating, stage, stageName, current, total]);
  
  // 如果未在更新，不渲染
  if (!isUpdating || total === 0) {
    return null;
  }

  // 计算进度百分比
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  // 获取当前阶段显示文本
  const getStageDisplay = (): string => {
    if (stageName) {
      return `${stageName} (${current}/${total})`;
    }
    return `正在更新插件信息 (${current}/${total})`;
  };

  return (
    <Card 
      className={`border-blue-500 bg-blue-50 dark:bg-blue-950 transition-all duration-300 ${className}`}
      data-testid="plugin-update-progress"
    >
      <CardContent className="py-4">
        <div className="space-y-3">
          {/* 标题和加载图标 */}
          <div className="flex items-center gap-3">
            <Loading size="sm" />
            <div className="flex-1">
              <p className="text-blue-900 dark:text-blue-100 text-sm font-medium">
                正在后台更新插件信息
              </p>
              <p className="text-blue-700 dark:text-blue-300 mt-1 text-xs">
                {getStageDisplay()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-blue-700 dark:text-blue-300 text-lg font-semibold">
                {percentage}%
              </div>
              {/* 停止按钮 */}
              {onCancel && (
                <Button
                  onClick={onCancel}
                  variant="ghost"
                  size="sm"
                  title={t("common.title.stopUpdate")}
                >
                  停止
                </Button>
              )}
            </div>
          </div>

          {/* 进度条 */}
          <Progress 
            value={current} 
            max={total}
            className="h-2"
            data-testid="progress-bar"
          />
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * 默认导出
 */
export default PluginUpdateProgress;
