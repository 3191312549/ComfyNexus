/**
 * 插件徽章初始化 Hook
 * 
 * 在应用启动时加载插件列表并更新徽章状态
 */

import { useEffect } from 'react'
import { useEnvStore } from '@/stores/useEnvStore'
import { pluginAPI } from '@/services/PluginAPIService'
import { usePluginUpdateBadgeStore } from '@/stores/usePluginUpdateBadgeStore'

/**
 * 初始化插件徽章
 * 
 * 在应用启动时调用，加载当前环境的插件列表并更新徽章
 */
export function usePluginBadgeInit() {
  const { currentEnvId } = useEnvStore()
  const { setUpdateCount } = usePluginUpdateBadgeStore()
  
  useEffect(() => {
    // 如果没有当前环境，不加载
    if (!currentEnvId) {
      console.log('[usePluginBadgeInit] 没有当前环境，跳过徽章初始化')
      return
    }
    
    // 加载插件列表并更新徽章
    const initBadge = async () => {
      try {
        console.log('[usePluginBadgeInit] 开始初始化徽章，环境ID:', currentEnvId)
        
        // 使用缓存加载插件列表（快速）
        const response = await pluginAPI.getPlugins(true)
        
        if (response.success && response.plugins) {
          // 统计待更新插件数量
          const updateCount = response.plugins.filter(p => p.has_update).length
          
          console.log('[usePluginBadgeInit] 徽章初始化完成:', {
            environmentId: currentEnvId,
            updateCount,
            hasUpdatePlugins: response.plugins.filter(p => p.has_update).map(p => p.name)
          })
          
          // 更新徽章状态
          setUpdateCount(currentEnvId, updateCount)
        } else {
          console.warn('[usePluginBadgeInit] 加载插件列表失败:', response.error)
        }
      } catch (error) {
        console.error('[usePluginBadgeInit] 初始化徽章异常:', error)
      }
    }
    
    initBadge()
  }, [currentEnvId, setUpdateCount])
}
