/**
 * 配方编辑器弹窗组件
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Camera, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/NativeSelect'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { usePromptStore } from '@/stores/usePromptStore'
import { useTranslation } from 'react-i18next'
import type { Prompt, PromptCategory } from '@/stores/usePromptStore'

interface PromptEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prompt: Prompt | null
  categories: PromptCategory[]
  onSave: (data: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'isFavorite'>) => Promise<boolean>
}

interface FormData {
  name: string
  positivePrompt: string
  negativePrompt: string
  previewImage: string
  remark: string
  categoryId: string
  tags: string[]
}

export function PromptEditorDialog({
  open,
  onOpenChange,
  prompt,
  categories,
  onSave
}: PromptEditorDialogProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<FormData>({
    name: '',
    positivePrompt: '',
    negativePrompt: '',
    previewImage: '',
    remark: '',
    categoryId: '',
    tags: []
  })
  const [tagsInput, setTagsInput] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadImage = usePromptStore((state) => state.uploadImage)

  useEffect(() => {
    if (prompt) {
      setFormData({
        name: prompt.name,
        positivePrompt: prompt.positivePrompt,
        negativePrompt: prompt.negativePrompt,
        previewImage: prompt.previewImage,
        remark: prompt.remark,
        categoryId: prompt.categoryId,
        tags: prompt.tags
      })
      setTagsInput(prompt.tags.join(', '))
    } else {
      const availableCategories = categories.filter(c => c.id !== 'all' && c.id !== 'favorites')
      const defaultCategoryId = availableCategories.length > 0 ? availableCategories[0].id : ''
      setFormData({
        name: '',
        positivePrompt: '',
        negativePrompt: '',
        previewImage: '',
        remark: '',
        categoryId: defaultCategoryId,
        tags: []
      })
      setTagsInput('')
    }
  }, [prompt, categories])

  const updateField = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error(t('prompt.toast.imageSizeExceeded'))
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error(t('prompt.toast.imageFormatInvalid'))
      return
    }

    setIsUploading(true)

    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result as string
        const imagePath = await uploadImage(base64, file.name)
        if (imagePath) {
          updateField('previewImage', imagePath)
          toast.success(t('prompt.toast.imageUploadSuccess'))
        } else {
          toast.error(t('prompt.toast.imageUploadFailed'))
        }
        setIsUploading(false)
      }
      reader.onerror = () => {
        toast.error(t('prompt.toast.imageReadFailed'))
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('图片上传异常:', error)
      toast.error(t('prompt.toast.imageUploadFailed'))
      setIsUploading(false)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [uploadImage, updateField])

  const handleRemoveImage = useCallback(() => {
    updateField('previewImage', '')
  }, [updateField])

  const handleSave = useCallback(async () => {
    if (!formData.categoryId || formData.categoryId === 'all' || formData.categoryId === 'favorites') {
      toast.error(t('prompt.toast.selectCategory'))
      return
    }
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
    const success = await onSave({
      ...formData,
      tags
    })
    if (success) {
      onOpenChange(false)
    }
  }, [formData, tagsInput, onSave, onOpenChange, t])

  const getAvailableCategories = () => {
    const result: { value: string; label: string }[] = []
    categories.forEach((cat) => {
      if (cat.id !== 'all' && cat.id !== 'favorites') {
        result.push({ value: cat.id, label: cat.name })
        if (cat.children) {
          cat.children.forEach((child) => {
            result.push({ value: child.id, label: `　${child.name}` })
          })
        }
      }
    })
    return result
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {prompt ? t('prompt.editor.editTitle') : t('prompt.editor.addTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex gap-6">
            <div className="flex-shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageSelect}
              />
              {formData.previewImage ? (
                <div className="relative h-48 w-36 overflow-hidden rounded-lg border border-border-subtle bg-muted">
                  <img
                    src={formData.previewImage}
                    alt={t('prompt.editor.uploadPreview')}
                    className="h-full w-full object-cover"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 size-7 rounded-full bg-background/80 text-muted-foreground hover:bg-danger hover:text-primary-foreground"
                    onClick={handleRemoveImage}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  disabled={isUploading}
                  className="flex h-48 w-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-primary/50 bg-muted transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mb-2 size-6 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">{t('prompt.editor.uploading')}</span>
                    </>
                  ) : (
                    <>
                      <Camera className="mb-2 size-6 text-primary" />
                      <span className="text-xs text-muted-foreground">{t('prompt.editor.uploadPreview')}</span>
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('prompt.editor.nameLabel')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder={t('prompt.editor.namePlaceholder')}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label>{t('prompt.editor.categoryLabel')}</Label>
                  <NativeSelect
                    value={formData.categoryId}
                    onValueChange={(value) => updateField('categoryId', value)}
                  >
                    {getAvailableCategories().map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="flex-1 space-y-2">
                  <Label>{t('prompt.editor.tagsLabel')}</Label>
                  <Input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder={t('prompt.editor.tagsPlaceholder')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('prompt.editor.remarkLabel')}</Label>
                <Textarea
                  value={formData.remark}
                  onChange={(e) => updateField('remark', e.target.value)}
                  placeholder={t('prompt.editor.remarkPlaceholder')}
                  rows={2}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-success">{t('prompt.editor.positiveLabel')}</Label>
            <Textarea
              value={formData.positivePrompt}
              onChange={(e) => updateField('positivePrompt', e.target.value)}
              placeholder={t('prompt.editor.positivePlaceholder')}
              rows={3}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-danger">{t('prompt.editor.negativeLabel')}</Label>
            <Textarea
              value={formData.negativePrompt}
              onChange={(e) => updateField('negativePrompt', e.target.value)}
              placeholder={t('prompt.editor.negativePlaceholder')}
              rows={2}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('prompt.editor.cancel')}
          </Button>
          <Button onClick={handleSave}>
            {t('prompt.editor.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
