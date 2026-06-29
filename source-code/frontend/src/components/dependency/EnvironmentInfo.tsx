/**
 * 环境信息显示组件
 * 
 * 显示当前 Python 环境的详细信息
 */

import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export interface EnvironmentInfo {
  pythonPath: string
  pythonVersion: string
}

interface EnvironmentInfoProps {
  className?: string
}

export default function EnvironmentInfo({ className = '' }: EnvironmentInfoProps) {
  const { t } = useTranslation()
  const [envInfo, setEnvInfo] = useState<EnvironmentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadEnvironmentInfo()
  }, [])

  const loadEnvironmentInfo = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // 调用后端 API 获取环境信息
      const result = await window.pywebview.api.dependency_detect_environment()
      
      if (result.success && result.env_info) {
        // 使用类型断言来处理后端可能返回的不同字段结构
        const env = result.env_info as any
        setEnvInfo({
          pythonPath: env.python?.path || env.python_path || '',
          pythonVersion: env.python?.version || env.python_version || ''
        })
      } else {
        setError(result.error_message || '获取环境信息失败')
      }
    } catch (err: any) {
      setError(err.message || '获取环境信息失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Alert className={className}>
        <Info className="size-4" />
        <AlertTitle>{t("dependency.envInfo")}</AlertTitle>
        <AlertDescription>{t("dependency.loadingEnvInfo")}</AlertDescription>
      </Alert>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="size-4" />
        <AlertTitle>{t("dependency.envError")}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!envInfo) {
    return null
  }

  // 检查环境是否正常
  const isHealthy = envInfo.pythonPath && envInfo.pythonVersion

  return (
    <Alert 
      variant={isHealthy ? 'default' : 'destructive'} 
      className={className}
    >
      {isHealthy ? (
        <CheckCircle2 className="size-4" />
      ) : (
        <AlertCircle className="size-4" />
      )}
      <AlertTitle>{t('dependency.pythonEnvInfo')}</AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="dark:text-dark-text-primary text-gray-700 font-medium">{t('dependency.pythonPath')}:</span>
            <span className="dark:text-dark-text-secondary text-gray-600 truncate font-mono">
              {envInfo.pythonPath}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="dark:text-dark-text-primary text-gray-700 font-medium">{t('dependency.pythonVersion')}:</span>
            <span className="dark:text-dark-text-secondary text-gray-600">
              {envInfo.pythonVersion}
            </span>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}
