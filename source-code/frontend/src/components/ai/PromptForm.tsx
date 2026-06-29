/**
 * 系统提示词预设表单组件
 * 
 * 用于创建或编辑系统提示词预设
 * 
 * 验证需求：4.2, 4.3, 4.5, 4.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 10.1, 10.2, 10.3
 */

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Label } from '../ui/label'
import type { SystemPromptPreset } from '../../stores/useSystemPromptStore'

interface PromptFormProps {
  preset?: SystemPromptPreset | null
  existingNames?: string[]
  onSave: (data: { name: string; content: string }) => Promise<void>
  onCancel: () => void
  className?: string
}

export const PromptForm: React.FC<PromptFormProps> = React.memo(({
  preset = null,
  existingNames = [],
  onSave,
  onCancel,
  className = ''
}) => {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [errors, setErrors] = useState<{ name?: string; content?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 初始化表单数据
  useEffect(() => {
    if (preset) {
      setName(preset.name)
      setContent(preset.content)
    } else {
      setName('')
      setContent('')
    }
    setErrors({})
  }, [preset])
  
  // 验证表单
  const validate = (): boolean => {
    const newErrors: { name?: string; content?: string } = {}
    
    // 验证名称
    if (!name.trim()) {
      newErrors.name = '预设名称不能为空'
    } else if (existingNames.includes(name.trim()) && (!preset || preset.name !== name.trim())) {
      newErrors.name = '预设名称已存在'
    }
    
    // 验证内容
    if (!content.trim()) {
      newErrors.content = '预设内容不能为空'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  // 处理提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      await onSave({
        name: name.trim(),
        content: content.trim()
      })
      
      // 成功后清空表单
      setName('')
      setContent('')
      setErrors({})
    } catch (error) {
      console.error('保存预设失败:', error)
      setErrors({
        content: '保存失败，请重试'
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // 处理取消
  const handleCancel = () => {
    setName('')
    setContent('')
    setErrors({})
    onCancel()
  }
  
  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {/* 名称输入 */}
      <div className="space-y-2">
        <Label htmlFor="preset-name">
          预设名称 <span className="text-danger">*</span>
        </Label>
        <Input
          id="preset-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("common.placeholder.promptNameExample")}
          className={errors.name ? 'border-danger' : ''}
          disabled={isSubmitting}
        />
        {errors.name && (
          <p className="text-xs text-danger">
            {errors.name}
          </p>
        )}
      </div>
      
      {/* 内容输入 */}
      <div className="space-y-2">
        <Label htmlFor="preset-content">
          预设内容 <span className="text-danger">*</span>
        </Label>
        <Textarea
          id="preset-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("common.placeholder.promptContent")}
          className={`min-h-[200px] font-mono text-sm ${errors.content ? 'border-danger' : ''}`}
          disabled={isSubmitting}
        />
        {errors.content && (
          <p className="text-xs text-danger">
            {errors.content}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          字符数：{content.length}
        </p>
      </div>
      
      {/* 操作按钮 */}
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          取消
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? '保存中...' : (preset ? '保存' : '创建')}
        </Button>
      </div>
    </form>
  )
})

PromptForm.displayName = 'PromptForm'
