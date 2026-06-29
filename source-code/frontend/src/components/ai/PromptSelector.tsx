/**
 * 系统提示词选择器组件
 * 
 * 在 AI 助手页面顶部显示，允许用户选择当前对话使用的系统提示词预设
 * 
 * 验证需求：1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select'
import { useSystemPromptStore } from '../../stores/useSystemPromptStore'

interface PromptSelectorProps {
  topicId: string | null
}

export const PromptSelector: React.FC<PromptSelectorProps> = React.memo(({
  topicId
}) => {
  const { t } = useTranslation()
  // 获取预设列表和状态管理方法
  const {
    presets,
    loadPresets,
    setActivePreset,
    getActivePreset,
    isLoading
  } = useSystemPromptStore()
  
  // 当前选中的预设 ID（null 表示"无"）
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
  
  // 加载预设列表（只在组件挂载时执行一次）
  useEffect(() => {
    loadPresets()
  }, [loadPresets])
  
  // 当对话 ID 变化时，加载对话的激活预设
  useEffect(() => {
    if (!topicId) {
      // 新对话，默认选择"无"
      setSelectedPresetId(null)
      return
    }
    
    // 从 store 获取激活预设
    const activePresetId = getActivePreset(topicId)
    setSelectedPresetId(activePresetId)
  }, [topicId, getActivePreset])
  
  // 处理预设选择
  const handlePresetChange = useCallback(async (value: string) => {
    // "none" 表示选择"无"
    const presetId = value === 'none' ? null : value
    
    if (!topicId) {
      // 新对话，只更新本地状态
      setSelectedPresetId(presetId)
      return
    }
    
    // 保存到后端
    const success = await setActivePreset(topicId, presetId)
    if (success) {
      setSelectedPresetId(presetId)
    }
  }, [topicId, setActivePreset])
  
  // 使用 useMemo 缓存当前选中的预设
  const selectedPreset = useMemo(() => {
    if (!selectedPresetId) return null
    return presets.find(p => p.id === selectedPresetId)
  }, [presets, selectedPresetId])
  
  // 使用 useMemo 缓存排序后的预设列表（按创建时间倒序）
  const sortedPresets = useMemo(() => {
    return [...presets].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [presets])
  
  const isDisabled = isLoading || !topicId

  return (
    <Select
      value={selectedPresetId || 'none'}
      onValueChange={handlePresetChange}
      disabled={isDisabled}
    >
      <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={t("common.placeholder.none")}>
            {selectedPreset ? (
              <span className="truncate">{selectedPreset.name}</span>
            ) : (
              '无'
            )}
          </SelectValue>
        </SelectTrigger>
        
        <SelectContent>
          {/* "无"选项 */}
          <SelectItem value="none">
            <span className="text-muted-foreground">{t('common.placeholder.none')}</span>
          </SelectItem>
          
          {/* 预设列表 */}
          {sortedPresets.map((preset) => (
            <SelectItem key={preset.id} value={preset.id}>
              <div className="flex flex-col items-start">
                <span className="font-medium">{preset.name}</span>
                <span className="max-w-[200px] truncate text-xs text-muted-foreground">
                  {preset.content.substring(0, 50)}...
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
  )
})

PromptSelector.displayName = 'PromptSelector'
