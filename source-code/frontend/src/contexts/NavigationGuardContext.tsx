/**
 * 导航守卫 Context
 * 用于在页面离开前进行拦截和确认
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface NavigationGuardContextType {
  // 注册导航守卫
  registerGuard: (guard: NavigationGuard) => void
  // 取消注册导航守卫
  unregisterGuard: () => void
  // 检查是否可以导航
  canNavigate: (path: string) => boolean
}

interface NavigationGuard {
  // 返回 true 表示允许导航，false 表示阻止导航
  beforeNavigate: (path: string) => boolean
}

const NavigationGuardContext = createContext<NavigationGuardContextType | undefined>(undefined)

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const [guard, setGuard] = useState<NavigationGuard | null>(null)

  const registerGuard = useCallback((newGuard: NavigationGuard) => {
    setGuard(newGuard)
  }, [])

  const unregisterGuard = useCallback(() => {
    setGuard(null)
  }, [])

  const canNavigate = useCallback((path: string): boolean => {
    if (!guard) return true
    return guard.beforeNavigate(path)
  }, [guard])

  return (
    <NavigationGuardContext.Provider value={{ registerGuard, unregisterGuard, canNavigate }}>
      {children}
    </NavigationGuardContext.Provider>
  )
}

export function useNavigationGuard() {
  const context = useContext(NavigationGuardContext)
  if (!context) {
    throw new Error('useNavigationGuard must be used within NavigationGuardProvider')
  }
  return context
}
