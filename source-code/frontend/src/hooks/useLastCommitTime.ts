import { useState, useEffect } from 'react'

export interface LastCommitTimeResult {
  timeDiff: string
  lastCommitDate: Date | null
  loading: boolean
  error: Error | null
}

export function useLastCommitTime(options?: { 
  enabled?: boolean,
  owner?: string,
  repo?: string,
  branch?: string 
}): LastCommitTimeResult {
  const enabled = options?.enabled !== false
  const owner = options?.owner || 'yawiii'
  const repo = options?.repo || 'ComfyUI-Prompt-Assistant'
  const branch = options?.branch || 'main'
  
  const [lastCommitDate, setLastCommitDate] = useState<Date | null>(null)
  const [timeDiff, setTimeDiff] = useState<string>('--小时--分钟--秒')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    const fetchLastCommit = async () => {
      try {
        setLoading(true)
        console.log('[useLastCommitTime] 开始获取最后一次提交时间...')
        
        const result = await window.pywebview.api.get_last_commit_time(owner, repo, branch)
        
        if (!result.success || !result.commit_date) {
          throw new Error(result.message || '获取最后提交时间失败')
        }
        
        const commitDate = new Date(result.commit_date)
        
        console.log('[useLastCommitTime] 最后一次提交时间:', commitDate)
        setLastCommitDate(commitDate)
        setError(null)
      } catch (err) {
        console.error('[useLastCommitTime] 获取最后一次提交失败:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setLoading(false)
      }
    }

    fetchLastCommit()
  }, [enabled, owner, repo, branch])

  useEffect(() => {
    if (!lastCommitDate) return

    const updateTimeDiff = () => {
      const now = new Date()
      const diff = now.getTime() - lastCommitDate.getTime()
      
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      
      setTimeDiff(`${hours}小时${minutes}分钟${seconds}秒`)
    }

    updateTimeDiff()
    const intervalId = setInterval(updateTimeDiff, 1000)

    return () => clearInterval(intervalId)
  }, [lastCommitDate])

  return { timeDiff, lastCommitDate, loading, error }
}

export default useLastCommitTime
