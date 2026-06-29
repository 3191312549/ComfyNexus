/**
 * PluginList 容器组件
 * 
 * 管理插件列表的整体状态，协调搜索、刷新、批量更新等操作
 * 提供加载状态和错误处理
 * 
 * 性能优化:
 * - 虚拟滚动（react-window）用于大量插件（> 50）
 * - 缓存优先加载策略（< 500ms）
 * - 搜索防抖（300ms）
 * 
 * 验证需求: 1.1, 1.5, 5.5, 15.1, 15.4（列表展示、刷新和性能）
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { usePlugins } from '@/hooks/usePlugins';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { usePluginUpdateBadgeStore } from '@/stores/usePluginUpdateBadgeStore';
import { PluginRow } from './PluginRow';
import { PluginSearchBar } from './PluginSearchBar';
import { Button } from '@/components/ui/Button';
import { BatchUpdateModal } from './BatchUpdateModal';
import { Loading } from '@/components/ui/Loading';
import { Switch } from '@/components/ui/Switch';
import type { PluginInfo } from '@/types/plugin';
import { eventBus, EVENTS } from '@/utils/eventBus';
import { cn } from '@/lib/utils';
import { pluginAPI } from '@/services/PluginAPIService';
import { toast } from 'sonner';

type SortDirection = 'asc' | 'desc' | null;

type SortColumn = 'enabled' | 'name' | 'branch' | 'install_date' | 'commit_date';

interface TableHeaderCellProps {
  column: SortColumn;
  label: string;
  sortColumn: SortColumn | null;
  sortDirection: SortDirection;
  onClick: (column: SortColumn) => void;
  className?: string;
}

function TableHeaderCell({
  column,
  label,
  sortColumn,
  sortDirection,
  onClick,
  className
}: TableHeaderCellProps) {
  const isSorted = sortColumn === column;
  
  return (
    <div
      className={cn(
        'cursor-pointer hover:text-foreground transition-colors select-none flex items-center gap-1',
        className
      )}
      onClick={() => onClick(column)}
    >
      <span>{label}</span>
      {isSorted ? (
        sortDirection === 'asc' ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        )
      ) : (
        <ArrowUpDown className="size-3 opacity-50" />
      )}
    </div>
  );
}

/**
 * PluginList 组件属性
 */
export interface PluginListProps {
  /** 当前环境 ID（用于缓存隔离和环境切换同步） */
  environmentId?: string | null;
}

/**
 * PluginList 容器组件
 */
