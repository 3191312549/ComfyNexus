/**
 * 消息列表组件
 * 
 * 功能：
 * - 显示消息列表
 * - 智能自动滚动（用户向上滚动时禁用）
 * - 显示加载指示器
 * - 显示生成中的状态
 * - 显示"查看最新消息"悬浮按钮
 * 
 * 验证需求：1.1
 */

import React, { useEffect, useRef, useCallback } from 'react'
import { useAIStore } from '@/stores/useAIStore'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageSquare, ArrowDown } from 'lucide-react'
import { MessageItem } from './MessageItem'
import { cn } from '@/lib/utils'

/**
 * 滚动到底部悬浮按钮组件
 */
const ScrollToBottomButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute bottom-4 right-4 z-10',
        'flex items-center gap-1.5 px-3 py-2',
        'bg-purple-600 hover:bg-purple-700 text-white',
        'rounded-full shadow-lg',
        'transition-all duration-200',
        'text-sm font-medium',
        'animate-in fade-in-0 zoom-in-95'
      )}
    >
      <ArrowDown className="size-4" />
      <span>查看最新消息</span>
    </button>
  )
}

/**
 * 消息列表组件
 */
export const MessageList: React.FC = () => {
  const { messages, isLoading, isGenerating, autoScrollEnabled, setAutoScrollEnabled } = useAIStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  
  /**
   * 滚动到底部
   */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])
  
  /**
   * 处理滚动事件
   * 检测用户是否向上滚动，从而禁用自动滚动
   */
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget
    const scrollBottom = element.scrollHeight - element.scrollTop - element.clientHeight
    const isAtBottom = scrollBottom < 50
    
    if (!isAtBottom && autoScrollEnabled) {
      setAutoScrollEnabled(false)
    } else if (isAtBottom && !autoScrollEnabled) {
      setAutoScrollEnabled(true)
    }
  }, [autoScrollEnabled, setAutoScrollEnabled])
  
  /**
   * 点击"查看最新消息"按钮
   */
  const handleScrollToBottom = useCallback(() => {
    setAutoScrollEnabled(true)
    scrollToBottom()
  }, [setAutoScrollEnabled, scrollToBottom])
  
  /**
   * 当消息列表变化时，根据自动滚动状态决定是否滚动
   */
  useEffect(() => {
    if (autoScrollEnabled) {
      scrollToBottom()
    }
  }, [messages, autoScrollEnabled, scrollToBottom])
  
  return (
    <div className="relative size-full">
      <ScrollArea ref={scrollAreaRef} className="size-full" onScroll={handleScroll}>
        <div className="min-h-full pb-4 pt-5">
          {/* 空状态 */}
          {messages.length === 0 && !isLoading && (
            <div className="flex h-full flex-col items-center justify-center px-4 py-32 text-center">
              <div className="from-purple-500 to-purple-600 mb-6 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg">
                <MessageSquare className="text-white size-10" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-foreground">
                开始新的对话
              </h3>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                在下方输入框中输入您的问题，AI 助手将为您提供智能回答和帮助。
              </p>
            </div>
          )}
          
          {/* 消息列表 */}
          {messages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))}
          
          {/* 滚动锚点 */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* 悬浮按钮：用户向上滚动且正在生成时显示 */}
      {!autoScrollEnabled && isGenerating && (
        <ScrollToBottomButton onClick={handleScrollToBottom} />
      )}
    </div>
  )
}
