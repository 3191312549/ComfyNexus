/**
 * Markdown 渲染组件
 * 
 * 功能：
 * - 渲染 Markdown 内容
 * - 代码高亮
 * - 代码块复制按钮
 * - 支持表格、列表等 GFM 扩展
 * 
 * 验证需求：4.1, 4.2
 */

import { useTranslation } from 'react-i18next'
import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Button } from '@/components/ui/Button'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

// 导入自定义代码高亮样式
import '@/styles/code-highlight.css'

interface MarkdownRendererProps {
  content: string
  className?: string
}

/**
 * 代码块组件（带复制按钮）
 */
const CodeBlock: React.FC<{
  inline?: boolean
  className?: string
  children: React.ReactNode
}> = ({ inline, className, children }) => {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  
  // 提取代码内容，同时清理可能残留的首尾反引号
  const code = String(children).replace(/\n$/, '').replace(/^`+|`+$/g, '')
  
  // 判断是否是真正的代码块：
  // 1. 有 language- 前缀的 className（三个反引号 + 语言标识）
  // 2. 或者内容包含换行符（多行代码块）
  // 3. 或者明确标记为非 inline
  const hasLanguageClass = /language-(\w+)/.test(className || '')
  const isMultiLine = code.includes('\n')
  const isCodeBlock = hasLanguageClass || isMultiLine || (inline === false)
  
  // 内联代码（单个反引号）
  if (inline || !isCodeBlock) {
    return (
      <code className="select-text whitespace-pre-wrap break-words rounded border border-border/50 bg-[hsl(220_14%_95%)] px-1.5 py-0.5 font-mono text-[13px] text-pink-600 dark:border-border dark:bg-[hsl(224_12%_16%)] dark:text-pink-400">
        {code}
      </code>
    )
  }
  
  // 提取语言类型
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''
  
  /**
   * 复制代码到剪贴板
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('复制失败:', error)
    }
  }
  
  // 代码块（三个反引号）
  return (
    <div className="group relative my-3 select-text overflow-hidden rounded-lg border border-border/60 dark:border-border">
      {/* 语言标签和复制按钮 */}
      <div className="flex select-none items-center justify-between border-b border-border/60 bg-[hsl(220_14%_95%)] px-3 py-1.5 dark:border-border dark:bg-[hsl(224_12%_13%)]">
        {language && (
          <span className="font-mono text-[10px] font-semibold uppercase text-muted-foreground">
            {language}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-2 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="mr-1 size-3" />
              <span className="text-[10px]">{t("ai.copied")}</span>
            </>
          ) : (
            <>
              <Copy className="mr-1 size-3" />
              <span className="text-[10px]">{t("ai.copy")}</span>
            </>
          )}
        </Button>
      </div>
      
      {/* 代码内容 */}
      <div className="max-h-[600px] overflow-y-auto">
        <pre className="!my-0 max-w-full select-text overflow-x-auto bg-[hsl(220_14%_97%)] p-3 whitespace-pre-wrap dark:bg-[hsl(224_12%_8%)]">
          <code className={cn(className, "text-[12px] leading-relaxed font-mono block select-text break-all text-[#24292e] dark:text-[#c9d1d9]")}>{children}</code>
        </pre>
      </div>
    </div>
  )
}

/**
 * Markdown 渲染器组件
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className
}) => {
  // 预处理：清理 AI 返回内容中多余的反引号
  // 有些模型会输出 ``code`` 或 ` `code` ` 这样的格式，导致外层反引号残留
  const processedContent = content
    // ``code`` → `code`
    .replace(/``([^`\n]+?)``/g, '`$1`')
    // ` `code` ` → `code`（反引号外侧有空格的情况）
    .replace(/`\s*`([^`\n]+?)`\s*`/g, '`$1`')
  
  return (
    <div className={cn('markdown-body select-text', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // 自定义代码块渲染
          code: CodeBlock as any,
          
          // 自定义链接渲染（在新标签页打开）
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="select-text text-primary hover:underline"
            >
              {children}
            </a>
          ),
          
          // 自定义表格渲染
          table: ({ children }) => (
            <div className="my-4 select-text overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                {children}
              </table>
            </div>
          ),
          
          thead: ({ children }) => (
            <thead className="select-text bg-muted/50">{children}</thead>
          ),
          
          th: ({ children }) => (
            <th className="select-text px-4 py-2 text-left text-sm font-medium">
              {children}
            </th>
          ),
          
          td: ({ children }) => (
            <td className="select-text border-t px-4 py-2 text-sm">{children}</td>
          ),
          
          // 自定义引用块渲染
          blockquote: ({ children }) => (
            <blockquote className="my-4 select-text border-l-4 border-primary py-2 pl-4 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          
          // 自定义列表渲染
          ul: ({ children }) => (
            <ul className="my-2 select-text list-inside list-disc space-y-1">
              {children}
            </ul>
          ),
          
          ol: ({ children }) => (
            <ol className="my-2 select-text list-inside list-decimal space-y-1">
              {children}
            </ol>
          ),
          
          // 自定义标题渲染
          h1: ({ children }) => (
            <h1 className="mb-4 mt-6 select-text text-2xl font-bold">{children}</h1>
          ),
          
          h2: ({ children }) => (
            <h2 className="mb-3 mt-5 select-text text-xl font-bold">{children}</h2>
          ),
          
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 select-text text-lg font-bold">{children}</h3>
          ),
          
          h4: ({ children }) => (
            <h4 className="mb-2 mt-3 select-text text-base font-bold">{children}</h4>
          ),
          
          // 自定义段落渲染
          // 添加 whitespace-pre-wrap 以保留段落内的换行符
          // 当 AI 引用多行日志但未用代码块包裹时，换行不会丢失
          p: ({ children }) => (
            <p className="my-2 select-text leading-relaxed whitespace-pre-wrap break-words">{children}</p>
          )
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}
