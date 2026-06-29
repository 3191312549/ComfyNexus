/**
 * SwitchProgress 组件测试
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SwitchProgress } from './SwitchProgress'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'version.switching': '正在切换版本...',
        'version.checkingDependency': '正在检查依赖...',
        'version.restarting': '正在重启进程...',
        'version.switchSuccess': '版本切换成功',
      }
      return translations[key] || key
    },
  }),
}))

describe('SwitchProgress', () => {
  it('应该渲染所有步骤', () => {
    render(<SwitchProgress currentStep="switching" />)

    expect(screen.getByText('正在切换版本...')).toBeInTheDocument()
    expect(screen.getByText('正在检查依赖...')).toBeInTheDocument()
    expect(screen.getByText('正在重启进程...')).toBeInTheDocument()
  })

  it('应该高亮当前步骤', () => {
    const { container } = render(<SwitchProgress currentStep="dependency" />)

    const activeSteps = container.querySelectorAll('.bg-primary')
    expect(activeSteps.length).toBeGreaterThan(0)
  })

  it('应该显示已完成的步骤', () => {
    const { container } = render(<SwitchProgress currentStep="restarting" />)

    const completedSteps = container.querySelectorAll('.bg-green-500')
    expect(completedSteps.length).toBeGreaterThan(0)
  })

  it('应该显示错误信息', () => {
    render(
      <SwitchProgress currentStep="dependency" error="依赖更新失败" />
    )

    expect(screen.getByText('依赖更新失败')).toBeInTheDocument()
  })

  it('应该显示完成信息', () => {
    render(<SwitchProgress currentStep="completed" />)

    expect(screen.getByText('版本切换成功')).toBeInTheDocument()
  })

  it('应该显示加载动画', () => {
    const { container } = render(<SwitchProgress currentStep="switching" />)

    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('应该显示完成图标', () => {
    const { container } = render(<SwitchProgress currentStep="completed" />)

    const checkIcons = container.querySelectorAll('.lucide-check')
    expect(checkIcons.length).toBeGreaterThan(0)
  })
})
