import { useState, useEffect } from 'react'
import { bridgeService } from '@/services/bridge'

const DEFAULT_VERSION = 'v0.1.0'

function formatVersion(rawVersion: string): string {
  console.log('[formatVersion] rawVersion:', rawVersion)
  const trimmed = rawVersion.trim()
  if (!trimmed) return DEFAULT_VERSION
  if (trimmed.startsWith('RC_')) {
    const versionNum = trimmed.replace('RC_', '')
    return `v${versionNum}-RC`
  }
  if (trimmed.startsWith('v')) {
    return trimmed
  }
  return `v${trimmed}`
}

export function useAppVersion(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false
  const [rawVersion, setRawVersion] = useState<string>('')
  const [version, setVersion] = useState<string>(DEFAULT_VERSION)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    
    const fetchVersion = async () => {
      try {
        setLoading(true)
        console.log('[useAppVersion] 开始获取版本号...')
        const raw = await bridgeService.getAppVersion()
        console.log('[useAppVersion] 原始版本号:', raw)
        console.log('[useAppVersion] typeof raw:', typeof raw)
        setRawVersion(raw)
        const formatted = formatVersion(raw)
        console.log('[useAppVersion] 格式化版本号:', formatted)
        setVersion(formatted)
        setError(null)
      } catch (err) {
        console.error('[useAppVersion] 获取版本失败:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setVersion(DEFAULT_VERSION)
      } finally {
        setLoading(false)
      }
    }
    
    fetchVersion()
  }, [enabled])
  return { version, rawVersion, loading, error }
}

export default useAppVersion
