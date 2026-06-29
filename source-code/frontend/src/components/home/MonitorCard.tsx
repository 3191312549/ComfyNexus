/**
 * MonitorCard 组件
 * 用于显示单个系统监控项的数据卡片
 * 
 * 特点：
 * - 渐变背景
 * - 大号数值显示
 * - 平滑动画
 * - 温度预警色彩
 */

import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * MonitorCard 组件属性
 */
export interface MonitorCardProps {
  /** 标签(如"CPU占用") */
  label: string
  /** 数值 */
  value: number | null
  /** 单位(如"%"、"W"、"°C") */
  unit: string
  /** 主题颜色 */
  color: string
  /** 图标组件 */
  icon: LucideIcon
  /** 是否显示进度条(默认true) */
  showProgressBar?: boolean
}

/**
 * 颜色映射表
 */
const colorMap: Record<string, { from: string; to: string; text: string; icon: string }> = {
  purple: { from: 'from-primary', to: 'to-primary/80', text: 'text-primary', icon: 'text-primary' },
  blue: { from: 'from-info', to: 'to-info/80', text: 'text-info', icon: 'text-info' },
  cyan: { from: 'from-info', to: 'to-info/80', text: 'text-info', icon: 'text-info' },
  green: { from: 'from-success', to: 'to-success/80', text: 'text-success', icon: 'text-success' },
  yellow: { from: 'from-warning', to: 'to-warning/80', text: 'text-warning', icon: 'text-warning' },
  orange: { from: 'from-warning', to: 'to-warning/80', text: 'text-warning', icon: 'text-warning' },
  indigo: { from: 'from-primary', to: 'to-primary/80', text: 'text-primary', icon: 'text-primary' },
  pink: { from: 'from-primary', to: 'to-primary/80', text: 'text-primary', icon: 'text-primary' },
  red: { from: 'from-danger', to: 'to-danger/80', text: 'text-danger', icon: 'text-danger' },
}

/**
 * 根据温度值获取预警颜色
 */
const getTemperatureColor = (temp: number, unit: string): string => {
  if (unit !== '°C') return ''
  if (temp >= 85) return 'red'
  if (temp >= 75) return 'orange'
  return 'green'
}

/**
 * MonitorCard 组件
 * 显示单个监控项的数据，支持进度条和温度预警
 */
export const MonitorCard: React.FC<MonitorCardProps> = ({
  label,
  value,
  unit,
  color,
  icon: Icon,
  showProgressBar = true,
}) => {
  const isTemperature = unit === '°C'
  const effectiveColor = isTemperature && value !== null
    ? getTemperatureColor(value, unit)
    : color

  const colors = colorMap[effectiveColor] || colorMap.blue

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl p-3',
        'bg-surface',
        'border border-border-subtle',
        'hover:shadow-lg hover:scale-105',
        'transition-all duration-300',
        'group'
      )}
    >
      <div
        className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-10',
          'bg-gradient-to-br',
          colors.from,
          colors.to,
          'transition-opacity duration-300'
        )}
      />

      <div className="relative">
        <div className="mb-2 flex items-center gap-2">
          <Icon className={cn('w-4 h-4', colors.icon)} />
          <span className="text-muted-foreground text-xs font-medium">
            {label}
          </span>
        </div>

        <div className={cn('text-2xl font-bold', colors.text)}>
          {value !== null ? (
            <>
              {value}
              <span className="ml-1 text-sm">{unit}</span>
            </>
          ) : (
            <span className="text-muted-foreground">--</span>
          )}
        </div>

        {showProgressBar && value !== null && (
          <div className="bg-border-subtle mt-2 h-1.5 overflow-hidden rounded-full">
            <div
              className={cn(
                'h-full transition-all duration-500 ease-out',
                'bg-gradient-to-r',
                colors.from,
                colors.to
              )}
              style={{ width: `${Math.min(value, 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default MonitorCard
