/**
 * LoRA 卡片组件
 * 
 * 支持两种显示模式：
 * - default: 标准卡片模式，固定布局
 * - minimal: 极简模式，悬停展开显示详细信息
 */

import { useState, useRef, useEffect, useCallback, forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { ExternalLink, ChevronLeft, ChevronRight, Upload, Tag, Plus, StickyNote, ImageOff, HardDrive, Loader2, Trash2, Eye, EyeOff, Check } from 'lucide-react'
import { bridgeService } from '@/services/bridge'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { ConfirmDialog } from '@/components/common'

interface LoraCardProps {
  id: string
  name: string
  triggerWords: string[]
  tags: string[]
  defaultWeight?: string
  recommendedSampler?: string
  civitaiUrl?: string
  notes?: string
  sizeKb?: number
  previewUrl?: string
  isLocal?: boolean | null
  previewBlurred?: boolean
  previewShortEdge?: number
  onCopyTriggerWord: (word: string) => void
  onRename?: (modelId: string, newName: string) => void
  onTagsChange?: (modelId: string, newTags: string[]) => void
  onNotesChange?: (modelId: string, newNotes: string) => void
  onPreviewBlurredChange?: (modelId: string, blurred: boolean) => void
  onDelete?: (modelId: string) => void
  variant?: 'default' | 'minimal'
  isBatchMode?: boolean
  isSelected?: boolean
  onSelect?: (id: string) => void
  onDragStart?: (modelId: string, clientX: number, clientY: number) => void
  forceCollapsed?: boolean
}

const getDisplayName = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf('.')
  return lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName
}

const formatSize = (sizeKb?: number): string => {
  if (!sizeKb) return ''
  if (sizeKb < 1024) return `${sizeKb.toFixed(1)} KB`
  if (sizeKb < 1024 * 1024) return `${(sizeKb / 1024).toFixed(1)} MB`
  return `${(sizeKb / 1024 / 1024).toFixed(1)} GB`
}

const isVideoFile = (filename: string): boolean => {
  const ext = filename.split('.').pop()?.toLowerCase()
  return ext === 'mp4' || ext === 'webm' || ext === 'mov'
}

