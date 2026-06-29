/**
 * StepItem 组件
 * 
 * 显示单个切换步骤的状态
 */

import React from 'react';
import { CheckCircle2, XCircle, Loader2, Circle, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StepStatus } from '@/types/version';

interface StepItemProps {
  /** 步骤标签 */
  label: string;
  /** 步骤状态 */
  status: StepStatus;
  /** 是否为当前活动步骤 */
  isActive: boolean;
}

/**
 * StepItem 组件
 */
export const StepItem: React.FC<StepItemProps> = ({ label, status, isActive }) => {
  /**
   * 获取状态图标
   */
  const getIcon = () => {
    switch (status.status) {
      case 'pending':
        return <Circle className="size-4 text-muted-foreground" />;
      case 'running':
        return <Loader2 className="size-4 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle2 className="size-4 text-success" />;
      case 'error':
        return <XCircle className="size-4 text-danger" />;
      case 'skipped':
        return <Minus className="size-4 text-muted-foreground" />;
    }
  };

  /**
   * 获取文本颜色
   */
  const getTextColor = () => {
    switch (status.status) {
      case 'running':
        return 'text-primary';
      case 'success':
        return 'text-success';
      case 'error':
        return 'text-danger';
      default:
        return 'text-foreground';
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg transition-colors',
        isActive && 'bg-muted/50'
      )}
    >
      {/* 状态图标 */}
      <div className="shrink-0">{getIcon()}</div>

      {/* 步骤信息 */}
      <div className="min-w-0 flex-1">
        <div className={cn('text-sm font-medium', getTextColor())}>{label}</div>
        <div className="truncate text-xs text-muted-foreground">
          {status.message}
        </div>
      </div>
    </div>
  );
};

export default StepItem;
