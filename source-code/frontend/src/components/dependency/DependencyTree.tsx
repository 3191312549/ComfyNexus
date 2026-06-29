/**
 * 依赖树组件
 * 
 * 以树形结构展示依赖关系，支持：
 * - 展开/折叠节点
 * - 搜索过滤
 * - 冲突高亮
 * - 虚拟滚动（性能优化）
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, ChevronDown, Search, Package, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { DependencyNode, ConflictInfo } from '@/types/dependency'
import { cn } from '@/lib/utils'

/**
 * 组件 Props
 */
interface DependencyTreeProps {
  /** 依赖树数据 */
  treeData: DependencyNode[]
  /** 冲突信息列表 */
  conflicts: ConflictInfo[]
  /** 节点选择回调 */
  onNodeSelect?: (node: DependencyNode) => void
  /** 当前选中的节点 ID */
  selectedNodeId?: string | null
}

/**
 * 依赖树组件
 */
export const DependencyTree: React.FC<DependencyTreeProps> = ({
  treeData,
  conflicts: _conflicts,
  onNodeSelect,
  selectedNodeId
}) => {
  const { t } = useTranslation()
  // 状态管理
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  // 初始化：默认展开前 2 层节点
  useEffect(() => {
    const initialExpanded = new Set<string>()
    
    const expandFirstTwoLevels = (nodes: DependencyNode[]) => {
      nodes.forEach(node => {
        if (node.depth <= 1) {
          initialExpanded.add(node.id)
          if (node.dependencies && node.dependencies.length > 0) {
            expandFirstTwoLevels(node.dependencies)
          }
        }
      })
    }
    
    expandFirstTwoLevels(treeData)
    setExpandedNodes(initialExpanded)
  }, [treeData])

  /**
   * 切换节点展开/折叠状态
   */
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }, [])

  /**
   * 处理节点点击
   */
  const handleNodeClick = useCallback((node: DependencyNode) => {
    onNodeSelect?.(node)
  }, [onNodeSelect])

  /**
   * 搜索过滤：过滤包含搜索关键词的节点
   */
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) {
      return treeData
    }

    const query = searchQuery.toLowerCase()
    
    const filterNode = (node: DependencyNode): DependencyNode | null => {
      const matches = node.packageName.toLowerCase().includes(query)
      const filteredDeps = node.dependencies
        .map(dep => filterNode(dep))
        .filter((dep): dep is DependencyNode => dep !== null)
      
      if (matches || filteredDeps.length > 0) {
        return {
          ...node,
          dependencies: filteredDeps
        }
      }
      
      return null
    }

    return treeData
      .map(node => filterNode(node))
      .filter((node): node is DependencyNode => node !== null)
  }, [treeData, searchQuery])

  /**
   * 渲染树节点
   */
  const renderNode = useCallback((node: DependencyNode, level: number = 0) => {
    const hasChildren = node.dependencies && node.dependencies.length > 0
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedNodeId === node.id
    const hasConflict = node.hasConflict

    return (
      <div key={node.id} className="select-none">
        {/* 节点内容 */}
        <div
          className={cn(
            'flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer hover:bg-accent transition-colors',
            isSelected && 'bg-accent',
            hasConflict && 'text-red-600'
          )}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => handleNodeClick(node)}
        >
          {/* 展开/折叠图标 */}
          {hasChildren ? (
            <Button
              onClick={(e) => {
                e.stopPropagation()
                toggleNode(node.id)
              }}
              variant="ghost"
              size="icon"
              className="size-4 shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
            </Button>
          ) : (
            <div className="size-4 shrink-0" />
          )}

          {/* 包图标 */}
          {hasConflict ? (
            <AlertCircle className="text-red-600 size-4 shrink-0" />
          ) : (
            <Package className="size-4 shrink-0 text-muted-foreground" />
          )}

          {/* 包名和版本 */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className={cn(
                'font-medium truncate',
                hasConflict && 'text-red-600'
              )}>
                {node.packageName}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {node.installedVersion}
              </span>
            </div>
            {node.requiredVersion && (
              <div className="text-xs text-muted-foreground">
                要求: {node.requiredVersion}
              </div>
            )}
          </div>
        </div>

        {/* 子节点 */}
        {hasChildren && isExpanded && (
          <div>
            {node.dependencies.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }, [expandedNodes, selectedNodeId, handleNodeClick, toggleNode])

  return (
    <div className="flex h-full flex-col">
      {/* 搜索框 */}
      <div className="border-b p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t("common.placeholder.searchPackage")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* 树形列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredNodes.length > 0 ? (
            filteredNodes.map(node => renderNode(node, 0))
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              {searchQuery ? '未找到匹配的包' : '暂无依赖数据'}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
