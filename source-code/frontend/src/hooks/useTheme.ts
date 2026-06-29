/**
 * useTheme Hook - 提供便捷的主题访问接口
 */

import { useContext } from 'react'
import { ThemeContext, type Theme } from '@/contexts/ThemeContext'

interface UseThemeReturn {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  isDark: boolean
}

/**
 * 使用主题Hook
 * @returns 主题对象，包含当前主题、切换方法、设置方法和深色模式标志
 * @throws 如果在ThemeProvider外使用会抛出错误
 */
export function useTheme(): UseThemeReturn {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return {
    theme: context.theme,
    toggleTheme: context.toggleTheme,
    setTheme: context.setTheme,
    isDark: context.theme === 'dark',
  }
}
