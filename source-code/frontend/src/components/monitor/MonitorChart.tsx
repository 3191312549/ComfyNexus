import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { cn } from '@/lib/utils'

function resolveCssColor(cssVar: string): string {
  if (typeof window === 'undefined') return '#3b82f6'
  
  if (!cssVar.includes('hsl') || !cssVar.includes('var(')) {
    return cssVar
  }
  
  const tempDiv = document.createElement('div')
  tempDiv.style.color = cssVar
  document.body.appendChild(tempDiv)
  const computedColor = getComputedStyle(tempDiv).color
  document.body.removeChild(tempDiv)
  
  const match = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (match) {
    const r = parseInt(match[1]).toString(16).padStart(2, '0')
    const g = parseInt(match[2]).toString(16).padStart(2, '0')
    const b = parseInt(match[3]).toString(16).padStart(2, '0')
    return `#${r}${g}${b}`
  }
  
  return '#3b82f6'
}

interface MonitorChartProps {
  data: number[]
  color?: string
  height?: number
  className?: string
  max?: number
}

export function MonitorChart({
  data,
  color = 'hsl(var(--color-primary))',
  height = 60,
  className,
  max = 100
}: MonitorChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const colorRef = useRef(color)
  const maxRef = useRef(max)

  useEffect(() => {
    colorRef.current = color
    maxRef.current = max
  }, [color, max])

  useEffect(() => {
    if (!chartRef.current) return

    chartInstance.current = echarts.init(chartRef.current, undefined, {
      renderer: 'canvas'
    })

    return () => {
      chartInstance.current?.dispose()
      chartInstance.current = null
    }
  }, [])

  useEffect(() => {
    if (!chartInstance.current) return

    const currentColor = resolveCssColor(colorRef.current)
    const currentMax = maxRef.current

    const option: echarts.EChartsOption = {
      animation: false,
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: resolveCssColor('hsl(var(--border-subtle))')
          }
        },
        padding: [6, 10],
        textStyle: {
          fontSize: 12,
          fontFamily: 'JetBrains Mono, monospace'
        },
        backgroundColor: resolveCssColor('hsl(var(--bg-surface) / 0.9)'),
        borderColor: resolveCssColor('hsl(var(--border-subtle))')
      },
      grid: {
        top: 5,
        bottom: 0,
        left: -25,
        right: -25
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: Array(data.length).fill(''),
        axisLine: { show: false },
        splitLine: { show: false },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: currentMax,
        axisLine: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false }
      },
      series: [
        {
        type: 'line',
        smooth: false,
        showSymbol: false,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: currentColor },
        lineStyle: {
          width: 1.5,
          color: currentColor
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: currentColor },
            { offset: 1, color: 'transparent' }
          ]),
          opacity: 0.2
        },
        data
      }
      ]
    }

    chartInstance.current.setOption(option)
  }, [data, color, max])

  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.setOption({
        series: [{ data }]
      })
    }
  }, [data])

  useEffect(() => {
    const handleResize = () => {
      chartInstance.current?.resize()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div
      ref={chartRef}
      className={cn('w-full shrink-0', className)}
      style={{ height }}
    />
  )
}

interface NetworkChartProps {
  downData: number[]
  upData: number[]
  height?: number
  className?: string
}

function formatNetworkTooltip(mb: number): string {
  const kb = mb * 1024
  if (kb < 1024) {
    return `${kb.toFixed(0)} KB/s`
  }
  return `${mb.toFixed(1)} MB/s`
}

export function NetworkChart({
  downData,
  upData,
  height = 40,
  className
}: NetworkChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  const downColor = resolveCssColor('hsl(var(--color-success))')
  const upColor = resolveCssColor('hsl(var(--color-primary))')

  useEffect(() => {
    if (!chartRef.current) return

    chartInstance.current = echarts.init(chartRef.current, undefined, {
      renderer: 'canvas'
    })

    return () => {
      chartInstance.current?.dispose()
      chartInstance.current = null
    }
  }, [])

  useEffect(() => {
    if (!chartInstance.current) return

    const option: echarts.EChartsOption = {
      animation: false,
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: resolveCssColor('hsl(var(--border-subtle))')
          }
        },
        padding: [6, 10],
        textStyle: {
          fontSize: 12,
          fontFamily: 'JetBrains Mono, monospace'
        },
        backgroundColor: resolveCssColor('hsl(var(--bg-surface) / 0.9)'),
        borderColor: resolveCssColor('hsl(var(--border-subtle))'),
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return ''
          const down = params.find((p: any) => p.seriesName === '下行')
          const up = params.find((p: any) => p.seriesName === '上行')
          let result = ''
          if (down) {
            result += `↓ ${formatNetworkTooltip(down.value)}`
          }
          if (up) {
            result += `${down ? '<br/>' : ''}↑ ${formatNetworkTooltip(up.value)}`
          }
          return result
        }
      },
      grid: {
        top: 5,
        bottom: 0,
        left: -25,
        right: -25
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: Array(downData.length).fill(''),
        show: false
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 'dataMax',
        show: false
      },
      series: [
        {
          name: '下行',
          type: 'line',
          smooth: false,
          showSymbol: false,
          itemStyle: { color: downColor },
          lineStyle: { width: 1.5, color: downColor },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: downColor },
              { offset: 1, color: 'transparent' }
            ]),
            opacity: 0.2
          },
          data: downData
        },
        {
          name: '上行',
          type: 'line',
          smooth: false,
          showSymbol: false,
          itemStyle: { color: upColor },
          lineStyle: { width: 1.5, color: upColor },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: upColor },
              { offset: 1, color: 'transparent' }
            ]),
            opacity: 0.2
          },
          data: upData
        }
      ]
    }

    chartInstance.current.setOption(option)
  }, [downData, upData, downColor, upColor])

  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.setOption({
        series: [{ data: downData }, { data: upData }]
      })
    }
  }, [downData, upData])

  useEffect(() => {
    const handleResize = () => {
      chartInstance.current?.resize()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div
      ref={chartRef}
      className={cn('w-full shrink-0', className)}
      style={{ height }}
    />
  )
}
