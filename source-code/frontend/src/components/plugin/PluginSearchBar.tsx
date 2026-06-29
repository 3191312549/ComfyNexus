/**
 * PluginSearchBar 组件
 * 
 * 提供搜索输入框、刷新按钮和批量更新按钮
 * 实现搜索防抖和结果数量显示
 * 
 * 验证需求: 1.5, 2.1, 2.3（搜索功能）
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, RefreshCw, EyeOff, Eye, Filter, CloudDownload, Bell, BellOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { GitPermissionFixButton } from './GitPermissionFixButton';

/**
 * PluginSearchBar 组件属性
 */
export interface PluginSearchBarProps {
  /** 搜索回调 */
  onSearch: (keyword: string) => void;
  /** 刷新回调 */
  onRefresh: () => void;
  /** 批量更新回调 */
  onUpdateAll: () => void;
  /** 加载状态 */
  loading?: boolean;
  /** 搜索结果数量（可选） */
  resultCount?: number;
  /** 总数量（可选） */
  totalCount?: number;
  /** 是否隐藏禁用插件 */
  hideDisabled?: boolean;
  /** 隐藏禁用插件回调 */
  onToggleHideDisabled?: () => void;
  /** 是否只显示有更新的插件 */
  showUpdatesOnly?: boolean;
  /** 切换只显示更新回调 */
  onToggleShowUpdatesOnly?: () => void;
  /** 有更新的插件数量 */
  updateCount?: number;
  /** 徽章开关状态 */
  badgeEnabled?: boolean;
  /** 徽章开关回调 */
  onBadgeEnabledChange?: (enabled: boolean) => void;
}

/**
 * PluginSearchBar 组件
 */
export const PluginSearchBar: React.FC<PluginSearchBarProps> = ({
  onSearch,
  onRefresh,
  onUpdateAll,
  loading = false,
  hideDisabled = false,
  onToggleHideDisabled,
  showUpdatesOnly = false,
  onToggleShowUpdatesOnly,
  updateCount = 0,
  badgeEnabled = true,
  onBadgeEnabledChange,
}) => {
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 300);

    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    onSearch(debouncedKeyword);
  }, [debouncedKeyword, onSearch]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
  }, []);

  return (
    <div className="flex items-center justify-between gap-4 rounded-[10px] border border-border bg-surface px-4 py-3">
      {/* 搜索框 - 左对齐 */}
      <div className="flex w-[480px] items-center gap-2.5 rounded-[10px] border border-border bg-muted px-4 py-2">
        <Search className="size-4 shrink-0 text-content-muted" />
        <Input
          type="text"
          placeholder={t('plugin.search.placeholder')}
          value={keyword}
          onChange={handleInputChange}
          className="w-full border-none bg-transparent text-sm text-content-primary outline-none placeholder:text-content-muted"
        />
      </div>

      {/* 工具栏操作区 - 右对齐 */}
      <div className="flex shrink-0 items-center gap-3">
        {/* Git 权限修复按钮组 */}
        <div className="flex items-center gap-0.5">
          <GitPermissionFixButton onRefresh={onRefresh} />
        </div>

        {/* 分隔线 - 在帮助按钮和筛选按钮之间 */}
        <div className="h-5 w-px bg-border" />

        {/* 徽章开关 */}
        {onBadgeEnabledChange && (
          <div className="flex items-center gap-2">
            {badgeEnabled ? (
              <Bell className="size-4 text-content-secondary" />
            ) : (
              <BellOff className="size-4 text-content-muted" />
            )}
            <Switch
              checked={badgeEnabled}
              onCheckedChange={onBadgeEnabledChange}
              title={badgeEnabled ? t('plugin.badge.hide') : t('plugin.badge.show')}
            />
          </div>
        )}

        {/* 分隔线 - 在徽章开关和筛选按钮之间 */}
        {onBadgeEnabledChange && <div className="h-5 w-px bg-border" />}

        {/* 隐藏禁用插件按钮 */}
        {onToggleHideDisabled && (
          <Button
            onClick={onToggleHideDisabled}
            variant={hideDisabled ? "default" : "outline"}
            size="sm"
            className={cn(
              "flex items-center gap-2",
              hideDisabled
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-content-secondary"
            )}
            title={hideDisabled ? t('plugin.filter.showDisabled') : t('plugin.filter.hideDisabled')}
          >
            {hideDisabled ? (
              <>
                <EyeOff className="size-4" />
                <span>{t('plugin.filter.enabledOnly')}</span>
              </>
            ) : (
              <>
                <Eye className="size-4" />
                <span>{t('plugin.filter.enabledOnly')}</span>
              </>
            )}
          </Button>
        )}

        {onToggleShowUpdatesOnly && (
          <Button
            onClick={onToggleShowUpdatesOnly}
            variant={showUpdatesOnly ? "default" : "outline"}
            size="sm"
            className={cn(
              "flex items-center gap-2",
              showUpdatesOnly
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-content-secondary"
            )}
            title={showUpdatesOnly ? t('plugin.filter.showAll') : t('plugin.filter.updatesOnly')}
          >
            <Filter className="size-4" />
            <span>{t('plugin.filter.updates')}</span>
          </Button>
        )}

        {/* 分隔线 - 在筛选更新和一键更新之间 */}
        <div className="h-5 w-px bg-border" />

        {/* 一键更新按钮 */}
        <Button
          onClick={onUpdateAll}
          disabled={loading || updateCount === 0}
          className={cn(
            "flex items-center gap-2 shadow-sm border border-black/20 dark:border-white/10 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:hover:brightness-100"
          )}
        >
          <CloudDownload className="size-4" />
          <span>{t('plugin.batchUpdate.oneClick', { count: updateCount })}</span>
        </Button>

        <Button
          onClick={onRefresh}
          disabled={loading}
          variant="outline"
          size="icon"
          title={t('common.refresh')}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>
    </div>
  );
};

/**
 * 默认导出
 */
export default PluginSearchBar;
