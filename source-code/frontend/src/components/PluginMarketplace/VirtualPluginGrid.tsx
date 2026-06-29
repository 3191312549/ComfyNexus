/**
 * 虚拟滚动插件网格组件
 * 
 * 使用 react-window 实现虚拟滚动，只渲染可见区域的插件卡片
 * 大幅提升大量插件场景下的性能
 * 
 * 功能：
 * - 虚拟滚动（仅渲染可见区域）
 * - 响应式列数（4列固定）
 * - 自动计算网格尺寸
 * - 支持动态数据更新
 * 
 * 采用 Glassmorphism 风格
 */

import React, { useMemo, useCallback } from 'react'
import { Grid, CellComponentProps, useGridRef } from 'react-window'
import { PluginCard } from './PluginCard'
import { Plugin } from '@/types/plugin-marketplace'

interface VirtualPluginGridProps {
  plugins: Plugin[]
  autoInstallDeps: boolean
  onInstall: (plugin: Plugin) => void
  installingPluginName: string | null
  height: number
  width: number
  onShowMore?: (plugin: Plugin) => void
}

const CARD_CONFIG = {
  HEIGHT: 250,
  GAP: 16,
  EDGE_PADDING: 0,
}

interface CellData {
  plugins: Plugin[]
  columnCount: number
  autoInstallDeps: boolean
  onInstall: (plugin: Plugin) => void
  installingPluginName: string | null
  onShowMore?: (plugin: Plugin) => void
}

export const VirtualPluginGrid: React.FC<VirtualPluginGridProps> = ({
  plugins,
  autoInstallDeps,
  onInstall,
  installingPluginName,
  height,
  width,
  onShowMore
}) => {
  const gridRef = useGridRef(null)

  const columnCount = 4

  const rowCount = useMemo(() => {
    return Math.ceil(plugins.length / columnCount)
  }, [plugins.length])

  const columnWidth = useMemo(() => {
    return Math.floor(width / columnCount)
  }, [width, columnCount])

  const cellData: CellData = useMemo(() => ({
    plugins,
    columnCount,
    autoInstallDeps,
    onInstall,
    installingPluginName,
    onShowMore
  }), [plugins, columnCount, autoInstallDeps, onInstall, installingPluginName, onShowMore])

  const CellComponent = useCallback(({ columnIndex, rowIndex, style }: CellComponentProps<CellData>) => {
    const index = rowIndex * cellData.columnCount + columnIndex
    
    if (index >= cellData.plugins.length) {
      return null
    }

    const plugin = cellData.plugins[index]

    const isFirstColumn = columnIndex === 0
    const isLastColumn = columnIndex === cellData.columnCount - 1
    
    const paddingLeft = isFirstColumn ? CARD_CONFIG.EDGE_PADDING : CARD_CONFIG.GAP / 2
    const paddingRight = isLastColumn ? CARD_CONFIG.EDGE_PADDING : CARD_CONFIG.GAP / 2
    const paddingTop = CARD_CONFIG.GAP / 2
    const paddingBottom = CARD_CONFIG.GAP / 2

    return (
      <div
        style={{
          ...style,
          paddingLeft,
          paddingRight,
          paddingTop,
          paddingBottom,
        }}
      >
        <div style={{ width: '100%', height: '100%' }}>
          <PluginCard
            plugin={plugin}
            autoInstallDeps={cellData.autoInstallDeps}
            onInstall={cellData.onInstall}
            isInstalling={cellData.installingPluginName === plugin.name}
            onShowMore={cellData.onShowMore}
          />
        </div>
      </div>
    )
  }, [cellData])

  if (plugins.length === 0) {
    return null
  }

  return (
    <Grid
      gridRef={gridRef}
      columnCount={columnCount}
      columnWidth={columnWidth}
      rowCount={rowCount}
      rowHeight={CARD_CONFIG.HEIGHT}
      defaultHeight={height}
      defaultWidth={width}
      overscanCount={2}
      cellComponent={CellComponent}
      cellProps={cellData}
      className="scrollbar-thin"
      style={{ overflowX: 'hidden' }}
    />
  )
}

VirtualPluginGrid.displayName = 'VirtualPluginGrid'

export default VirtualPluginGrid
