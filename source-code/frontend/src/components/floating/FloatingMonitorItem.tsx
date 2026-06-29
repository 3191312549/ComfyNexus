/**
 * 悬浮窗监控项组件
 * 显示单个监控项的精简数据，参照原型设计
 * 布局：标签+温度小字 | 进度条 | 百分比值
 */

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { MonitorData } from '@/types/monitor'

interface FloatingMonitorItemProps {
  id: string
  label: string
  data: MonitorData | null
}

function formatNetworkSpeed(mb: number): { value: string; unit: string } {
  const kb = mb * 1024
  if (kb < 1024) {
    return { value: kb.toFixed(0), unit: 'KB/s' }
  }
  return { value: mb.toFixed(1), unit: 'MB/s' }
}

function getProgressColor(percent: number): string {
  if (percent >= 85) return 'danger'
  if (percent >= 70) return 'warning'
  return ''
}

export function FloatingMonitorItem({ id, label, data }: FloatingMonitorItemProps) {
  const content = useMemo(() => {
    if (!data) {
      return {
        temp: null,
        percent: null,
        sparkWidth: 0,
        sparkColor: '',
        netValue: null,
      }
    }

    switch (id) {
      case 'cpu': {
        const percent = data.cpu.load
        return {
          temp: `${data.cpu.temp}°C`,
          percent,
          sparkWidth: percent,
          sparkColor: getProgressColor(percent),
          netValue: null,
        }
      }
      case 'gpu': {
        const percent = data.gpu.load
        return {
          temp: `${data.gpu.temp}°C`,
          percent,
          sparkWidth: percent,
          sparkColor: getProgressColor(percent),
          netValue: null,
        }
      }
      case 'ram': {
        const percent = data.sys.ram.percent
        return {
          temp: null,
          percent: percent.toFixed(0),
          sparkWidth: percent,
          sparkColor: getProgressColor(percent),
          netValue: null,
        }
      }
      case 'vram': {
        const percent = data.sys.vram.percent
        return {
          temp: null,
          percent: percent.toFixed(0),
          sparkWidth: percent,
          sparkColor: getProgressColor(percent),
          netValue: null,
        }
      }
      case 'net': {
        const down = formatNetworkSpeed(data.net.down)
        return {
          temp: null,
          percent: null,
          sparkWidth: 0,
          sparkColor: '',
          netValue: `${down.value}`,
          netUnit: down.unit,
        }
      }
      case 'page': {
        const percent = data.sys.page.used
        return {
          temp: null,
          percent: percent.toFixed(0),
          sparkWidth: percent,
          sparkColor: getProgressColor(percent),
          netValue: null,
        }
      }
      default:
        return {
          temp: null,
          percent: null,
          sparkWidth: 0,
          sparkColor: '',
          netValue: null,
        }
    }
  }, [id, data])

  if (id === 'net') {
    return (
      <div className="floating-item">
        <div className="floating-item-label">{label}</div>
        <div className="floating-item-spark" style={{ background: 'transparent' }} />
        <div className="floating-item-value net">
          {content.netValue}
          <span className="floating-item-unit">{content.netUnit}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="floating-item">
      <div className="floating-item-label">
        {label}
        {content.temp && <span className="floating-item-temp">{content.temp}</span>}
      </div>
      <div className="floating-item-spark">
        <div
          className={cn('floating-item-spark-fill', content.sparkColor)}
          style={{ width: `${content.sparkWidth}%` }}
        />
      </div>
      <div className="floating-item-value">
        {content.percent}
        <span className="floating-item-unit">%</span>
      </div>
    </div>
  )
}
