/**
 * 极客模式编辑器组件
 * 
 * 功能：
 * - 集成带行号的文本框
 * - 显示参数格式说明
 * - 参数验证和错误提示
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { LineNumberTextarea } from './LineNumberTextarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, AlertCircle } from 'lucide-react'

export interface GeekModeEditorProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
}

interface ValidationError {
  line: number
  message: string
}

export function GeekModeEditor({
  value, onChange, onBlur }: GeekModeEditorProps) {
  const { t } = useTranslation()
  const [errors, setErrors] = useState<ValidationError[]>([])

  // 验证参数格式
  const validateArgs = (args: string): ValidationError[] => {
    const errors: ValidationError[] = []
    const lines = args.split('\n')

    lines.forEach((line, index) => {
      const trimmed = line.trim()

      // 忽略空行和注释
      if (!trimmed || trimmed.startsWith('#')) {
        return
      }

      // 检查是否以 -- 开头
      if (!trimmed.startsWith('--')) {
        errors.push({
          line: index + 1,
          message: '参数必须以 "--" 开头'
        })
        return
      }

      // 检查参数名称格式
      const parts = trimmed.split(/\s+/)
      const paramName = parts[0].substring(2) // 移除 --

      if (!/^[a-zA-Z0-9_-]+$/.test(paramName)) {
        errors.push({
          line: index + 1,
          message: '参数名称只能包含字母、数字、下划线和连字符'
        })
      }
    })

    return errors
  }

  // 实时验证
  useEffect(() => {
    const validationErrors = validateArgs(value)
    setErrors(validationErrors)
  }, [value])

  return (
    <div className="space-y-4">
      {/* 参数格式说明 */}
      <Alert className="border-border bg-surface">
        <Info className="size-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">{t("env.geekMode.paramFormat")}:</p>
            <ul className="list-inside list-disc space-y-1 text-sm">
              <li>{t('env.geekMode.argPerLine')}</li>
              <li>{t('env.geekMode.supportComment')}</li>
              <li>{t('env.geekMode.argExample')}</li>
              <li className="text-muted-foreground">
                {t('env.geekMode.argTip')}
              </li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      {/* 文本编辑器 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("env.geekMode.startupArgs")}</label>
        <LineNumberTextarea
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          errors={errors}
          placeholder={t("common.placeholder.startupArgsExample")}
        />
      </div>

      {/* 错误提示 */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">{t("env.geekMode.paramError")}:</p>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {errors.map((err, idx) => (
                  <li key={idx}>
                    {t('env.geekMode.lineError', { line: err.line, message: err.message })}
                  </li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
