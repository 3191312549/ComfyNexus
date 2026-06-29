/**
 * 模型选择器组件
 * 
 * 在 AI 助手页面顶部显示，允许用户选择当前对话使用的 API 配置
 * 
 * 性能优化：
 * - 使用 React.memo 避免不必要的重渲染
 * - 使用 useMemo 和 useCallback 缓存计算结果和回调函数
 * - 优化 useEffect 依赖项
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select'
import { useAPIConfigStore } from '../../stores/useAPIConfigStore'
import { useModelSelectorStore } from '../../stores/useModelSelectorStore'
import { AlertCircle } from 'lucide-react'

interface ModelSelectorProps {
  topicId: string | null
  onNavigateToSettings?: () => void
}

export const ModelSelector: React.FC<ModelSelectorProps> = React.memo(({
  topicId,
  onNavigateToSettings
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  
  // 获取配置列表
  const { configs, loadConfigs } = useAPIConfigStore()
  
  // 获取模型选择器状态
  const {
    getActiveConfig,
    setActiveConfig,
    getConfigForNewTopic,
    defaultConfigId,
    loadDefaultConfig,
    isLoading
  } = useModelSelectorStore()
  
  // 当前选中的配置 ID
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null)
  
  // 加载配置列表和默认配置（只在组件挂载时执行一次）
  useEffect(() => {
    loadConfigs()
    loadDefaultConfig()
  }, [loadConfigs, loadDefaultConfig])
  
  // 当对话 ID 变化时，加载对话的激活配置
  useEffect(() => {
    const loadTopicConfig = async () => {
      if (!topicId) {
        // 新对话，使用默认配置
        const defaultConfig = getConfigForNewTopic()
        setSelectedConfigId(defaultConfig)
        return
      }
      
      // 先从缓存中获取
      const cachedConfigId = getActiveConfig(topicId)
      if (cachedConfigId) {
        setSelectedConfigId(cachedConfigId)
        return
      }
      
      // 缓存未命中，从后端加载
      try {
        // 等待 pywebview API 就绪
        if (window.pywebview && window.pywebview.api) {
          const response = await window.pywebview.api.ai_get_topic_config(topicId)
          
          if (response.success && response.config_id) {
            setSelectedConfigId(response.config_id)
          } else {
            // 如果对话没有激活配置，使用默认配置
            setSelectedConfigId(defaultConfigId)
          }
        } else {
          // 开发环境，使用默认配置
          setSelectedConfigId(defaultConfigId)
        }
      } catch (error) {
        console.error('加载对话配置失败:', error)
        // 出错时使用默认配置
        setSelectedConfigId(defaultConfigId)
      }
    }
    
    loadTopicConfig()
  }, [topicId, defaultConfigId, getActiveConfig, getConfigForNewTopic])
  
  // 处理配置选择（使用 useCallback 避免重新创建）
  const handleConfigChange = useCallback(async (configId: string) => {
    if (!topicId) {
      // 新对话，只更新本地状态
      setSelectedConfigId(configId)
      return
    }
    
    // 保存到后端
    const success = await setActiveConfig(topicId, configId)
    if (success) {
      setSelectedConfigId(configId)
    }
  }, [topicId, setActiveConfig])
  
  // 跳转到 API 设置页面（使用 useCallback 避免重新创建）
  const handleNavigateToSettings = useCallback(() => {
    if (onNavigateToSettings) {
      // 如果提供了回调函数，使用回调（用于选项卡切换）
      onNavigateToSettings()
    } else {
      // 否则使用路由导航（用于其他页面）
      navigate('/ai-assistant')
    }
  }, [onNavigateToSettings, navigate])
  
  // 使用 useMemo 缓存当前选中的配置
  const selectedConfig = useMemo(() => {
    return configs.find(c => c.id === selectedConfigId)
  }, [configs, selectedConfigId])
  
  // 使用 useMemo 缓存配置列表是否为空的判断
  const isConfigsEmpty = useMemo(() => {
    return configs.length === 0
  }, [configs.length])
  
  // 如果配置列表为空
  if (isConfigsEmpty) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2">
        <AlertCircle className="size-4 text-warning" />
        <span className="text-sm text-warning">
          暂无配置，请先
        </span>
        <Button
          onClick={handleNavigateToSettings}
          variant="link"
          className="p-0 text-sm"
        >
          添加配置
        </Button>
      </div>
    )
  }
  
  const isDisabled = isLoading || !topicId

  return (
    <Select
      value={selectedConfigId || undefined}
      onValueChange={handleConfigChange}
      disabled={isDisabled}
    >
      <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={t("common.placeholder.selectConfig")}>
            {selectedConfig ? (
              <div className="flex items-center gap-2">
                <span className="truncate">{selectedConfig.alias}</span>
                {selectedConfig.status === 'unavailable' && (
                  <AlertCircle className="size-3 shrink-0 text-danger" />
                )}
              </div>
            ) : (
              '选择配置'
            )}
          </SelectValue>
        </SelectTrigger>
        
        <SelectContent>
          {configs.map((config) => (
            <SelectItem key={config.id} value={config.id}>
              <div className="flex w-full items-center justify-between gap-2">
                <div className="flex flex-col items-start">
                  <span className="font-medium">{config.alias}</span>
                  <span className="text-xs text-muted-foreground">
                    {config.provider} / {config.model}
                  </span>
                </div>
                {config.isDefault && (
                  <span className="bg-plugin-primary/10 text-plugin-primary rounded px-1.5 py-0.5 text-xs">
                    默认
                  </span>
                )}
                {config.status === 'unavailable' && (
                  <AlertCircle className="size-3 shrink-0 text-danger" />
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
  )
})
