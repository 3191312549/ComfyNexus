/**
 * MonitorCard 组件单元测试
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Cpu } from 'lucide-react'
import { MonitorCard, MonitorCardProps } from './MonitorCard'

describe('MonitorCard 组件', () => {
  describe('基本渲染', () => {
    it('应该正确渲染标签和数值', () => {
      render(
        <MonitorCard
          label="CPU占用"
          value={75}
          unit="%"
          color="green"
          icon={Cpu}
        />
      )
      
      expect(screen.getByText('CPU占用')).toBeInTheDocument()
      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('当数值为 null 时应该显示 "--"', () => {
      render(
        <MonitorCard
          label="GPU温度"
          value={null}
          unit="°C"
          color="red"
          icon={Cpu}
        />
      )
      
      expect(screen.getByText('GPU温度')).toBeInTheDocument()
      expect(screen.getByText('--')).toBeInTheDocument()
    })

    it('应该渲染图标', () => {
      const { container } = render(
        <MonitorCard
          label="内存"
          value={50}
          unit="%"
          color="blue"
          icon={Cpu}
        />
      )
      
      // 验证 SVG 图标存在
      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('进度条', () => {
    it('默认应该显示进度条', () => {
      const { container } = render(
        <MonitorCard
          label="CPU占用"
          value={75}
          unit="%"
          color="green"
          icon={Cpu}
        />
      )
      
      // 查找进度条容器
      const progressContainer = container.querySelector('.h-2.bg-gray-200')
      expect(progressContainer).toBeInTheDocument()
    })

    it('当 showProgressBar 为 false 时不应该显示进度条', () => {
      const { container } = render(
        <MonitorCard
          label="CPU温度"
          value={75}
          unit="°C"
          color="green"
          icon={Cpu}
          showProgressBar={false}
        />
      )
      
      const progressContainer = container.querySelector('.h-2.bg-gray-200')
      expect(progressContainer).not.toBeInTheDocument()
    })

    it('当数值为 null 时不应该显示进度条', () => {
      const { container } = render(
        <MonitorCard
          label="GPU占用"
          value={null}
          unit="%"
          color="green"
          icon={Cpu}
        />
      )
      
      const progressContainer = container.querySelector('.h-2.bg-gray-200')
      expect(progressContainer).not.toBeInTheDocument()
    })

    it('进度条宽度应该正确反映数值', () => {
      const { container } = render(
        <MonitorCard
          label="CPU占用"
          value={75}
          unit="%"
          color="green"
          icon={Cpu}
        />
      )
      
      const progressBar = container.querySelector('.h-full')
      expect(progressBar).toHaveStyle({ width: '75%' })
    })

    it('进度条宽度不应该超过 100%', () => {
      const { container } = render(
        <MonitorCard
          label="CPU占用"
          value={150}
          unit="%"
          color="green"
          icon={Cpu}
        />
      )
      
      const progressBar = container.querySelector('.h-full')
      expect(progressBar).toHaveStyle({ width: '100%' })
    })
  })

  describe('样式类', () => {
    it('卡片应该有悬停效果类', () => {
      const { container } = render(
        <MonitorCard
          label="CPU占用"
          value={75}
          unit="%"
          color="green"
          icon={Cpu}
        />
      )
      
      const card = container.firstChild as HTMLElement
      expect(card.className).toContain('hover:shadow-lg')
      expect(card.className).toContain('hover:border-blue-300')
    })

    it('应该包含深色主题样式', () => {
      const { container } = render(
        <MonitorCard
          label="CPU占用"
          value={75}
          unit="%"
          color="green"
          icon={Cpu}
        />
      )
      
      const card = container.firstChild as HTMLElement
      expect(card.className).toContain('dark:hover:border-blue-600')
    })
  })

  describe('不同单位', () => {
    it('应该正确显示百分比单位', () => {
      render(
        <MonitorCard
          label="CPU占用"
          value={75}
          unit="%"
          color="green"
          icon={Cpu}
        />
      )
      
      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('应该正确显示功率单位', () => {
      render(
        <MonitorCard
          label="CPU功率"
          value={65}
          unit="W"
          color="yellow"
          icon={Cpu}
        />
      )
      
      expect(screen.getByText('65W')).toBeInTheDocument()
    })

    it('应该正确显示温度单位', () => {
      render(
        <MonitorCard
          label="CPU温度"
          value={72}
          unit="°C"
          color="orange"
          icon={Cpu}
        />
      )
      
      expect(screen.getByText('72°C')).toBeInTheDocument()
    })
  })

  describe('边界情况', () => {
    it('应该处理数值为 0', () => {
      render(
        <MonitorCard
          label="CPU占用"
          value={0}
          unit="%"
          color="green"
          icon={Cpu}
        />
      )
      
      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('应该处理小数值', () => {
      render(
        <MonitorCard
          label="CPU占用"
          value={75.5}
          unit="%"
          color="green"
          icon={Cpu}
        />
      )
      
      expect(screen.getByText('75.5%')).toBeInTheDocument()
    })

    it('应该处理极大的数值', () => {
      render(
        <MonitorCard
          label="CPU占用"
          value={999}
          unit="%"
          color="green"
          icon={Cpu}
        />
      )
      
      expect(screen.getByText('999%')).toBeInTheDocument()
    })
  })
})
