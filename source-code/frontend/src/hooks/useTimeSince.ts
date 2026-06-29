import { useState, useEffect } from 'react'

export interface UseTimeSinceOptions {
  startTime: string | Date
  enabled?: boolean
}

export interface UseTimeSinceResult {
  timeDiff: string
  loading: boolean
}

export function useTimeSince(options: UseTimeSinceOptions): UseTimeSinceResult {
  const { startTime, enabled = true } = options
  const [timeDiff, setTimeDiff] = useState<string>('--小时--分钟--秒')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    const startDate = typeof startTime === 'string' ? new Date(startTime) : startTime
    
    if (isNaN(startDate.getTime())) {
      setLoading(false)
      return
    }

    setLoading(false)

    const updateTimeDiff = () => {
      const now = new Date()
      const diff = now.getTime() - startDate.getTime()
      
      if (diff < 0) {
        setTimeDiff('即将开始')
        return
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      
      if (days > 0) {
        setTimeDiff(`${days}天${hours}小时${minutes}分钟${seconds}秒`)
      } else {
        setTimeDiff(`${hours}小时${minutes}分钟${seconds}秒`)
      }
    }

    updateTimeDiff()
    const intervalId = setInterval(updateTimeDiff, 1000)

    return () => clearInterval(intervalId)
  }, [startTime, enabled])

  return { timeDiff, loading }
}

export default useTimeSince