export const LoraCard = forwardRef<HTMLDivElement, LoraCardProps>(function LoraCard({
  id,
  name,
  triggerWords,
  tags,
  defaultWeight,
  recommendedSampler,
  civitaiUrl,
  notes,
  sizeKb,
  previewUrl: _previewUrl,
  isLocal,
  previewBlurred,
  previewShortEdge = 234,
  onCopyTriggerWord,
  onRename,
  onTagsChange,
  onNotesChange,
  onPreviewBlurredChange,
  onDelete,
  variant = 'default',
  isBatchMode = false,
  isSelected = false,
  onSelect,
  onDragStart,
  forceCollapsed = false,
}, ref) {
  const { t } = useTranslation()
  
  // 通用状态
  const [previewFiles, setPreviewFiles] = useState<string[]>([])
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0)
  const [isUploadingPreview, setIsUploadingPreview] = useState(false)
  const [isBlurred, setIsBlurred] = useState(previewBlurred ?? false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [dontAskDeletePreview, setDontAskDeletePreview] = useState(() => {
    return sessionStorage.getItem('lora_dont_ask_delete_preview') === 'true'
  })
  
  const [showDeleteModelConfirm, setShowDeleteModelConfirm] = useState(false)
  const [isDeletingModel, setIsDeletingModel] = useState(false)
  const [dontAskDeleteModel, setDontAskDeleteModel] = useState(() => {
    return sessionStorage.getItem('lora_dont_ask_delete_model') === 'true'
  })
  
  // 编辑状态
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedName, setEditedName] = useState(getDisplayName(name))
  const [isRenaming, setIsRenaming] = useState(false)
  const [editedTriggerWords, setEditedTriggerWords] = useState<string[]>(triggerWords)
  const [newTriggerWord, setNewTriggerWord] = useState('')
  const [isAddingTrigger, setIsAddingTrigger] = useState(false)
  const [editedTags, setEditedTags] = useState<string[]>(tags)
  const [newTag, setNewTag] = useState('')
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [editedWeight, setEditedWeight] = useState(defaultWeight || '')
  const [editedSampler, setEditedSampler] = useState(recommendedSampler || '')
  const [editedNotes, setEditedNotes] = useState(notes || '')
  
  // 标准模式状态
  const [isHovered, setIsHovered] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const isMouseInCard = useRef(false)
  
  // 极简模式状态
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandDirection, setExpandDirection] = useState<'right' | 'left'>('right')
  const cardRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const expandTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Refs
  const titleInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 拖拽相关
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null)
  const isDragTriggeredRef = useRef(false)

  // 同步外部 props
  useEffect(() => { setIsBlurred(previewBlurred ?? false) }, [previewBlurred])
  useEffect(() => { setEditedTriggerWords(triggerWords) }, [triggerWords])
  useEffect(() => { setEditedTags(tags) }, [tags])
  useEffect(() => { setEditedNotes(notes || '') }, [notes])
  useEffect(() => { setEditedName(getDisplayName(name)) }, [name])
  useEffect(() => { setEditedWeight(defaultWeight || '') }, [defaultWeight])
  useEffect(() => { setEditedSampler(recommendedSampler || '') }, [recommendedSampler])

  // 加载预览图
  const loadPreviewFiles = useCallback(async () => {
    try {
      const result = await bridgeService.loraGetPreviewList(id)
      if (result.success && result.files) {
        setPreviewFiles(result.files)
      }
    } catch (error) {
      console.error('加载预览图失败:', error)
    }
  }, [id])

  useEffect(() => {
    loadPreviewFiles()
  }, [loadPreviewFiles])

  // 极简模式：监听点击外部区域
  useEffect(() => {
    if (variant !== 'minimal') return
    
    const handleDocumentClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (isAddingTrigger || isAddingTag) {
          setIsAddingTrigger(false)
          setIsAddingTag(false)
          setNewTriggerWord('')
          setNewTag('')
        }
      }
    }

    if (isEditingTitle || isAddingTrigger || isAddingTag) {
      document.addEventListener('click', handleDocumentClick)
      return () => document.removeEventListener('click', handleDocumentClick)
    }
  }, [variant, isEditingTitle, isAddingTrigger, isAddingTag])

  // 获取预览图 URL
  const getPreviewUrl = useCallback((filename: string): string => {
    return `/lora/preview/${id}/${filename}`
  }, [id])

  // 标题编辑处理
  const handleTitleClick = () => {
    setIsEditingTitle(true)
    setTimeout(() => titleInputRef.current?.select(), 0)
  }

  const handleTitleBlur = async () => {
    setIsEditingTitle(false)
    if (variant === 'default') {
      setIsInputFocused(false)
      setTimeout(() => {
        if (!isMouseInCard.current) setIsHovered(false)
      }, 0)
    }
    
    if (editedName.trim() && editedName.trim() !== getDisplayName(name)) {
      setIsRenaming(true)
      try {
        const result = await bridgeService.loraRenameModel(id, editedName.trim())
        if (result.success && onRename) {
          onRename(id, result.model?.name || `${editedName.trim()}.${name.split('.').pop()}`)
        } else {
          setEditedName(getDisplayName(name))
        }
      } catch (error) {
        console.error('重命名失败:', error)
        setEditedName(getDisplayName(name))
      } finally {
        setIsRenaming(false)
      }
    } else {
      setEditedName(getDisplayName(name))
    }
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      ;(e.target as HTMLInputElement).blur()
    } else if (e.key === 'Escape') {
      setEditedName(getDisplayName(name))
      setIsEditingTitle(false)
    }
  }

  // 触发词处理
  const handleAddTriggerWord = async () => {
    if (newTriggerWord.trim()) {
      const newWords = [...editedTriggerWords, newTriggerWord.trim()]
      setEditedTriggerWords(newWords)
      setNewTriggerWord('')
      setIsAddingTrigger(false)
      try {
        await bridgeService.loraUpdateModel(id, { trigger_words: newWords })
      } catch (error) {
        console.error('更新触发词失败:', error)
      }
    } else {
      setNewTriggerWord('')
      setIsAddingTrigger(false)
    }
  }

  // 标签处理
  const handleAddTag = async () => {
    if (newTag.trim()) {
      const newTags = [...editedTags, newTag.trim()]
      setEditedTags(newTags)
      setNewTag('')
      setIsAddingTag(false)
      try {
        await bridgeService.loraUpdateModel(id, { tags: newTags })
        onTagsChange?.(id, newTags)
      } catch (error) {
        console.error('更新标签失败:', error)
      }
    } else {
      setNewTag('')
      setIsAddingTag(false)
    }
  }

  // 权重和采样器保存
  const handleWeightBlur = async () => {
    try {
      await bridgeService.loraUpdateModel(id, { default_weight: editedWeight })
    } catch (error) {
      console.error('更新权重失败:', error)
    }
  }

  const handleSamplerBlur = async () => {
    try {
      await bridgeService.loraUpdateModel(id, { recommended_sampler: editedSampler })
    } catch (error) {
      console.error('更新采样器失败:', error)
    }
  }

  // 备注保存
  const handleNotesBlur = async () => {
    if (editedNotes !== (notes || '')) {
      try {
        await bridgeService.loraUpdateModel(id, { notes: editedNotes })
        onNotesChange?.(id, editedNotes)
      } catch (error) {
        console.error('更新备注失败:', error)
      }
    }
  }

  // 预览图上传
  const handleUploadPreview = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingPreview(true)
    try {
      const result = await bridgeService.loraUploadPreview(id, file)
      if (result.success) {
        await loadPreviewFiles()
        setCurrentPreviewIndex(previewFiles.length)
      }
    } catch (error) {
      console.error('上传预览图失败:', error)
    } finally {
      setIsUploadingPreview(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // 预览图删除
  const handleDeletePreview = async () => {
    if (previewFiles.length === 0) return
    if (dontAskDeletePreview) {
      await confirmDeletePreview()
    } else {
      setShowDeleteConfirm(true)
    }
  }

  const confirmDeletePreview = async () => {
    const currentFile = previewFiles[currentPreviewIndex]
    try {
      const result = await bridgeService.loraDeletePreview(id, currentFile)
      if (result.success) {
        await loadPreviewFiles()
        if (currentPreviewIndex >= previewFiles.length - 1) {
          setCurrentPreviewIndex(Math.max(0, previewFiles.length - 2))
        }
      }
    } catch (error) {
      console.error('删除预览图失败:', error)
    }
  }

  const handleDeleteModel = () => {
    if (dontAskDeleteModel) {
      confirmDeleteModel()
    } else {
      setShowDeleteModelConfirm(true)
    }
  }

  const confirmDeleteModel = async () => {
    setIsDeletingModel(true)
    try {
      const result = await bridgeService.loraDeleteModel(id)
      if (result.success) {
        setShowDeleteModelConfirm(false)
        onDelete?.(id)
      }
    } catch (error) {
      console.error('删除模型失败:', error)
    } finally {
      setIsDeletingModel(false)
    }
  }

  // 模糊切换
  const handleBlurToggle = async () => {
    const newBlurred = !isBlurred
    setIsBlurred(newBlurred)
    try {
      await bridgeService.loraUpdateModel(id, { preview_blurred: newBlurred })
      onPreviewBlurredChange?.(id, newBlurred)
    } catch (error) {
      console.error('更新模糊状态失败:', error)
    }
  }

  // 翻页
  const handlePrevPreview = () => {
    if (previewFiles.length > 0) {
      setCurrentPreviewIndex(prev => (prev - 1 + previewFiles.length) % previewFiles.length)
    }
  }

  const handleNextPreview = () => {
    if (previewFiles.length > 0) {
      setCurrentPreviewIndex(prev => (prev + 1) % previewFiles.length)
    }
  }

  // 极简模式鼠标事件
  const handleMinimalMouseEnter = () => {
    if (isBatchMode || forceCollapsed) return
    expandTimeoutRef.current = setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const expandedWidth = Math.round(previewShortEdge * 2.5)
        if (rect.right + expandedWidth - previewShortEdge > window.innerWidth) {
          setExpandDirection('left')
        } else {
          setExpandDirection('right')
        }
      }
      setIsExpanded(true)
    }, 200)
  }

  const handleMinimalMouseLeave = () => {
    if (isBatchMode) return
    if (expandTimeoutRef.current) clearTimeout(expandTimeoutRef.current)
    if (!isEditingTitle && !isAddingTrigger && !isAddingTag) {
      setIsExpanded(false)
    }
  }
  
  useEffect(() => {
    if (forceCollapsed) {
      setIsExpanded(false)
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current)
        expandTimeoutRef.current = null
      }
    }
  }, [forceCollapsed])

  // 拖拽处理
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('button')) return
    if ((e.target as HTMLElement).closest('a')) return
    if ((e.target as HTMLElement).closest('input')) return
    if ((e.target as HTMLElement).closest('textarea')) return
    if (isBatchMode && !isSelected) return
    if (!onDragStart) return
    
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY }
    isDragTriggeredRef.current = false
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!mouseDownPosRef.current) return
      
      const dx = moveEvent.clientX - mouseDownPosRef.current.x
      const dy = moveEvent.clientY - mouseDownPosRef.current.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 5 && !isDragTriggeredRef.current) {
        isDragTriggeredRef.current = true
        onDragStart(id, moveEvent.clientX, moveEvent.clientY)
      }
    }
    
    const handleMouseUp = () => {
      mouseDownPosRef.current = null
      isDragTriggeredRef.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [id, isBatchMode, isSelected, onDragStart])

  // 点击选择
  const handleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    if ((e.target as HTMLElement).closest('a')) return
    if ((e.target as HTMLElement).closest('input')) return
    if ((e.target as HTMLElement).closest('textarea')) return
    
    if (isBatchMode && onSelect) {
      onSelect(id)
    }
  }, [id, isBatchMode, onSelect])

  // 渲染预览图区域
  const renderPreviewSection = (showControls: boolean = true) => (
    <div className={cn("relative w-full h-full overflow-hidden group", variant === 'minimal' && "flex-shrink-0")}>
      {/* eslint-disable-next-line no-restricted-syntax */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
        onChange={handleUploadPreview}
        className="hidden"
      />
      {isUploadingPreview ? (
        <div className="flex size-full items-center justify-center bg-muted/60">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : previewFiles.length > 0 ? (
        <>
          {isVideoFile(previewFiles[currentPreviewIndex]) ? (
            <video
              src={getPreviewUrl(previewFiles[currentPreviewIndex])}
              className={cn("w-full h-full object-cover transition-all duration-300", isBlurred && "blur-lg scale-[1.15]")}
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <img
              src={getPreviewUrl(previewFiles[currentPreviewIndex])}
              alt="Preview"
              className={cn("w-full h-full object-cover transition-all duration-300", isBlurred && "blur-lg scale-[1.15]")}
            />
          )}
          {previewFiles.length > 1 && showControls && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevPreview}
                className="absolute left-1 top-1/2 size-6 -translate-y-1/2 rounded-full bg-background/60 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <ChevronLeft className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextPreview}
                className="absolute right-1 top-1/2 size-6 -translate-y-1/2 rounded-full bg-background/60 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <ChevronRight className="size-3" />
              </Button>
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-background/60 px-2 py-0.5 text-xs opacity-0 transition-opacity group-hover:opacity-100">
                {currentPreviewIndex + 1} / {previewFiles.length}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="flex size-full items-center justify-center bg-muted/60">
          <div className="text-center">
            <ImageOff className="mx-auto mb-2 size-10 text-muted-foreground/40" />
            <div className="text-xs text-muted-foreground">{t("lora.noPreview")}</div>
          </div>
        </div>
      )}
      
      {showControls && (
        <>
          {previewFiles.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBlurToggle}
              className="absolute bottom-2 left-2 size-7 rounded-md bg-background/70 opacity-0 transition-opacity group-hover:opacity-100"
              title={isBlurred ? t('lora.preview.showOriginal') : t('lora.preview.blur')}
            >
              {isBlurred ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-2 right-10 size-7 rounded-md bg-background/70 opacity-0 transition-opacity group-hover:opacity-100"
            disabled={isUploadingPreview}
          >
            <Upload className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDeletePreview}
            disabled={previewFiles.length === 0}
            className="absolute bottom-2 right-2 size-7 rounded-md bg-background/70 opacity-0 transition-opacity disabled:opacity-30 group-hover:opacity-100"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </>
      )}
    </div>
  )

  // 渲染触发词区域
  const renderTriggerWords = () => (
    <div>
      <div className="mb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground">
        {t('lora.triggerWords')} <span className="font-normal opacity-60">({t('lora.clickToCopy')})</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {editedTriggerWords.map((word, idx) => (
          <span
            key={idx}
            className="flex cursor-pointer items-center rounded border border-border bg-background px-2 py-0.5 text-xs transition-colors hover:border-primary hover:text-primary"
            onClick={() => onCopyTriggerWord(word)}
          >
            {word}
          </span>
        ))}
        {isAddingTrigger ? (
          <Input
            value={newTriggerWord}
            onChange={(e) => setNewTriggerWord(e.target.value)}
            onBlur={() => {
              handleAddTriggerWord()
              if (variant === 'minimal' && !isHovered) setIsExpanded(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTriggerWord()
              else if (e.key === 'Escape') {
                setNewTriggerWord('')
                setIsAddingTrigger(false)
              }
            }}
            placeholder={t("common.placeholder.input")}
            className="h-6 w-[60px] px-2 text-xs"
            autoFocus
          />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 border border-dashed border-border px-2"
            onClick={() => setIsAddingTrigger(true)}
          >
            <Plus className="size-3" />
          </Button>
        )}
      </div>
    </div>
  )

  // 渲染标签区域
  const renderTags = () => (
    <div className="mt-auto pt-2">
      <div className="mb-1.5 flex items-center gap-1 text-[11px] font-medium tracking-wide text-muted-foreground">
        <Tag className="size-3 opacity-70" />
        {t('lora.customTags')}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {editedTags.map((tag, idx) => (
          <span
            key={idx}
            className="flex items-center rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary"
          >
            <Tag className="mr-1 size-2.5 opacity-70" />
            {tag}
          </span>
        ))}
        {isAddingTag ? (
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onBlur={() => {
              handleAddTag()
              if (variant === 'minimal' && !isHovered) setIsExpanded(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTag()
              else if (e.key === 'Escape') {
                setNewTag('')
                setIsAddingTag(false)
              }
            }}
            placeholder={t("common.placeholder.input")}
            className="h-6 w-[60px] px-2 text-xs"
            autoFocus
          />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 border border-dashed border-border px-2"
            onClick={() => setIsAddingTag(true)}
          >
            <Plus className="size-3" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 ml-auto border border-dashed border-danger/50 text-danger/70 hover:bg-danger/10 hover:text-danger hover:border-danger"
            onClick={handleDeleteModel}
            title={t('common.delete')}
          >
            <Trash2 className="size-3" />
          </Button>
        )}
      </div>
    </div>
  )

  // 渲染权重和采样器
  const renderWeightAndSampler = () => (
    <div className="flex gap-3">
      <div className="w-1/3">
        <div className="mb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground">{t("lora.defaultWeight")}</div>
        <Input
          type="text"
          placeholder={t("common.placeholder.weightExample")}
          value={editedWeight}
          onChange={(e) => setEditedWeight(e.target.value)}
          onBlur={() => {
            handleWeightBlur()
            if (variant === 'default') {
              setIsInputFocused(false)
              setTimeout(() => { if (!isMouseInCard.current) setIsHovered(false) }, 0)
            } else if (variant === 'minimal' && !isHovered) {
              setIsExpanded(false)
            }
          }}
          onFocus={() => variant === 'default' && setIsInputFocused(true)}
          className="h-7 w-full text-xs"
        />
      </div>
      <div className="w-2/3">
        <div className="mb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground">{t('lora.sampler')}/{t('lora.scheduler')}</div>
        <Input
          type="text"
          placeholder={t("common.placeholder.samplerExample")}
          value={editedSampler}
          onChange={(e) => setEditedSampler(e.target.value)}
          onBlur={() => {
            handleSamplerBlur()
            if (variant === 'default') {
              setIsInputFocused(false)
              setTimeout(() => { if (!isMouseInCard.current) setIsHovered(false) }, 0)
            } else if (variant === 'minimal' && !isHovered) {
              setIsExpanded(false)
            }
          }}
          onFocus={() => variant === 'default' && setIsInputFocused(true)}
          className="h-7 w-full text-xs"
        />
      </div>
    </div>
  )

  // 标准模式渲染
  if (variant === 'default') {
    return (
      <div
        ref={ref}
        data-lora-card={id}
        className={cn(
          'group/card bg-card border border-border rounded-xl flex flex-col relative',
          'hover:border-primary/50 transition-all shadow-lg hover:shadow-xl',
          isSelected && 'ring-2 ring-primary border-primary',
          isBatchMode && 'cursor-pointer'
        )}
        onMouseEnter={() => { isMouseInCard.current = true; setIsHovered(true) }}
        onMouseLeave={() => { isMouseInCard.current = false; if (!isInputFocused) setIsHovered(false) }}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      >
        {/* 批量模式选中指示器 */}
        {isBatchMode && (
          <div className={cn(
            'absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded border transition-colors',
            isSelected 
              ? 'border-primary bg-primary text-primary-foreground' 
              : 'border-border bg-background/80'
          )}>
            {isSelected && <Check className="h-3 w-3" />}
          </div>
        )}
        {/* 标题栏 */}
        <div className="flex items-center justify-between rounded-t-xl border-b border-border/60 bg-muted/50 p-2.5 px-4">
          <div className={cn("mr-3 min-w-0 flex-1 cursor-text", isBatchMode && "ml-5")}>
            {isEditingTitle ? (
              <Input
                ref={titleInputRef}
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleTitleBlur}
                onFocus={() => setIsInputFocused(true)}
                onKeyDown={handleTitleKeyDown}
                className="h-7 text-[15px] font-medium"
                disabled={isRenaming}
              />
            ) : (
              <span
                className={cn("font-medium text-[15px] truncate block cursor-pointer", isRenaming && "opacity-50")}
                onClick={isRenaming ? undefined : handleTitleClick}
              >
                {isRenaming ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-3 animate-spin" />
                    {t('lora.renaming')}
                  </span>
                ) : editedName}
              </span>
            )}
          </div>
          {sizeKb && (
            <span className="flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-[10px] text-muted-foreground">
              <HardDrive className="size-3" />
              {formatSize(sizeKb)}
            </span>
          )}
          {isLocal === false && civitaiUrl && (
            <a
              href={civitaiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs text-primary hover:text-primary/80"
            >
              <ExternalLink className="size-3" />
              {/* eslint-disable-next-line i18next/no-literal-string */}
              Civitai
            </a>
          )}
        </div>

        {/* 主内容区 */}
        <div className="relative flex overflow-hidden rounded-b-xl bg-background" style={{ height: `${Math.round(previewShortEdge * 4 / 3)}px` }}>
          <div className="relative overflow-hidden border-r border-border/60" style={{ width: `${previewShortEdge}px`, height: '100%' }}>
            {renderPreviewSection()}
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-muted/30 p-3">
            {renderTriggerWords()}
            {renderWeightAndSampler()}
            {renderTags()}
          </div>
        </div>

        {/* 悬停展开的备注区域 */}
        <div
          className={cn(
            'absolute left-0 right-0 bottom-0 translate-y-full z-20 overflow-hidden bg-background backdrop-blur-sm border border-border border-t-0 transition-all duration-300 ease-in-out rounded-b-xl shadow-xl',
            (isHovered && !forceCollapsed) ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground">
              <StickyNote className="size-3" />
              {t('lora.notes')}
            </div>
            <Textarea
              value={editedNotes}
              onChange={(e) => setEditedNotes(e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => {
                setIsInputFocused(false)
                handleNotesBlur()
                setTimeout(() => { if (!isMouseInCard.current) setIsHovered(false) }, 0)
              }}
              className="h-20 w-full resize-none rounded-md border border-border/50 bg-background/50 p-2 text-xs transition-colors focus:border-primary/80 focus:outline-none"
              placeholder={t("common.placeholder.notesExample")}
            />
          </div>
        </div>

        <ConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={(open) => !open && setShowDeleteConfirm(false)}
          onConfirm={confirmDeletePreview}
          title={t('lora.deletePreview.title')}
          description={t('lora.deletePreview.description')}
          confirmText={t('common.delete')}
          cancelText={t('common.cancel')}
          variant="destructive"
          showDontAskAgain
          dontAskAgain={dontAskDeletePreview}
          onDontAskAgainChange={(checked) => {
            setDontAskDeletePreview(checked)
            sessionStorage.setItem('lora_dont_ask_delete_preview', String(checked))
          }}
        />

        <ConfirmDialog
          open={showDeleteModelConfirm}
          onOpenChange={(open) => !open && setShowDeleteModelConfirm(false)}
          onConfirm={confirmDeleteModel}
          title={t('lora.deleteModel.title')}
          description={t('lora.deleteModel.description', { name: editedName })}
          confirmText={t('common.delete')}
          cancelText={t('common.cancel')}
          variant="destructive"
          loading={isDeletingModel}
          showDontAskAgain
          dontAskAgain={dontAskDeleteModel}
          onDontAskAgainChange={(checked) => {
            setDontAskDeleteModel(checked)
            sessionStorage.setItem('lora_dont_ask_delete_model', String(checked))
          }}
        />
      </div>
    )
  }

  // 极简模式渲染
  const cardWidth = previewShortEdge
  const cardHeight = Math.round(previewShortEdge * 4 / 3)

  return (
    <div
      ref={(el) => {
        containerRef.current = el
        if (typeof ref === 'function') {
          ref(el)
        } else if (ref) {
          ref.current = el
        }
      }}
      data-lora-card={id}
      className={cn(
        "relative",
        isSelected && "ring-2 ring-primary rounded-lg"
      )}
      style={{ width: cardWidth, height: cardHeight, flexShrink: 0 }}
      onMouseEnter={handleMinimalMouseEnter}
      onMouseLeave={handleMinimalMouseLeave}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {/* 批量模式选中指示器 */}
      {isBatchMode && (
        <div className={cn(
          'absolute left-1 top-1 z-[60] flex h-5 w-5 items-center justify-center rounded border transition-colors',
          isSelected 
            ? 'border-primary bg-primary text-primary-foreground' 
            : 'border-border bg-background/80'
        )}>
          {isSelected && <Check className="h-3 w-3" />}
        </div>
      )}
      <div
        ref={cardRef}
        className={cn(
          "absolute bg-background rounded-lg border border-border overflow-hidden transition-all duration-300 ease-out",
          isExpanded && "z-50 shadow-2xl"
        )}
        style={{
          top: 0,
          left: expandDirection === 'right' ? 0 : 'auto',
          right: expandDirection === 'left' ? 0 : 'auto',
          width: cardWidth,
          height: cardHeight,
          ...(isExpanded && {
            width: Math.round(cardWidth * 2.5),
            height: cardHeight + Math.round(cardHeight / 2),
          }),
        }}
      >
        <div className="flex h-full">
          {/* 预览图 */}
          <div className="group relative overflow-hidden" style={{ width: cardWidth, height: cardHeight }}>
            {renderPreviewSection()}
            {civitaiUrl && (
              <a
                href={civitaiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md bg-primary/80 px-2 py-1 text-xs text-primary-foreground opacity-0 transition-opacity hover:bg-primary group-hover:opacity-100"
              >
                <ExternalLink className="size-3" />
                {/* eslint-disable-next-line i18next/no-literal-string */}
                Civitai
              </a>
            )}
          </div>

          {/* 展开区域 */}
          {isExpanded && (
            <div className="flex flex-1 flex-col overflow-hidden p-3" style={{ width: Math.round(cardWidth * 1.5) }}>
              {/* 标题 */}
              <div className="mb-2 flex items-center justify-between">
                {isEditingTitle ? (
                  <Input
                    ref={titleInputRef}
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={handleTitleKeyDown}
                    className="mr-2 h-7 flex-1 text-sm"
                    disabled={isRenaming}
                  />
                ) : (
                  <h3
                    className="flex-1 cursor-pointer truncate text-sm font-medium hover:text-primary"
                    onClick={handleTitleClick}
                  >
                    {editedName}
                  </h3>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {sizeKb && <span>{formatSize(sizeKb)}</span>}
                </div>
              </div>

              {/* 详细信息 */}
              <div className="flex-1 space-y-2 overflow-y-auto">
                {renderTriggerWords()}
                {renderWeightAndSampler()}
                {renderTags()}
              </div>
            </div>
          )}
        </div>

        {/* 底部模型名（默认显示） */}
        {!isExpanded && (
          <div className="from-foreground/60 absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent p-2">
            <h3 className="text-background truncate text-xs font-medium">{editedName}</h3>
          </div>
        )}

        {/* 展开时底部备注区域 */}
        {isExpanded && (
          <div
            className="absolute inset-x-0 border-t border-border bg-background p-3"
            style={{ top: cardHeight, height: Math.round(cardHeight / 2) }}
          >
            <Textarea
              value={editedNotes}
              onChange={(e) => setEditedNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder={t("common.placeholder.addNotes")}
              className="size-full resize-none rounded-md border border-border/80 bg-background px-2.5 py-1.5 text-xs transition-colors focus:border-primary focus:outline-none"
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={(open) => !open && setShowDeleteConfirm(false)}
        onConfirm={confirmDeletePreview}
        title={t('lora.deletePreview.title')}
        description={t('lora.deletePreview.description')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="destructive"
        showDontAskAgain
        dontAskAgain={dontAskDeletePreview}
        onDontAskAgainChange={(checked) => {
          setDontAskDeletePreview(checked)
          sessionStorage.setItem('lora_dont_ask_delete_preview', String(checked))
        }}
      />

      <ConfirmDialog
        open={showDeleteModelConfirm}
        onOpenChange={(open) => !open && setShowDeleteModelConfirm(false)}
        onConfirm={confirmDeleteModel}
        title={t('lora.deleteModel.title')}
        description={t('lora.deleteModel.description', { name: editedName })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="destructive"
        loading={isDeletingModel}
        showDontAskAgain
        dontAskAgain={dontAskDeleteModel}
        onDontAskAgainChange={(checked) => {
          setDontAskDeleteModel(checked)
          sessionStorage.setItem('lora_dont_ask_delete_model', String(checked))
        }}
      />
    </div>
  )
})

export default LoraCard