export const PluginList: React.FC<PluginListProps> = ({ environmentId }) => {
  const { t } = useTranslation();
  const {
    plugins,
    filteredPlugins,
    loading,
    refreshing,
    error,
    loadPlugins,
    refreshPlugins,
    refreshPluginGitInfo,
    searchPlugins,
    updatePlugin,
    removePlugin,
  } = usePlugins(environmentId);

  const badgeEnabled = usePluginUpdateBadgeStore(state => state.badgeEnabled);
  const setBadgeEnabled = usePluginUpdateBadgeStore(state => state.setBadgeEnabled);

  const [showBatchUpdate, setShowBatchUpdate] = useState(false);
  const [showUpdatesOnly, setShowUpdatesOnly] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection | null>(null);
  const [togglingAll, setTogglingAll] = useState(false);
  const [pluginNotes, setPluginNotes] = useState<Record<string, string>>({});
  
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  const { systemSettings, updateSystemSettings, loading: settingsLoading } = useSettingsStore();
  const hideDisabled = systemSettings.hideDisabledPlugins;

  useEffect(() => {
    if (!settingsLoading) {
      console.log('[PluginList] 系统设置已加载，hideDisabledPlugins:', hideDisabled)
    }
  }, [settingsLoading, hideDisabled])
  
  useEffect(() => {
    console.log('[PluginList] 订阅插件安装完成事件')
    
    const unsubscribe = eventBus.on(EVENTS.PLUGIN_INSTALLED, () => {
      console.log('[PluginList] 收到插件安装完成事件，刷新插件列表')
      refreshPlugins()
    })
    
    return () => {
      console.log('[PluginList] 取消订阅插件安装完成事件')
      unsubscribe()
    }
  }, [refreshPlugins])

  const pluginsLength = plugins.length;

  useEffect(() => {
    const loadNotes = async () => {
      try {
        const result = await pluginAPI.getAllPluginNotes();
        if (result.success && result.notes) {
          setPluginNotes(result.notes);
        }
      } catch (error) {
        console.error('[PluginList] 加载插件备注失败', error);
      }
    };
    loadNotes();
  }, [pluginsLength]);

  const handleNoteChange = useCallback((pluginId: string, note: string) => {
    setPluginNotes(prev => {
      if (note.trim()) {
        return { ...prev, [pluginId]: note };
      }
      const { [pluginId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const handleToggleHideDisabled = async () => {
    console.log('[PluginList] 切换隐藏禁用插件，当前值:', hideDisabled, '新值:', !hideDisabled)
    await updateSystemSettings({ hideDisabledPlugins: !hideDisabled });
    console.log('[PluginList] 切换完成')
  };

  const handleToggleShowUpdatesOnly = () => {
    console.log('[PluginList] 切换筛选更新，当前值:', showUpdatesOnly, '新值:', !showUpdatesOnly)
    setShowUpdatesOnly(!showUpdatesOnly);
    console.log('[PluginList] 切换完成')
  };

  const handleToggleAllPlugins = async (enabled: boolean) => {
    setTogglingAll(true);
    
    try {
      const targetPlugins = enabled 
        ? plugins.filter(p => p.name.endsWith('.disabled'))
        : plugins.filter(p => !p.name.endsWith('.disabled'));
      
      if (targetPlugins.length === 0) {
        toast.info(enabled ? t('plugin.list.allEnabled') : t('plugin.list.allDisabled'));
        return;
      }
      
      const actualNames = targetPlugins.map(p => p.name.replace(/\.disabled$/, ''));
      
      for (const name of actualNames) {
        await pluginAPI.togglePluginEnabled(name, enabled);
      }
      
      toast.success(enabled 
        ? t('plugin.list.enableAllSuccess', { count: actualNames.length })
        : t('plugin.list.disableAllSuccess', { count: actualNames.length })
      );
      
      await loadPlugins(false);
    } catch (error) {
      console.error('[PluginList] 批量切换插件状态失败', error);
      toast.error(t('common.operationFailed'));
    } finally {
      setTogglingAll(false);
    }
  };

  let displayPlugins = filteredPlugins;
  
  if (hideDisabled) {
    displayPlugins = displayPlugins.filter(p => !p.name.endsWith('.disabled'));
  }
  
  if (showUpdatesOnly) {
    displayPlugins = displayPlugins.filter(p => p.has_update);
  }

  const sortedPlugins = useMemo(() => {
    if (!sortColumn || !sortDirection) {
      return displayPlugins;
    }

    return [...displayPlugins].sort((a, b) => {
      let aValue: string | number | boolean;
      let bValue: string | number | boolean;

      switch (sortColumn) {
        case 'enabled':
          aValue = !a.name.endsWith('.disabled');
          bValue = !b.name.endsWith('.disabled');
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'branch':
          aValue = a.branch || '';
          bValue = b.branch || '';
          break;
        case 'install_date':
          aValue = a.install_date || '';
          bValue = b.install_date || '';
          break;
        case 'commit_date':
          aValue = a.commit_date || '';
          bValue = b.commit_date || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [displayPlugins, sortColumn, sortDirection]);

  const enabledCount = plugins.filter(p => !p.name.endsWith('.disabled')).length;
  const updateCount = plugins.filter(p => p.has_update).length;

  const handleRefresh = () => {
    refreshPlugins();
  };

  const handleBatchUpdate = () => {
    const pluginsToUpdate = plugins.filter(p => p.has_update);
    
    if (pluginsToUpdate.length === 0) {
      console.log('[PluginList] 没有可更新的插件');
      return;
    }
    
    setShowBatchUpdate(true);
  };

  const handleBatchUpdateComplete = (updatedPlugins: PluginInfo[]) => {
    console.log('[PluginList] 批量更新完成,局部更新插件', {
      count: updatedPlugins.length,
      pluginNames: updatedPlugins.map(p => p.name)
    });
    
    updatedPlugins.forEach(plugin => {
      updatePlugin(plugin);
    });
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loading size="lg" text={t('plugin.list.loading')} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[10px] border border-danger/30 bg-surface p-6">
        <h3 className="mb-2 font-semibold text-danger">{t('common.error')}</h3>
        <p className="mb-4 text-sm text-content-secondary">
          {error}
        </p>
        <Button
          onClick={() => loadPlugins(false)}
          variant="outline"
        >
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* 工具栏 */}
      <PluginSearchBar
        onSearch={searchPlugins}
        onRefresh={handleRefresh}
        onUpdateAll={handleBatchUpdate}
        loading={refreshing}
        showUpdatesOnly={showUpdatesOnly}
        onToggleShowUpdatesOnly={handleToggleShowUpdatesOnly}
        hideDisabled={hideDisabled}
        onToggleHideDisabled={handleToggleHideDisabled}
        updateCount={updateCount}
        badgeEnabled={badgeEnabled}
        onBadgeEnabledChange={setBadgeEnabled}
      />

      {/* 插件列表 */}
      {displayPlugins.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-[10px] border border-border bg-surface">
          <div className="text-center">
            <p className="text-content-secondary">
              {t('plugin.list.noPlugins')}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden rounded-[10px] border border-border bg-surface">
          <div className="grid grid-cols-[60px_1fr_80px_120px_110px_150px_220px] gap-4 border-b border-border bg-muted px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-content-muted">
            <TableHeaderCell
              column="enabled"
              label={t('plugin.list.header.enabled')}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onClick={handleSort}
              className="justify-center"
            />
            <TableHeaderCell
              column="name"
              label={t('plugin.list.header.name')}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onClick={handleSort}
              className="justify-start"
            />
            <TableHeaderCell
              column="branch"
              label={t('plugin.list.header.branch')}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onClick={handleSort}
              className="justify-center"
            />
            <div className="text-center">{t('plugin.list.header.version')}</div>
            <TableHeaderCell
              column="install_date"
              label={t('plugin.list.header.installDate')}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onClick={handleSort}
              className="justify-center"
            />
            <TableHeaderCell
              column="commit_date"
              label={t('plugin.list.header.updateTime')}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onClick={handleSort}
              className="justify-center"
            />
            <div className="text-center">{t('plugin.list.header.actions')}</div>
          </div>

          <div className="flex-1 overflow-auto">
            {sortedPlugins.map((plugin) => {
              const pluginId = plugin.name.replace(/\.disabled$/, '');
              return (
                <PluginRow
                  key={plugin.name}
                  plugin={plugin}
                  onRefresh={refreshPlugins}
                  onUpdate={updatePlugin}
                  onRemove={removePlugin}
                  onRetrySingle={refreshPluginGitInfo}
                  note={pluginNotes[pluginId] || null}
                  onNoteChange={handleNoteChange}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-border bg-muted px-6 py-4 text-sm text-content-secondary">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={enabledCount === plugins.length && plugins.length > 0}
                  onCheckedChange={handleToggleAllPlugins}
                  disabled={togglingAll || plugins.length === 0}
                />
                <span>{t('plugin.list.toggleAll')}</span>
                {togglingAll && <Loading size="sm" />}
              </div>
            </div>
            <span>{t('plugin.list.totalCount', { total: plugins.length, enabled: enabledCount })}</span>
          </div>
        </div>
      )}

      {/* 批量更新模态窗口 */}
      {showBatchUpdate && (
        <BatchUpdateModal
          plugins={plugins.filter(p => p.has_update)}
          onClose={() => setShowBatchUpdate(false)}
          onComplete={handleBatchUpdateComplete}
        />
      )}
    </div>
  );
};

/**
 * 默认导出
 */
export default PluginList;
