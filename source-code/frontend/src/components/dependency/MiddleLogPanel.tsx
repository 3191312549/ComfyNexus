/**
 * 中间日志显示面板组件
 * 
 * 功能：
 * - 实时显示命令执行日志
 * - 自动滚动到底部
 * - AI 分析按钮
 * - 清空日志
 */

import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useDependencyStore } from '@/stores/useDependencyStore'
import { useAPIConfigStore } from '@/stores/useAPIConfigStore'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { Sparkles, Trash2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import AIAnalysisDialog from './AIAnalysisDialog'

export default function MiddleLogPanel() {
  const { t } = useTranslation()
  const {
    logs,
    clearLogs,
    analyzeLogsWithAI,
    aiAnalysisOpen,
    aiAnalysisContent,
    aiAnalysisStreaming,
    closeAIAnalysis,
    selectedApiConfigId,
    setSelectedApiConfigId,
  } = useDependencyStore()
  
  const { configs, loadConfigs } = useAPIConfigStore()

  const logContainerRef = useRef<HTMLDivElement>(null)

  // 注册全局日志回调
  useEffect(() => {
    (window as any).onDependencyLog = (log: any) => {
      // 通过 store 的 addLog 方法添加日志
      useDependencyStore.getState().addLog(log)
    }

    return () => {
      delete (window as any).onDependencyLog
    }
  }, [])
  
  // 加载 API 配置列表
  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])
  
  // 当配置列表加载完成后，如果没有选中配置，则设置为默认配置
  useEffect(() => {
    if (configs.length > 0 && !selectedApiConfigId) {
      const defaultConfig = configs.find(c => c.isDefault)
      if (defaultConfig) {
        setSelectedApiConfigId(defaultConfig.id)
      }
    }
  }, [configs, selectedApiConfigId, setSelectedApiConfigId])

  // 自动滚动到底部
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  // 获取日志级别对应的样式
  const getLogLevelClass = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-danger'
      case 'warning':
        return 'text-warning'
      case 'success':
        return 'text-success'
      case 'info':
      default:
        return 'text-foreground'
    }
  }

  // 格式化时间戳
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  // 解析消息中的颜色标记 [[color:text]]
  const parseColoredMessage = (message: string) => {
    const parts: Array<{ text: string; color?: string }> = []
    const regex = /\[\[(\w+):([^\]]+)\]\]/g
    let lastIndex = 0
    let match

    while ((match = regex.exec(message)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: message.slice(lastIndex, match.index) })
      }
      parts.push({ text: match[2], color: match[1] })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < message.length) {
      parts.push({ text: message.slice(lastIndex) })
    }

    return parts.length > 0 ? parts : [{ text: message }]
  }

  // 获取颜色对应的 CSS 类
  const getColorClass = (color: string) => {
    switch (color) {
      case 'orange':
        return 'text-orange-500'
      case 'red':
        return 'text-red-500'
      default:
        return ''
    }
  }

  // 渲染带颜色的消息
  const renderColoredMessage = (message: string) => {
    const parts = parseColoredMessage(message)
    return parts.map((part, index) => {
      if (part.color) {
        return (
          <span key={index} className={getColorClass(part.color)}>
            {part.text}
          </span>
        )
      }
      return <span key={index}>{part.text}</span>
    })
  }

  // 处理复制
  const handleCopy = () => {
    console.log('[MiddleLogPanel] AI 分析结果已复制')
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface p-4">
        {/* 标题栏 */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-content-primary">{t("dependency.runLog")}</h3>
          <div className="flex gap-2">
            {/* API 配置选择器 */}
            {configs.length > 0 ? (
              <Select
                value={selectedApiConfigId || undefined}
                onValueChange={setSelectedApiConfigId}
              >
                <SelectTrigger className="h-8 w-[180px] text-sm">
                  <SelectValue placeholder={t("common.placeholder.selectApiConfig")}>
                    {selectedApiConfigId && configs.find(c => c.id === selectedApiConfigId) ? (
                      <div className="flex items-center gap-2">
                        <span className="truncate">
                          {configs.find(c => c.id === selectedApiConfigId)?.alias}
                        </span>
                        {configs.find(c => c.id === selectedApiConfigId)?.status === 'unavailable' && (
                          <AlertCircle className="size-3 shrink-0 text-danger" />
                        )}
                      </div>
                    ) : (
                      t('dependency.selectApiConfig')
                    )}
                  </SelectValue>
                </SelectTrigger>
                
                <SelectContent>
                  {configs.map((config) => (
                    <SelectItem key={config.id} value={config.id}>
                      <div className="flex w-full items-center justify-between gap-2">
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium">{config.alias}</span>
                          <span className="text-xs text-content-muted">
                            {config.provider} / {config.model}
                          </span>
                        </div>
                        {config.isDefault && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                            {t('dependency.defaultConfig')}
                          </span>
                        )}
                        {config.status === 'unavailable' && (
                          <AlertCircle className="size-3 shrink-0 text-danger" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 rounded border border-warning/20 bg-warning/10 px-2 py-1 text-xs">
                <AlertCircle className="size-3 text-warning" />
                <span className="text-warning">
                  {t('dependency.pleaseConfigApi')}
                </span>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={analyzeLogsWithAI}
              disabled={logs.length === 0 || !selectedApiConfigId}
            >
              <Sparkles className="mr-2 size-4" />
              {t('dependency.aiAnalysis')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearLogs}
              disabled={logs.length === 0}
            >
              <Trash2 className="mr-2 size-4" />
              {t('dependency.clear')}
            </Button>
          </div>
        </div>

        {/* 日志内容区域 */}
        <div
          ref={logContainerRef}
          className="flex-1 space-y-1 overflow-y-auto rounded bg-muted p-3 font-mono text-sm"
        >
          {logs.length === 0 ? (
            <p className="text-content-secondary">{t("dependency.waitingForOperation")}</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex gap-2">
                <span className="shrink-0 text-content-muted">
                  [{formatTimestamp(log.timestamp)}]
                </span>
                <span className={cn('shrink-0', getLogLevelClass(log.level))}>
                  [{log.level.toUpperCase()}]
                </span>
                <span className="break-all text-content-primary">{renderColoredMessage(log.message)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* AI 分析对话框 */}
      <AIAnalysisDialog
        isOpen={aiAnalysisOpen}
        content={aiAnalysisContent}
        isStreaming={aiAnalysisStreaming}
        onClose={closeAIAnalysis}
        onCopy={handleCopy}
      />
    </div>
  )
}
