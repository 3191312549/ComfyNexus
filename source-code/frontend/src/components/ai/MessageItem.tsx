/**
 * 消息项组件（微信风格气泡样式）
 * 
 * 功能：
 * - 显示单条消息
 * - 区分用户消息和 AI 消息样式
 * - 渲染 Markdown 内容
 * - 支持思考过程折叠/展开
 * - 消息操作按钮（复制、重新生成等）
 * 
 * 验证需求：1.1
 */

import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Message } from '@/stores/useAIStore'
import { useAIStore } from '@/stores/useAIStore'
import { useTopicStore } from '@/stores/useTopicStore'
import { useModelSelectorStore } from '@/stores/useModelSelectorStore'
import { useAPIConfigStore } from '@/stores/useAPIConfigStore'
import { useSearchStore } from '@/stores/useSearchStore'
import { useSystemPromptStore } from '@/stores/useSystemPromptStore'
import { MarkdownRenderer } from './MarkdownRenderer'
import { User, Bot, Copy, RotateCw, Check, Loader2, ChevronDown, ChevronUp, Brain, Globe, FileText, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

interface MessageItemProps {
  message: Message
}

/**
 * 解析消息内容，分离思考过程、搜索结果和最终答案
 */
const parseMessageContent = (content: string) => {
  // 匹配【思考过程】和【最终答案】
  const thinkingMatch = content.match(/【思考过程】([\s\S]*?)【最终答案】/);
  const answerMatch = content.match(/【最终答案】([\s\S]*)/);
  
  // 匹配【搜索结果】和【回答】
  const searchMatch = content.match(/【搜索结果】([\s\S]*?)【回答】/);
  const searchAnswerMatch = content.match(/【回答】([\s\S]*)/);
  
  // 情况1: 同时有搜索结果和思考过程（联网搜索 + 深度思考）
  if (searchMatch && thinkingMatch && answerMatch) {
    // 从【回答】部分提取思考过程和最终答案
    const answerContent = searchAnswerMatch ? searchAnswerMatch[1].trim() : '';
    const thinkingInAnswer = answerContent.match(/【思考过程】([\s\S]*?)【最终答案】/);
    const finalAnswerInAnswer = answerContent.match(/【最终答案】([\s\S]*)/);
    
    return {
      hasThinking: !!thinkingInAnswer,
      thinking: thinkingInAnswer ? thinkingInAnswer[1].trim() : '',
      hasSearch: true,
      searchResults: searchMatch[1].trim(),
      answer: finalAnswerInAnswer ? finalAnswerInAnswer[1].trim() : answerContent
    };
  }
  
  // 情况2: 只有搜索结果（联网搜索，无深度思考）
  if (searchMatch && searchAnswerMatch) {
    return {
      hasThinking: false,
      thinking: '',
      hasSearch: true,
      searchResults: searchMatch[1].trim(),
      answer: searchAnswerMatch[1].trim()
    };
  }
  
  // 情况3: 只有思考过程（深度思考，无联网搜索）
  if (thinkingMatch && answerMatch) {
    return {
      hasThinking: true,
      thinking: thinkingMatch[1].trim(),
      hasSearch: false,
      searchResults: '',
      answer: answerMatch[1].trim()
    };
  }
  
  // 情况4: 没有匹配到任何模式，返回原始内容
  return {
    hasThinking: false,
    thinking: '',
    hasSearch: false,
    searchResults: '',
    answer: content
  };
};

/**
 * 消息项组件
 */
export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const { t } = useTranslation()
  const isUser = message.role === 'user'
  const { isGenerating, isLoading, messages } = useAIStore()
  const [copied, setCopied] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  
  // 判断是否是最后一条 AI 消息
  const isLastAIMessage = !isUser && messages[messages.length - 1]?.id === message.id
  // 显示"正在思考"状态
  const showGenerating = isLastAIMessage && isGenerating && !isLoading
  // 显示"正在发送"状态
  const showSending = isLastAIMessage && isLoading
  
  // 解析消息内容
  const parsedContent = useMemo(() => parseMessageContent(message.content), [message.content]);
  
  /**
   * 复制消息内容
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('复制失败:', error)
    }
  }
  
  /**
   * 重新生成 AI 回复
   * 找到当前 AI 消息对应的用户消息，然后重新发送
   */
  const handleRegenerate = async () => {
    if (isUser) return
    
    // 找到当前消息在列表中的索引
    const currentIndex = messages.findIndex(m => m.id === message.id)
    if (currentIndex === -1) return
    
    // 找到前一条用户消息
    let userMessage: Message | null = null
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userMessage = messages[i]
        break
      }
    }
    
    if (!userMessage) {
      console.error('[MessageItem] 未找到对应的用户消息')
      return
    }
    
    // 获取必要的信息
    const { sendMessage } = useAIStore.getState()
    const { currentTopicId } = useTopicStore.getState()
    const { getActiveConfig, defaultConfigId } = useModelSelectorStore.getState()
    const { configs } = useAPIConfigStore.getState()
    const { getWebSearchEnabled } = useSearchStore.getState()
    const { getActivePresetContent } = useSystemPromptStore.getState()
    
    if (!currentTopicId) {
      console.error('[MessageItem] 当前话题 ID 为空')
      return
    }
    
    // 获取配置
    const activeConfigId = getActiveConfig(currentTopicId) || defaultConfigId
    if (!activeConfigId) {
      alert(t('ai.message.selectAPIConfigFirst'))
      return
    }

    const activeConfig = configs.find(c => c.id === activeConfigId)
    if (!activeConfig) {
      alert(t('ai.message.configNotExists'))
      return
    }
    
    // 获取系统提示词和联网搜索状态
    const systemPrompt = getActivePresetContent(currentTopicId)
    const webSearchEnabled = getWebSearchEnabled(currentTopicId)
    
    // 删除当前 AI 消息
    // 注意：这里需要调用后端 API 删除消息，但目前没有这个接口
    // 暂时只在前端删除
    const { setMessages } = useAIStore.getState()
    const newMessages = messages.filter(m => m.id !== message.id)
    setMessages(newMessages)
    
    // 重新发送消息
    try {
      await sendMessage(
        userMessage.content,
        currentTopicId,
        activeConfig.provider,
        activeConfig.model,
        activeConfigId,
        false, // 深度思考状态（这里使用默认值，实际应该记录原始状态）
        webSearchEnabled,
        systemPrompt,
        userMessage.files || []
      )
    } catch (error) {
      console.error('[MessageItem] 重新生成失败:', error)
      alert(t('ai.message.regenerateFailed') + ': ' + (error instanceof Error ? error.message : t('common.unknownError')))
    }
  }
  
  return (
    <div
      className="px-5 py-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={cn(
        'flex gap-2',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}>
        {/* 头像 */}
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm',
            isUser 
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
              : 'bg-gradient-to-br from-purple-500 to-purple-600 text-white'
          )}
        >
          {isUser ? (
            <User className="size-4" />
          ) : (
            <Bot className="size-4" />
          )}
        </div>
        
        {/* 消息气泡区域 */}
        <div className={cn(
          'flex flex-col gap-1 max-w-[85%] min-w-0 overflow-hidden',
          isUser ? 'items-end' : 'items-start'
        )}>
          {/* 消息头部：角色、模型 */}
          <div className={cn(
            'flex items-center gap-2 px-1',
            isUser ? 'flex-row-reverse' : 'flex-row'
          )}>
            <span className="text-xs text-muted-foreground">
              {isUser ? '你' : 'AI 助手'}
            </span>
            {message.model && !isUser && (
              <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded px-1.5 py-0.5 text-[10px]">
                {message.model}
              </span>
            )}
          </div>
          
          {/* 消息气泡 */}
          <div className="group relative min-w-0">
            <div
              className={cn(
                'rounded-lg px-3 py-2 shadow-sm relative min-w-0 overflow-hidden',
                isUser 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-surface border border-border'
              )}
            >
              {/* 文件显示区域 */}
              {message.files && message.files.length > 0 && (
                <div className={cn(
                  'mb-2 flex flex-wrap gap-2',
                  isUser ? 'justify-end' : 'justify-start'
                )}>
                  {message.files.map((file) => (
                    <div
                      key={file.id}
                      className={cn(
                        'relative group/file cursor-pointer',
                        'max-w-xs rounded-lg overflow-hidden',
                        'border transition-all duration-200',
                        isUser
                          ? 'border-blue-400 bg-blue-400/20'
                          : 'border-border bg-muted/50'
                      )}
                      title={file.name}
                      onClick={() => {
                        // 点击图片在新窗口打开
                        if (file.type === 'image') {
                          const imageUrl = file.content.startsWith('data:') 
                            ? file.content 
                            : `data:${file.mime_type};base64,${file.content}`
                          window.open(imageUrl, '_blank')
                        }
                      }}
                    >
                      {file.type === 'image' ? (
                        // 图片原图显示
                        <img
                          src={file.content.startsWith('data:') ? file.content : `data:${file.mime_type};base64,${file.content}`}
                          alt={file.name}
                          className="h-auto max-h-64 max-w-full object-contain"
                        />
                      ) : (
                        // 文档图标
                        <div className="flex size-20 flex-col items-center justify-center p-2">
                          <FileText className={cn(
                            'w-8 h-8 mb-1',
                            isUser ? 'text-white' : 'text-muted-foreground'
                          )} />
                          <span className={cn(
                            'text-[9px] text-center truncate w-full',
                            isUser ? 'text-white' : 'text-muted-foreground'
                          )}>
                            {file.name}
                          </span>
                        </div>
                      )}
                      
                      {/* 悬停时显示提示 */}
                      <div className={cn(
                        'absolute inset-0 bg-black/60 opacity-0 group-hover/file:opacity-100',
                        'transition-opacity duration-200',
                        'flex items-center justify-center'
                      )}>
                        {file.type === 'image' ? (
                          <span className="text-white text-xs">{t("ai.clickToViewLarge")}</span>
                        ) : (
                          <Download className="text-white size-5" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* 消息内容 */}
              <div className={cn(
                'text-[13px] leading-relaxed break-all overflow-hidden select-text',
                isUser 
                  ? 'text-white' 
                  : 'text-foreground'
              )}>
                {isUser ? (
                  // 用户消息：纯文本显示
                  <p className="m-0 select-text whitespace-pre-wrap break-all">
                    {message.content}
                  </p>
                ) : (
                  // AI 消息：区分思考过程、搜索结果和最终答案
                  <div className="select-text space-y-2">
                    {/* 搜索结果（如果有） */}
                    {parsedContent.hasSearch && (
                      <div className="border-blue-400 bg-blue-50/30 dark:border-blue-600 dark:bg-blue-900/10 select-text rounded-r border-l-2 py-1 pl-3">
                        <Button
                          onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                          variant="ghost"
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-2 h-auto select-none items-center gap-2 p-0 text-xs font-medium transition-colors"
                        >
                          <Globe className="size-3.5" />
                          <span>{t('ai.searchResultsCount', { count: parsedContent.searchResults.split('---').filter((s: string) => s.trim()).length })}</span>
                          {isSearchExpanded ? (
                            <ChevronUp className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          )}
                        </Button>
                        
                        {isSearchExpanded && (
                          <div className={cn(
                            'prose prose-sm dark:prose-invert max-w-none overflow-x-auto',
                            'prose-p:text-[12px] prose-p:leading-relaxed prose-p:my-1.5',
                            'prose-pre:bg-transparent prose-pre:m-0',
                            'prose-strong:text-[13px] prose-strong:text-gray-900 dark:prose-strong:text-gray-100',
                            'prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:text-[11px] prose-a:break-all',
                            'prose-hr:my-2 prose-hr:border-gray-200 dark:prose-hr:border-gray-700',
                            'text-muted-foreground',
                            'space-y-2 select-text'
                          )}>
                            <MarkdownRenderer content={parsedContent.searchResults} />
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* 思考过程（如果有） */}
                    {parsedContent.hasThinking && (
                      <div className="border-purple-400 dark:border-purple-600 select-text border-l-2 py-1 pl-3">
                        <Button
                          onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
                          variant="ghost"
                          className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 mb-2 h-auto select-none items-center gap-2 p-0 text-xs font-medium transition-colors"
                        >
                          <Brain className="size-3.5" />
                          <span>{t("ai.thinkingProcess")}</span>
                          {isThinkingExpanded ? (
                            <ChevronUp className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          )}
                        </Button>
                        
                        {isThinkingExpanded && (
                          <div className={cn(
                            'prose prose-sm dark:prose-invert max-w-none overflow-x-auto',
                            'prose-p:text-[12px] prose-p:leading-relaxed prose-p:my-1',
                            'prose-pre:bg-transparent prose-pre:m-0',
                            'prose-ul:text-[12px] prose-ol:text-[12px]',
                            'prose-li:text-[12px] prose-li:my-0.5',
                            'text-muted-foreground select-text'
                          )}>
                            <MarkdownRenderer content={parsedContent.thinking} />
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* 最终答案 */}
                    <div className={cn(
                      'prose prose-sm dark:prose-invert max-w-none overflow-x-auto',
                      'prose-p:text-[13px] prose-p:leading-relaxed prose-p:my-1',
                      'prose-pre:text-xs prose-pre:bg-transparent prose-pre:max-w-full prose-pre:overflow-x-auto prose-pre:m-0',
                      'prose-code:text-xs',
                      'prose-headings:text-sm prose-headings:text-foreground',
                      'prose-strong:text-foreground',
                      'prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-a:break-all',
                      'prose-ul:text-[13px] prose-ol:text-[13px]',
                      'prose-li:text-[13px] prose-li:my-0.5',
                      'prose-table:text-xs prose-table:max-w-full prose-table:overflow-x-auto',
                      'select-text'
                    )}>
                      <MarkdownRenderer content={parsedContent.answer} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* 消息操作按钮（悬停时显示在气泡旁边） */}
            {isHovered && !showGenerating && !showSending && (
              <div className={cn(
                'absolute top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                isUser ? 'right-full mr-2' : 'left-full ml-2'
              )}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="size-6 rounded-full p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title={copied ? '已复制' : '复制'}
                >
                  {copied ? (
                    <Check className="size-3" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </Button>
                
                {!isUser && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={isGenerating || isLoading}
                    className="size-6 rounded-full p-0 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    title={t("common.title.regenerate")}
                  >
                    <RotateCw className="size-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {/* 时间戳和状态 */}
          <div className="flex items-center gap-2 px-1">
            <span className="text-[10px] text-muted-foreground/60">
              {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            
            {/* 正在发送状态 */}
            {showSending && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                <span>{t("ai.sending")}</span>
              </div>
            )}
            
            {/* 正在思考状态 */}
            {showGenerating && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                <span>{t("ai.thinking")}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
