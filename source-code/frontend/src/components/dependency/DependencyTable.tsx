/**
 * 依赖表格组件
 * 
 * 显示依赖列表，支持排序、虚拟滚动
 * 包含5列：来源、包名、版本、安装状态、操作
 * 
 * 需求: 3.1, 3.2, 3.6, 3.7, 13.3
 */

import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Dependency } from '@/types/dependency';
import DependencyRow from './DependencyRow';

/**
 * 排序方向
 */
type SortDirection = 'asc' | 'desc' | null;

/**
 * 排序列
 */
type SortColumn = 'source' | 'packageName' | 'versionSpec' | 'status';

/**
 * 依赖表格组件属性
 */
export interface DependencyTableProps {
  /** 依赖列表 */
  dependencies: Dependency[];
  /** 是否加载中 */
  loading?: boolean;
  /** 安装回调 */
  onInstall?: (dependency: Dependency) => void;
  /** 卸载回调 */
  onUninstall?: (dependency: Dependency) => void;
}

/**
 * 表头单元格组件
 */
interface TableHeaderCellProps {
  /** 列名 */
  column: SortColumn;
  /** 显示文本 */
  label: string;
  /** 当前排序列 */
  sortColumn: SortColumn | null;
  /** 当前排序方向 */
  sortDirection: SortDirection;
  /** 点击回调 */
  onClick: (column: SortColumn) => void;
}

function TableHeaderCell({
  column,
  label,
  sortColumn,
  sortDirection,
  onClick
}: TableHeaderCellProps) {
  const isSorted = sortColumn === column;
  
  return (
    <div
      className={cn(
        'text-sm font-medium text-muted-foreground',
        'cursor-pointer hover:text-foreground transition-colors',
        'select-none flex items-center gap-2'
      )}
      onClick={() => onClick(column)}
    >
      <span>{label}</span>
      {isSorted ? (
        sortDirection === 'asc' ? (
          <ArrowUp className="size-4" />
        ) : (
          <ArrowDown className="size-4" />
        )
      ) : (
        <ArrowUpDown className="size-4 opacity-50" />
      )}
    </div>
  );
}

/**
 * 表格 grid 列定义
 */
const GRID_COLS = 'auto 1fr 200px 150px 120px';

/**
 * 依赖表格组件
 */
export function DependencyTable({
  dependencies,
  loading = false,
  onInstall,
  onUninstall
}: DependencyTableProps) {
  const { t } = useTranslation()
  // 排序状态
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    // 处理排序
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // 切换排序方向：asc -> desc -> null
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

  // 排序后的依赖列表（使用 useMemo 缓存）
  const sortedDependencies = useMemo(() => {
    if (!sortColumn || !sortDirection) {
      return dependencies;
    }

    return [...dependencies].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortColumn) {
        case 'source':
          aValue = a.source;
          bValue = b.source;
          break;
        case 'packageName':
          aValue = a.packageName;
          bValue = b.packageName;
          break;
        case 'versionSpec':
          aValue = a.versionSpec;
          bValue = b.versionSpec;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
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
  }, [dependencies, sortColumn, sortDirection]);

  const headerClass = cn(
    'px-4 py-3 sticky top-0 z-10 bg-background border-b border-border'
  );

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: GRID_COLS }}>
          {/* 表头 */}
          <div className={headerClass}>
            <TableHeaderCell
              column="source"
              label={t("common.label.source")}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onClick={handleSort}
            />
          </div>
          <div className={headerClass}>
            <TableHeaderCell
              column="packageName"
              label={t("common.label.packageName")}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onClick={handleSort}
            />
          </div>
          <div className={headerClass}>
            <TableHeaderCell
              column="versionSpec"
              label={t("common.label.version")}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onClick={handleSort}
            />
          </div>
          <div className={headerClass}>
            <TableHeaderCell
              column="status"
              label={t("common.label.installStatus")}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onClick={handleSort}
            />
          </div>
          <div className={headerClass}>
            <div className="text-sm font-medium text-muted-foreground">
              {t('common.action')}
            </div>
          </div>

          {/* 表体 */}
          {loading ? (
            <div className="col-span-5 flex h-48 items-center justify-center">
              <div className="text-center">
                <div className="inline-block size-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                <p className="mt-2 text-sm text-muted-foreground">{t("common.loading")}</p>
              </div>
            </div>
          ) : sortedDependencies.length === 0 ? (
            <div className="col-span-5 flex h-48 items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{t("dependency.noMatchingDeps")}</p>
              </div>
            </div>
          ) : (
            sortedDependencies.map((dependency) => (
              <DependencyRow
                key={dependency.id}
                dependency={dependency}
                onInstall={onInstall || (() => {})}
                onUninstall={onUninstall || (() => {})}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default DependencyTable;
