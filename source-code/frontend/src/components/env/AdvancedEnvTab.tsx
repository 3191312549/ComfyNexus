/**
 * 高级环境变量选项卡组件
 * 
 * 功能：
 * - 提供终端风格的代码编辑器
 * - 显示配置格式说明和示例
 * - 支持多行环境变量配置
 * - 统一深色终端风格背景
 * 
 * 需求：2.1, 2.2, 5.1, 6.1, 6.2
 */

import { useRef, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Terminal, AlertTriangle } from 'lucide-react'
import { Textarea } from '@/components/ui'
import type { AdvancedEnvTabProps } from '@/types/environment'

export function AdvancedEnvTab({
  value,
  onChange
}: AdvancedEnvTabProps) {
  const { t } = useTranslation()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const [lineCount, setLineCount] = useState(1)

  useEffect(() => {
    const lines = value.split('\n').length
    setLineCount(Math.max(lines, 16))
  }, [value])

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-6 items-start">
        <div className="lg:col-span-4 lg:sticky lg:top-36 space-y-6">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Terminal className="size-4 text-muted-foreground" />
              {t('env.acceleration.advanced.envVarConfig')}
            </h3>
            <p className="text-[13px] text-muted-foreground mt-2.5 leading-relaxed">
              {t('env.acceleration.advanced.configFormatNote')}
            </p>
          </div>

          <div className="bg-primary/5 border-l-4 border-l-primary/60 p-5 rounded-r-lg">
            <h4 className="text-[13px] font-semibold text-primary mb-2">
              {t('env.acceleration.advanced.example')}
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-[13px] text-primary/80">
              <li>{t('env.acceleration.advanced.oneVarPerLine')}</li>
              <li>{t('env.acceleration.advanced.supportComment')}</li>
              <li>{t('env.acceleration.advanced.spaceInValue')}</li>
            </ul>
            <div className="mt-4 bg-background/60 p-3 rounded-lg border border-primary/20 font-mono text-[12px] text-foreground">
              # {t('env.acceleration.advanced.tip1')}<br />
              {t('env.cudaVisibleDevicesExample')}
            </div>
          </div>

          <div className="text-[12px] text-muted-foreground bg-surface p-4 rounded-xl border border-border-subtle">
            <p className="font-bold text-foreground mb-1 flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-warning" />
              {t('env.acceleration.advanced.tip')}
            </p>
            {t('env.acceleration.advanced.tip4')}
          </div>
        </div>

        <div className="lg:col-span-8">
          {/* eslint-disable-next-line no-restricted-syntax */}
          <div className="bg-[hsl(var(--bg-base))] rounded-xl overflow-hidden border border-border-subtle shadow-soft-lg min-h-[500px] flex flex-col">
            <div className="bg-surface-active border-b border-border-subtle px-4 py-3 flex items-center">
              <div className="flex gap-2">
                {/* eslint-disable-next-line no-restricted-syntax */}
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                {/* eslint-disable-next-line no-restricted-syntax */}
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                {/* eslint-disable-next-line no-restricted-syntax */}
                <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
              </div>
              <div className="flex-1 text-center">
                <span className="text-xs font-mono text-content-muted">
                  {t('env.terminalTitle')}
                </span>
              </div>
            </div>

            <div className="flex flex-1 font-mono text-[13px] leading-relaxed">
              <div
                ref={lineNumbersRef}
                className="py-4 pl-4 pr-3 text-right select-none border-r border-border-subtle bg-surface-active/50 overflow-hidden"
                style={{ minWidth: '3rem' }}
              >
                {Array.from({ length: lineCount }, (_, i) => i + 1).map(lineNum => (
                  <div
                    key={lineNum}
                    className="text-content-muted"
                    style={{ minHeight: '1.5rem', lineHeight: '1.5rem' }}
                  >
                    {lineNum}
                  </div>
                ))}
              </div>

              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onScroll={handleScroll}
                placeholder={t('common.placeholder.envVarsExample')}
                className="flex-1 p-4 bg-transparent text-content-primary resize-none focus:outline-none placeholder:text-content-muted"
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  lineHeight: '1.5rem'
                }}
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
