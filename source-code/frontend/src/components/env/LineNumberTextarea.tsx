/**
 * 带行号的文本框组件
 * 
 * 功能：
 * - 显示行号
 * - 同步滚动
 * - 错误行高亮
 * - 等宽字体
 * - 终端风格深色背景
 */

import { useRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui'

export interface LineNumberTextareaProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  errors?: Array<{ line: number; message: string }>
  placeholder?: string
  className?: string
}

export function LineNumberTextarea({
  value,
  onChange,
  onBlur,
  errors = [],
  placeholder,
  className
}: LineNumberTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const [lineCount, setLineCount] = useState(1)

  useEffect(() => {
    const lines = value.split('\n').length
    setLineCount(Math.max(lines, 10))
  }, [value])

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  const hasError = (lineNum: number) => {
    return errors.some(err => err.line === lineNum)
  }

  return (
    <div className={cn(
      'flex rounded-lg overflow-hidden',
      'border border-border-subtle',
      'bg-[hsl(var(--bg-base))]',
      className
    )}>
      <div
        ref={lineNumbersRef}
        className={cn(
          'flex flex-col text-right select-none overflow-hidden',
          'bg-surface-active/50',
          'text-content-muted'
        )}
        style={{
          width: '3.5rem',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: '0.875rem',
          lineHeight: '1.5rem',
          paddingTop: '0.5rem',
          paddingBottom: '0.5rem'
        }}
      >
        {Array.from({ length: lineCount }, (_, i) => i + 1).map(lineNum => (
          <div
            key={lineNum}
            className={cn(
              'px-2 transition-colors',
              hasError(lineNum) && 'bg-danger/20 text-danger font-semibold'
            )}
            style={{ minHeight: '1.5rem' }}
          >
            {lineNum}
          </div>
        ))}
      </div>

      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onScroll={handleScroll}
        placeholder={placeholder}
        className={cn(
          'flex-1 resize-none px-4 py-2 outline-none',
          'font-mono text-sm leading-6',
          'bg-transparent',
          'text-content-primary',
          'placeholder:text-content-muted',
          'focus:outline-none'
        )}
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: '0.875rem',
          lineHeight: '1.5rem',
          minHeight: '15rem',
          maxHeight: '30rem'
        }}
        spellCheck={false}
      />
    </div>
  )
}
