/**
 * SystemMonitorGrid 组件
 * 用于显示系统监控数据的3x3网格布局
 * 
 * 功能:
 * - 展示9个系统监控项（VRAM、内存、虚拟内存、CPU、GPU）
 * - 自动轮询刷新数据（每3秒）
 * - 响应式布局（小屏2列，中屏3列）
 * - 支持深色主题
 */

import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Cpu, MemoryStick, HardDrive, Zap, Thermometer, LucideIcon } from 'lucide-react'
import { MonitorCard } from './MonitorCard'
import { useSystemStore } from '@/stores/useSystemStore'
import type { SystemMonitorData } from '@/types/home'
import { cn } from '@/lib/utils'

/**
 * SystemMonitorGrid 组件属性
 */
export interface SystemMonitorGridProps {
  /** 自定义样式类名 */
  className?: string
}

/**
 * 监控项配置接口
 */
interface MonitorItemConfig {
  /** 数据键（支持点号分隔的嵌套键，如 'cpu.usage'） */
  key: string
  /** 显示标签 */
  label: string
  /** 单位 */
  unit: string
  /** 主题颜色 */
  color: string
  /** 图标名称（Lucide图标） */
  icon: string
}

// 注意：监控项配置已移至组件内部，使用 useTranslation 动态获取翻译

/**
 * 图标映射表
 */
const iconMap: Record<string, LucideIcon> = {
  'Cpu': Cpu,
  'MemoryStick': MemoryStick,
  'HardDrive': HardDrive,
  'Zap': Zap,
  'Thermometer': Thermometer,
}

/**
 * 获取图标组件
 * @param iconName - 图标名称
 * @returns Lucide 图标组件
 */
const getIcon = (iconName: string): LucideIcon => {
  return iconMap[iconName] || Cpu // 默认使用 Cpu 图标
}

/**
 * 从 SystemMonitorData 中提取嵌套数据
 * @param data - 监控数据对象
 * @param key - 数据键（支持点号分隔，如 'cpu.usage'）
 * @returns 提取的数值，如果不存在则返回 null
 * @example
 * getValueByKey(data, 'cpu.usage') // 返回 CPU 占用率
 * getValueByKey(data, 'vram.used') // 返回 VRAM 使用百分比
 */
const getValueByKey = (data: SystemMonitorData | null, key: string): number | null => {
  if (!data) return null
  
  const keys = key.split('.')
  let value: any = data
  
  for (const k of keys) {
    value = value?.[k]
    if (value === undefined || value === null) return null
  }
  
  return typeof value === 'number' ? value : null
}

/**
 * 判断是否显示进度条
 * @param unit - 单位
 * @returns 是否显示进度条
 */
const shouldShowProgressBar = (unit: string): boolean => {
  return unit === '%'
}

/**
 * SystemMonitorGrid 组件
 * 显示系统监控数据的3x3网格布局，支持自动刷新
 */
export const SystemMonitorGrid: React.FC<SystemMonitorGridProps> = ({ className }) => {
  const { t } = useTranslation()
  const {
    monitorData,
    monitorLoading,
    monitorError,
    startMonitorPolling,
    stopMonitorPolling,
  } = useSystemStore()

  // 监控项配置列表（使用国际化）
  const monitorItems: MonitorItemConfig[] = [
    // 第一排 - 内存类
    { key: 'vram.used', label: t('home.monitor.vram'), unit: t('home.monitor.unit.percent'), color: 'purple', icon: 'Cpu' },
    { key: 'memory.used', label: t('home.monitor.memory'), unit: t('home.monitor.unit.percent'), color: 'blue', icon: 'MemoryStick' },
    { key: 'virtual_memory.used', label: t('home.monitor.virtualMemory'), unit: t('home.monitor.unit.percent'), color: 'cyan', icon: 'HardDrive' },
    
    // 第二排 - CPU
    { key: 'cpu.usage', label: t('home.monitor.cpuUsage'), unit: t('home.monitor.unit.percent'), color: 'green', icon: 'Cpu' },
    { key: 'cpu.power', label: t('home.monitor.cpuPower'), unit: t('home.monitor.unit.watt'), color: 'yellow', icon: 'Zap' },
    { key: 'cpu.temperature', label: t('home.monitor.cpuTemperature'), unit: t('home.monitor.unit.celsius'), color: 'orange', icon: 'Thermometer' },
    
    // 第三排 - GPU
    { key: 'gpu.usage', label: t('home.monitor.gpuUsage'), unit: t('home.monitor.unit.percent'), color: 'indigo', icon: 'Cpu' },
    { key: 'gpu.power', label: t('home.monitor.gpuPower'), unit: t('home.monitor.unit.watt'), color: 'pink', icon: 'Zap' },
    { key: 'gpu.temperature', label: t('home.monitor.gpuTemperature'), unit: t('home.monitor.unit.celsius'), color: 'red', icon: 'Thermometer' },
  ]

  // 生命周期管理：启动和停止轮询
  useEffect(() => {
    console.log('[SystemMonitorGrid] 组件挂载，启动监控数据轮询')
    
    // 启动轮询
    startMonitorPolling()
    
    // 清理函数：组件卸载时停止轮询
    return () => {
      console.log('[SystemMonitorGrid] 组件卸载，停止监控数据轮询')
      stopMonitorPolling()
    }
  }, []) // 只在组件挂载时执行一次

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-foreground text-lg font-semibold">
          {t('home.systemMonitor')}
        </h3>
        
        <div className="flex items-center gap-2">
          {monitorError && (
            <span className="text-danger text-xs" title={monitorError}>
              {t('home.error.loadMonitorData')}
            </span>
          )}
          
          {monitorLoading && !monitorData && (
            <div className="flex items-center gap-1">
              <div className="bg-primary size-2 animate-pulse rounded-full" />
              <span className="text-xs text-muted-foreground">
                {t('common.loading')}
              </span>
            </div>
          )}
          
          {!monitorError && !monitorLoading && monitorData && (
            <div className="flex items-center gap-1">
              <div className="bg-success size-2 animate-pulse rounded-full" />
              <span className="text-success text-xs">
                {t('home.monitor.realtimeUpdate')}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* 网格容器 - 3x3 网格布局 */}
      <div className="grid grid-cols-3 gap-2">
        {monitorItems.map((item) => {
          const value = getValueByKey(monitorData, item.key)
          const Icon = getIcon(item.icon)
          const showProgressBar = shouldShowProgressBar(item.unit)
          
          return (
            <MonitorCard
              key={item.key}
              label={item.label}
              value={value}
              unit={item.unit}
              color={item.color}
              icon={Icon}
              showProgressBar={showProgressBar}
            />
          )
        })}
      </div>
      
      {/* 降级 UI - 当数据加载失败且没有缓存数据时显示 */}
      {monitorError && !monitorData && !monitorLoading && (
        <div className="py-4 text-center text-sm text-muted-foreground">
          <p>{t('home.error.loadMonitorData')}</p>
          <p className="mt-1 text-xs">{monitorError}</p>
        </div>
      )}
    </div>
  )
}

// 使用 React.memo 优化性能
export default React.memo(SystemMonitorGrid)
