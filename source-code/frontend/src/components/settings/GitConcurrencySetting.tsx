/**
 * Git 并发数配置组件
 * 用于配置插件管理中 Git 操作的并发数量
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GitConcurrencySettingProps {
  value: number
  onChange: (value: number) => void
  className?: string
}

/**
 * Git 并发数配置组件
 * 
 * 功能：
 * - 提供数字输入框，范围 1-32
 * - 实时验证输入值
 * - 超过 32 时显示警告信息
 * - 支持配置保存和加载
 * 
 * @param value - 当前并发数值
 * @param onChange - 值变化回调
 * @param className - 自定义样式类名
 */
export function GitConcurrencySetting({ value, onChange, className }: GitConcurrencySettingProps) {
  const { t } = useTranslation()
  const [localValue, setLocalValue] = useState<string>(value.toString())
  const [warning, setWarning] = useState<string>('')
  const [error, setError] = useState<string>('')

  // 同步外部值到本地状态
  useEffect(() => {
    setLocalValue(value.toString())
  }, [value])

  /**
   * 处理输入变化
   * 验证范围并更新状态
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    setLocalValue(inputValue)

    // 清空之前的警告和错误
    setWarning('')
    setError('')

    // 允许空值（用户正在输入）
    if (inputValue === '') {
      return
    }

    // 解析数值
    const numValue = parseInt(inputValue, 10)

    // 验证是否为有效数字
    if (isNaN(numValue)) {
      setError(t('settings.gitConcurrency.invalidNumber'))
      return
    }

    // 验证范围
    if (numValue < 1) {
      setError(t('settings.gitConcurrency.minError'))
      return
    }

    if (numValue > 32) {
      setWarning(t('settings.gitConcurrency.highWarning'))
      // 仍然允许设置，但显示警告
      onChange(numValue)
      return
    }

    // 有效值，触发回调
    onChange(numValue)
  }

  /**
   * 处理失焦事件
   * 如果输入为空或无效，恢复到默认值
   */
  const handleBlur = () => {
    if (localValue === '' || isNaN(parseInt(localValue, 10))) {
      const defaultValue = 10
      setLocalValue(defaultValue.toString())
      onChange(defaultValue)
      setError('')
      setWarning('')
    } else {
      const numValue = parseInt(localValue, 10)
      // 限制在 1-32 范围内
      const clampedValue = Math.max(1, Math.min(32, numValue))
      if (clampedValue !== numValue) {
        setLocalValue(clampedValue.toString())
        onChange(clampedValue)
        setError('')
        if (clampedValue === 32) {
          setWarning(t('settings.gitConcurrency.highWarning'))
        }
      }
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* 标签和输入框 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('settings.gitConcurrency.label')}</label>
        <Input
          type="number"
          min={1}
          max={32}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn(
            'w-full',
            error && 'border-danger focus:ring-danger',
            warning && 'border-warning focus:ring-warning'
          )}
          placeholder={t('settings.gitConcurrency.placeholder')}
        />
        <p className="text-xs text-muted-foreground">
          {t('settings.gitConcurrency.hint')}
        </p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 p-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* 警告提示 */}
      {warning && (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-sm text-warning">{warning}</p>
        </div>
      )}
    </div>
  )
}
