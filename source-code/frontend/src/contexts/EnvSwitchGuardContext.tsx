/**
 * 环境切换守卫 Context
 * 用于在切换环境前检查是否有未保存的修改
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface EnvSwitchGuard {
  beforeSwitch: (targetEnvId: string) => Promise<boolean>
}

interface EnvSwitchGuardContextType {
  registerGuard: (guard: EnvSwitchGuard) => void
  unregisterGuard: () => void
  checkBeforeSwitch: (targetEnvId: string) => Promise<boolean>
}

const EnvSwitchGuardContext = createContext<EnvSwitchGuardContextType | undefined>(undefined)

export function EnvSwitchGuardProvider({ children }: { children: ReactNode }) {
  const [guard, setGuard] = useState<EnvSwitchGuard | null>(null)

  const registerGuard = useCallback((newGuard: EnvSwitchGuard) => {
    setGuard(newGuard)
  }, [])

  const unregisterGuard = useCallback(() => {
    setGuard(null)
  }, [])

  const checkBeforeSwitch = useCallback(async (targetEnvId: string): Promise<boolean> => {
    if (guard) {
      return await guard.beforeSwitch(targetEnvId)
    }
    return true // 没有守卫，允许切换
  }, [guard])

  return (
    <EnvSwitchGuardContext.Provider value={{ registerGuard, unregisterGuard, checkBeforeSwitch }}>
      {children}
    </EnvSwitchGuardContext.Provider>
  )
}

export function useEnvSwitchGuard() {
  const context = useContext(EnvSwitchGuardContext)
  if (!context) {
    throw new Error('useEnvSwitchGuard must be used within EnvSwitchGuardProvider')
  }
  return context
}
