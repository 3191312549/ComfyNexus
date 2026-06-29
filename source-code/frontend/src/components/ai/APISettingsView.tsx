/**
 * API 设置视图组件（多配置管理模式）
 * 
 * 功能：
 * - 配置列表视图（显示所有配置）
 * - 配置表单视图（创建/编辑配置）
 * - 视图切换（列表 <-> 表单）
 * 
 * 验证需求：1.1, 1.2, 3.1, 3.2
 */

import React, { useState } from 'react'
import { APIConfigListView } from './APIConfigListView'
import { APIConfigFormView } from './APIConfigFormView'

/**
 * 视图模式类型
 */
type ViewMode = 'list' | 'create' | 'edit'

/**
 * API 设置视图组件
 */
export const APISettingsView: React.FC = () => {
  // 视图状态
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [editingConfigId, setEditingConfigId] = useState<string | undefined>(undefined)
  
  /**
   * 切换到列表视图
   */
  const handleShowList = () => {
    console.log('[APISettingsView] 切换到列表视图')
    setViewMode('list')
    setEditingConfigId(undefined)
  }
  
  /**
   * 切换到创建视图
   */
  const handleShowCreate = () => {
    console.log('[APISettingsView] 切换到创建视图')
    setViewMode('create')
    setEditingConfigId(undefined)
  }
  
  /**
   * 切换到编辑视图
   */
  const handleShowEdit = (configId: string) => {
    console.log('[APISettingsView] 切换到编辑视图:', configId)
    setViewMode('edit')
    setEditingConfigId(configId)
  }
  
  /**
   * 处理表单保存成功
   */
  const handleFormSave = () => {
    console.log('[APISettingsView] 表单保存成功，返回列表')
    handleShowList()
  }
  
  /**
   * 处理表单取消
   */
  const handleFormCancel = () => {
    console.log('[APISettingsView] 表单取消，返回列表')
    handleShowList()
  }
  
  // 渲染当前视图
  return (
    <div className="size-full">
      {viewMode === 'list' ? (
        <APIConfigListView 
          key={Date.now()} // 使用时间戳作为 key，每次切换到列表视图时强制刷新
          onAddConfig={handleShowCreate}
          onEditConfig={handleShowEdit}
        />
      ) : (
        <APIConfigFormView
          configId={editingConfigId}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  )
}

/**
 * 默认导出
 */
export default APISettingsView
