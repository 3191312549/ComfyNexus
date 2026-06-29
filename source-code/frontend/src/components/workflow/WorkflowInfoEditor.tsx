/**
 * 工作流信息编辑组件
 */

import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import type { WorkflowInfoUpdate } from '@/types/workflow'

interface WorkflowInfoEditorProps {
  name: string
  description: string
  tags: string[]
  onSave: (info: WorkflowInfoUpdate) => void
  className?: string
}

export function WorkflowInfoEditor({
  name,
  description,
  tags: initialTags,
  onSave,
  className
}: WorkflowInfoEditorProps) {
  const { t } = useTranslation()
  const [isEditMode, setIsEditMode] = useState(false)
  const [editName, setEditName] = useState(name)
  const [editDescription, setEditDescription] = useState(description)
  const [editTags, setEditTags] = useState<string[]>(initialTags)
  const [newTagInput, setNewTagInput] = useState('')

  const handleToggleEdit = useCallback(() => {
    setEditName(name)
    setEditDescription(description)
    setEditTags(initialTags)
    setIsEditMode(!isEditMode)
  }, [isEditMode, name, description, initialTags])

  const handleSave = useCallback(() => {
    onSave({
      name: editName,
      description: editDescription,
      tags: editTags
    })
    setIsEditMode(false)
  }, [editName, editDescription, editTags, onSave])

  const handleAddTag = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTagInput.trim()) {
      e.preventDefault()
      const newTag = newTagInput.trim()
      if (!editTags.includes(newTag)) {
        setEditTags([...editTags, newTag])
      }
      setNewTagInput('')
    }
  }, [editTags, newTagInput])

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setEditTags(editTags.filter(tag => tag !== tagToRemove))
  }, [editTags])

  if (!isEditMode) {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <div className="mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[12px] font-bold text-foreground">
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            {t('workflow.info.title')}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleEdit}
            className="h-6 gap-1 border border-border-subtle bg-surface-hover px-2 text-[11px] text-foreground hover:bg-surface-active"
          >
            <Pencil className="h-3 w-3" />
            {t('common.edit')}
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {initialTags.map((tag, index) => (
            <span
              key={index}
              className={cn(
                'rounded border px-2 py-0.5 text-[11px]',
                index === 0
                  ? 'border-primary/20 bg-primary/10 text-primary'
                  : 'border-border-subtle bg-surface-active text-foreground'
              )}
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="min-h-[36px] text-[12px] leading-relaxed text-muted-foreground">
          {description}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[12px] font-bold text-foreground">
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          {t('workflow.info.title')}
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleEdit}
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            {t('common.cancel')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className="h-6 gap-1 border border-success/30 bg-success/10 px-2 text-[11px] text-success hover:bg-success/20"
          >
            <Check className="h-3 w-3" />
            {t('common.save')}
          </Button>
        </div>
      </div>

      <Input
        value={editName}
        onChange={(e) => setEditName(e.target.value)}
        className="h-8 bg-surface text-sm"
        placeholder={t('workflow.info.namePlaceholder')}
      />

      <div className="flex flex-wrap items-center gap-1.5 rounded border border-dashed border-border-subtle bg-surface p-1">
        {editTags.map((tag, index) => (
          <span
            key={index}
            className={cn(
              'group flex cursor-pointer items-center gap-1 rounded border px-2 py-0.5 text-[11px] transition-colors hover:bg-primary/20',
              index === 0
                ? 'border-primary/20 bg-primary/10 text-primary'
                : 'border-border-subtle bg-surface-active text-foreground hover:bg-surface-hover'
            )}
            onClick={() => handleRemoveTag(tag)}
          >
            {tag}
            <X className="h-2.5 w-2.5 opacity-60 transition-opacity hover:opacity-100" />
          </span>
        ))}
        <Input
          value={newTagInput}
          onChange={(e) => setNewTagInput(e.target.value)}
          onKeyDown={handleAddTag}
          placeholder={t('workflow.info.tagPlaceholder')}
          className="min-w-[100px] flex-1 border-0 bg-transparent px-1 py-0.5 text-[11px] placeholder-muted-foreground focus:ring-0"
        />
      </div>

      <Textarea
        value={editDescription}
        onChange={(e) => setEditDescription(e.target.value)}
        className="h-[60px] resize-none bg-surface text-[12px] placeholder-muted-foreground"
        placeholder={t('workflow.info.descriptionPlaceholder')}
      />
    </div>
  )
}
