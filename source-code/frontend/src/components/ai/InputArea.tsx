/**
 * 输入区域组件
 * 
 * 功能：
 * - 多行输入框
 * - 发送按钮
 * - 停止生成按钮
 * - 快捷键支持（Enter 发送，Ctrl+Enter 换行）
 * 
 * 验证需求：1.1, 1.3
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAIStore } from '@/stores/useAIStore'
import { useTopicStore } from '@/stores/useTopicStore'
import { useModelSelectorStore } from '@/stores/useModelSelectorStore'
import { useAPIConfigStore } from '@/stores/useAPIConfigStore'
import { useSearchStore } from '@/stores/useSearchStore'
import { useSystemPromptStore } from '@/stores/useSystemPromptStore'
import { useFileStore, UploadedFile } from '@/stores/useFileStore'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Send, Square, Brain, Globe, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import FilePreviewList from './FilePreviewList'
import { readFileAsBase64, extractBase64FromDataUrl } from '@/utils/fileReader'
import { validateFile } from '@/utils/fileValidator'

/**
 * 输入区域组件
 */
export const InputArea: React.FC = () => {
  const { t } = useTranslation()
  const { isLoading, isGenerating, sendMessage, stopGeneration } = useAIStore()
  const { currentTopicId } = useTopicStore()
  const { getActiveConfig, defaultConfigId } = useModelSelectorStore()
  const { configs } = useAPIConfigStore()
  const { getWebSearchEnabled, setWebSearchEnabled } = useSearchStore()
  const { getActivePresetContent } = useSystemPromptStore()
  const { files, removeFile, clearFiles, addFile, setUploading, setProgress, setError } = useFileStore()
  
  const [input, setInput] = useState('')
  const [deepThinkingEnabled, setDeepThinkingEnabled] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  /**
   * 检查是否在开发环境
   */
  const isDevelopment = (): boolean => {
    return !window.pywebview || !window.pywebview.api
  }
  
  /**
   * 处理文件上传
   * 调用后端 ai_process_file 接口处理文件
   */
  const handleFilesSelected = useCallback(async (selectedFiles: File[]) => {
    console.log('[InputArea] 开始处理文件:', selectedFiles.length)
    
    // 验证每个文件
    const validFiles: File[] = []
    const errors: string[] = []

    for (const file of selectedFiles) {
      const result = validateFile(file, files)
      
      if (result.valid) {
        validFiles.push(file)
        
        // 如果有警告，显示警告信息
        if (result.warning) {
          console.warn(`[InputArea] ${result.warning}`)
        }
      } else if (result.error) {
        errors.push(result.error)
      }
    }

    // 如果有错误，显示第一个错误
    if (errors.length > 0) {
      alert(errors[0])
      return
    }

    // 如果没有有效文件，直接返回
    if (validFiles.length === 0) {
      return
    }
    
    setUploading(true)
    
    for (const file of validFiles) {
      try {
        // 生成临时文件 ID
        const tempFileId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // 设置初始进度
        setProgress(tempFileId, 0)
        
        // 读取文件为 Base64
        console.log('[InputArea] 读取文件:', file.name)
        const readResult = await readFileAsBase64(file)
        
        if (!readResult.success || !readResult.data) {
          throw new Error(readResult.error || '文件读取失败')
        }
        
        setProgress(tempFileId, 30)
        
        // 提取纯 Base64 数据（移除 data:image/png;base64, 前缀）
        const base64Data = extractBase64FromDataUrl(readResult.data)
        
        // 开发环境：模拟处理
        if (isDevelopment()) {
          console.log('[InputArea] 开发环境：模拟文件处理')
          
          // 模拟延迟
          await new Promise(resolve => setTimeout(resolve, 500))
          
          setProgress(tempFileId, 100)
          
          // 创建模拟的上传文件对象
          const uploadedFile: UploadedFile = {
            id: tempFileId,
            name: file.name,
            type: file.type.startsWith('image/') ? 'image' : 'document',
            mime_type: file.type,
            size: file.size,
            content: base64Data,
            content_type: 'base64',
            thumbnail: file.type.startsWith('image/') ? readResult.data : undefined,
            metadata: {
              original_name: file.name
            },
            uploaded_at: new Date().toISOString()
          }
          
          addFile(uploadedFile)
          console.log('[InputArea] 文件处理成功（模拟）:', file.name)
          continue
        }
        
        // 生产环境：调用后端 API
        console.log('[InputArea] 调用后端 API: ai_process_file')
        const response = await window.pywebview.api.ai_process_file(
          base64Data,
          file.name,
          file.type,
          file.size
        )
        
        console.log('[InputArea] 后端返回:', {
          success: response.success,
          file_id: response.file_id,
          type: response.processed_data?.type,
          content_type: response.processed_data?.content_type,
          has_thumbnail: !!response.processed_data?.thumbnail,
          thumbnail_preview: response.processed_data?.thumbnail?.substring(0, 50)
        })
        
        if (!response.success) {
          throw new Error(response.error_message || '文件处理失败')
        }
        
        // 创建上传文件对象
        const uploadedFile: UploadedFile = {
          id: response.file_id,
          name: file.name,
          type: response.processed_data.type,
          mime_type: file.type,
          size: file.size,
          content: response.processed_data.content,
          content_type: response.processed_data.content_type,
          thumbnail: response.processed_data.thumbnail,
          metadata: {
            original_name: file.name,
            ...response.processed_data.metadata
          },
          uploaded_at: new Date().toISOString()
        }
        
        addFile(uploadedFile)
        
        // 清除临时文件的进度信息
        setProgress(tempFileId, 100)
        
        console.log('[InputArea] 文件处理成功:', file.name)
        
      } catch (error) {
        console.error('[InputArea] 文件处理失败:', file.name, error)
        const errorMessage = error instanceof Error ? error.message : t('common.unknownError')
        setError(file.name, errorMessage)
        alert(t('ai.inputArea.fileProcessFailed', { fileName: file.name, error: errorMessage }))
      }
    }
    
    setUploading(false)
  }, [addFile, setUploading, setProgress, setError])
  
  /**
   * 自动调整输入框高度
   */
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }
  
  // 当输入内容变化时，调整高度
  useEffect(() => {
    adjustTextareaHeight()
  }, [input])
  
  /**
   * 处理发送消息
   */
  const handleSend = async () => {
    // 验证输入（至少要有文本或文件）
    if (!input.trim() && files.length === 0) {
      return
    }
    
    // 验证话题
    if (!currentTopicId) {
      alert(t('ai.inputArea.createTopicFirst'))
      return
    }
    
    // 获取当前对话的激活配置
    let activeConfigId = getActiveConfig(currentTopicId)
    
    // 如果对话没有激活配置，使用默认配置
    if (!activeConfigId) {
      activeConfigId = defaultConfigId
    }
    
    // 验证配置是否存在
    if (!activeConfigId) {
      alert(t('ai.inputArea.selectAPIConfigFirst'))
      return
    }
    
    // 从配置列表中获取配置详情
    const activeConfig = configs.find(c => c.id === activeConfigId)
    
    if (!activeConfig) {
      alert(t('ai.inputArea.configNotExists'))
      return
    }
    
    // 验证配置状态
    if (activeConfig.status === 'unavailable') {
      const confirmSend = confirm(t('ai.inputArea.confirmUnavailable'))
      if (!confirmSend) {
        return
      }
    }
    
    // 保存输入内容和文件
    const content = input.trim()
    const messageFiles = [...files]  // 复制文件列表
    
    // 获取当前对话的系统提示词（如果有）
    const systemPrompt = currentTopicId ? getActivePresetContent(currentTopicId) : null
    
    // 获取当前话题的联网搜索状态
    const webSearchEnabled = currentTopicId ? getWebSearchEnabled(currentTopicId) : false
    
    // 调试信息
    console.log('[InputArea] ========== 发送消息调试 ==========')
    console.log('[InputArea] 深度思考:', deepThinkingEnabled)
    console.log('[InputArea] 联网搜索:', webSearchEnabled)
    console.log('[InputArea] 系统提示词:', systemPrompt ? '已设置' : '无')
    console.log('[InputArea] 文件数量:', messageFiles.length)
    console.log('[InputArea] 话题ID:', currentTopicId)
    console.log('[InputArea] 配置ID:', activeConfigId)
    console.log('[InputArea] ========================================')
    
    // 立即清空输入框和文件列表（在发送前）
    setInput('')
    clearFiles()
    console.log('[InputArea] 已清空输入框和文件列表')
    
    try {
      // 发送消息，使用激活配置，并传递深度思考、联网搜索、系统提示词和文件
      await sendMessage(
        content, 
        currentTopicId, 
        activeConfig.provider, 
        activeConfig.model,
        activeConfigId,
        deepThinkingEnabled,  // 传递深度思考状态
        webSearchEnabled,     // 传递联网搜索状态
        systemPrompt,         // 传递系统提示词
        messageFiles          // 传递文件列表（使用复制的列表）
      )
      
      console.log('[InputArea] 消息发送成功')
      
    } catch (error) {
      // 发送失败，恢复输入框内容和文件列表
      setInput(content)
      // 恢复文件列表
      messageFiles.forEach(file => addFile(file))
      console.error('[InputArea] 消息发送失败，已恢复输入内容和文件列表:', error)
      alert(`消息发送失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }
  
  /**
   * 处理停止生成
   */
  const handleStop = async () => {
    if (!currentTopicId) {
      return
    }
    
    await stopGeneration(currentTopicId)
  }
  
  /**
   * 处理键盘事件
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 发送，Ctrl+Enter 换行
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault()
      handleSend()
    }
  }
  
  /**
   * 处理输入变化
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }
  
  // 判断是否可以发送
  const canSend = !isLoading && !isGenerating && (input.trim().length > 0 || files.length > 0) && currentTopicId
  
  // 文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  /**
   * 处理文件选择按钮点击
   */
  const handleFileButtonClick = () => {
    fileInputRef.current?.click()
  }
  
  /**
   * 处理文件输入变化
   */
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      handleFilesSelected(Array.from(selectedFiles))
    }
    // 清空input值，允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  /**
   * 处理拖拽进入
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!currentTopicId || isLoading || isGenerating) return
    
    // 检查是否包含文件
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true)
    }
  }, [currentTopicId, isLoading, isGenerating])

  /**
   * 处理拖拽悬停
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!currentTopicId || isLoading || isGenerating) return
    
    // 设置拖拽效果
    e.dataTransfer.dropEffect = 'copy'
  }, [currentTopicId, isLoading, isGenerating])

  /**
   * 处理拖拽离开
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!currentTopicId || isLoading || isGenerating) return
    
    // 只有当离开整个容器时才取消高亮
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX
    const y = e.clientY
    
    if (
      x <= rect.left ||
      x >= rect.right ||
      y <= rect.top ||
      y >= rect.bottom
    ) {
      setIsDragging(false)
    }
  }, [currentTopicId, isLoading, isGenerating])

  /**
   * 处理文件释放
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!currentTopicId || isLoading || isGenerating) return
    
    setIsDragging(false)
    
    // 获取拖拽的文件
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles && droppedFiles.length > 0) {
      handleFilesSelected(Array.from(droppedFiles))
    }
  }, [currentTopicId, isLoading, isGenerating, handleFilesSelected])

  /**
   * 处理粘贴事件
   */
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    if (!currentTopicId || isLoading || isGenerating) return
    
    // 检查剪贴板是否包含文件
    const items = e.clipboardData?.items
    if (!items) return
    
    const files: File[] = []
    
    // 遍历剪贴板项
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      // 检查是否为文件
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          files.push(file)
          console.log('[InputArea] 从剪贴板获取文件:', file.name, file.type)
        }
      }
    }
    
    // 如果有文件，处理它们
    if (files.length > 0) {
      e.preventDefault()
      e.stopPropagation()
      
      console.log('[InputArea] 粘贴了', files.length, '个文件')
      handleFilesSelected(files)
    }
  }, [currentTopicId, isLoading, isGenerating, handleFilesSelected])
  
  return (
    <div 
      ref={containerRef}
      className={cn(
        "border-t border-border bg-background px-6 py-4 transition-all duration-200",
        isDragging && "bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700"
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="w-full">
        {/* 文件预览列表 */}
        {files.length > 0 && (
          <div className="mb-3">
            <FilePreviewList
              files={files}
              onRemove={removeFile}
            />
          </div>
        )}
        
        {/* 隐藏的文件输入 */}
        {/* eslint-disable-next-line no-restricted-syntax */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.md,.json,.xml,.csv,.log,.docx,.xlsx,.py,.js,.ts,.jsx,.tsx,.java,.cpp,.c,.go,.rs"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={!currentTopicId || isLoading || isGenerating}
        />
        
        {/* 拖拽提示覆盖层 */}
        {isDragging && (
          <div className="border-purple-500 bg-purple-100/90 dark:border-purple-400 dark:bg-purple-900/30 pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed">
            <div className="text-center">
              <Upload className="text-purple-600 dark:text-purple-400 mx-auto mb-2 size-12" />
              <p className="text-purple-700 dark:text-purple-300 text-lg font-medium">{t("ai.releaseToUpload")}</p>
              <p className="text-purple-600 dark:text-purple-400 mt-1 text-sm">{t("ai.supportImageAndDoc")}</p>
            </div>
          </div>
        )}
        
        {/* 输入框容器 */}
        <div className={cn(
          'relative rounded-xl border transition-all duration-200',
          'bg-surface',
          isDragging
            ? 'border-purple-500 dark:border-purple-600 shadow-lg'
            : input.trim() || files.length > 0
            ? 'border-purple-300 dark:border-purple-700 shadow-sm' 
            : 'border-border'
        )}>
          {/* 输入框 */}
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              currentTopicId
                ? '在这里输入消息，按 Enter 发送，Ctrl+V 粘贴图片...'
                : '请先创建或选择一个话题'
            }
            disabled={!currentTopicId || isLoading || isGenerating}
            className={cn(
              'w-full px-4 py-3 bg-transparent',
              'resize-none overflow-y-auto',
              'focus:outline-none',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'placeholder:text-muted-foreground/60',
              'text-foreground text-[15px] leading-6',
              'transition-all duration-200'
            )}
            rows={1}
            style={{ minHeight: '48px', maxHeight: '200px' }}
          />
          
          {/* 底部工具栏 */}
          <div className="flex items-center justify-between border-t border-border/50 px-3 py-2">
            {/* 左侧：模型信息 + 深度思考按钮 */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {(() => {
                // 获取当前对话的激活配置
                const activeConfigId = currentTopicId ? getActiveConfig(currentTopicId) || defaultConfigId : null
                const activeConfig = activeConfigId ? configs.find(c => c.id === activeConfigId) : null
                const currentWebSearchEnabled = currentTopicId ? getWebSearchEnabled(currentTopicId) : false
                
                if (activeConfig) {
                  return (
                    <>
                      <span className="bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 rounded-md px-2 py-1 font-medium">
                        {activeConfig.alias}
                      </span>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-muted-foreground">
                        {activeConfig.model}
                      </span>
                      <span className="text-muted-foreground/40">·</span>
                      {/* 深度思考切换按钮 */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeepThinkingEnabled(!deepThinkingEnabled)}
                        className={cn(
                          'h-6 px-2 text-xs transition-all duration-200',
                          deepThinkingEnabled
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50'
                            : 'text-muted-foreground hover:bg-muted'
                        )}
                        title={deepThinkingEnabled ? '关闭深度思考' : '开启深度思考'}
                      >
                        <Brain className={cn(
                          'w-3 h-3 mr-1',
                          deepThinkingEnabled && 'animate-pulse'
                        )} />
                        深度思考
                      </Button>
                      <span className="text-muted-foreground/40">·</span>
                      {/* 联网搜索切换按钮 */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => currentTopicId && setWebSearchEnabled(currentTopicId, !currentWebSearchEnabled)}
                        disabled={!currentTopicId}
                        className={cn(
                          'h-6 px-2 text-xs transition-all duration-200',
                          currentWebSearchEnabled
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                            : 'text-muted-foreground hover:bg-muted'
                        )}
                        title={currentWebSearchEnabled ? '关闭联网搜索' : '开启联网搜索'}
                      >
                        <Globe className={cn(
                          'w-3 h-3 mr-1',
                          currentWebSearchEnabled && 'animate-pulse'
                        )} />
                        联网搜索
                      </Button>
                    </>
                  )
                } else {
                  return (
                    <span className="text-muted-foreground/60">
                      请选择配置
                    </span>
                  )
                }
              })()}
            </div>
            
            {/* 右侧：文件上传按钮 + 发送按钮 */}
            <div className="flex items-center gap-2">
              {/* 文件上传按钮 */}
              <Button
                onClick={handleFileButtonClick}
                disabled={!currentTopicId || isLoading || isGenerating}
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-sm"
                title={t("common.title.uploadFile")}
              >
                <Upload className="size-4" />
              </Button>
              
              {isGenerating ? (
                <Button
                  onClick={handleStop}
                  variant="destructive"
                  size="sm"
                  className="h-8 px-4 text-sm shadow-sm transition-all duration-200 hover:shadow"
                >
                  <Square className="mr-1.5 size-3.5" />
                  停止
                </Button>
              ) : (
                <Button
                  onClick={handleSend}
                  disabled={!canSend}
                  size="sm"
                  className={cn(
                    'h-8 px-4 text-sm shadow-sm transition-all duration-200',
                    canSend
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white hover:shadow'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  )}
                >
                  <Send className="mr-1.5 size-3.5" />
                  发送
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* 提示信息 */}
        <div className="mt-2 text-center text-xs text-muted-foreground/60">
          <span>{t('ai.enterSendHint')}</span>
          {deepThinkingEnabled && (
            <>
              <span className="mx-2">·</span>
              <span className="text-purple-500 dark:text-purple-400">{t("ai.deepThinkingEnabled")}</span>
            </>
          )}
          {currentTopicId && getWebSearchEnabled(currentTopicId) && (
            <>
              <span className="mx-2">·</span>
              <span className="text-blue-500 dark:text-blue-400">{t("ai.webSearchEnabled")}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
