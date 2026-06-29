/**
 * VersionInfo 组件
 * 
 * 显示版本切换的源版本和目标版本信息（简洁版）
 */

import React from 'react';
import { Hash, ArrowRight } from 'lucide-react';
import type { VersionInfo as VersionInfoType } from '@/types/version';

interface VersionInfoProps {
  /** 当前版本 */
  current: VersionInfoType;
  /** 目标版本 */
  target: VersionInfoType;
}

/**
 * 格式化日期
 */
const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

/**
 * VersionInfo 组件
 */
export const VersionInfo: React.FC<VersionInfoProps> = ({ current, target }) => {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-4">
      <div className="flex items-center justify-between gap-4">
        {/* 当前版本 */}
        <div className="flex-1">
          <div className="mb-1 text-xs text-muted-foreground">
            当前版本
          </div>
          <div className="flex items-center gap-2">
            <Hash className="size-3 text-muted-foreground" />
            <code className="rounded bg-background px-2 py-0.5 font-mono text-sm text-foreground">
              {current.id}
            </code>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {formatDate(current.timestamp)}
          </div>
        </div>

        {/* 箭头 */}
        <div className="shrink-0">
          <ArrowRight className="size-5 text-primary" />
        </div>

        {/* 目标版本 */}
        <div className="flex-1">
          <div className="mb-1 text-xs text-muted-foreground">
            目标版本
          </div>
          <div className="flex items-center gap-2">
            <Hash className="size-3 text-muted-foreground" />
            <code className="rounded bg-background px-2 py-0.5 font-mono text-sm text-foreground">
              {target.id}
            </code>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {formatDate(target.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionInfo;
