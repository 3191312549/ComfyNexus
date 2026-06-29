/**
 * 导出对话框组件
 * 
 * 功能：
 * - 选择导出格式（JSON/Markdown）
 * - 导出聊天记录
 * - 下载文件
 * 
 * 验证需求：6.1
 */

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Upload, FileJson, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 导出格式类型
 */
type ExportFormat = 'json' | 'markdown'

/**
 * 导出对话框属性
 */
interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  topicId: string
  topicName: string
}

/**
 * 导出对话框组件
 */
export const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onOpenChange,
  topicId,
  topicName,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json')
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useTranslation()
  
  /**
   * 处理导出
   */
  const handleExport = async () => {
    try {
      setIsExporting(true)
      setError(null)
      
      console.log('[ExportDialog] 开始导出:', { topicId, format: selectedFormat })
      
      // 检查是否在开发环境
      if (!window.pywebview || !window.pywebview.api) {
        console.log('[ExportDialog] 开发环境：使用 Mock 数据')
        
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 生成 Mock 数据
        const mockContent = selectedFormat === 'json'
          ? JSON.stringify({
              export_info: {
                export_time: new Date().toISOString(),
                format: 'json',
                version: '1.0'
              },
              topic: {
                id: topicId,
                name: topicName,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              messages: [
                {
                  id: 'msg_1',
                  role: 'user',
                  content: '这是一条测试消息',
                  timestamp: new Date().toISOString()
                },
                {
                  id: 'msg_2',
                  role: 'assistant',
                  content: '这是 AI 的回复',
                  timestamp: new Date().toISOString(),
                  model: 'gpt-3.5-turbo'
                }
              ],
              statistics: {
                total_messages: 2,
                user_messages: 1,
                assistant_messages: 1
              }
            }, null, 2)
          : `# ${topicName}\n\n## 对话信息\n\n- **话题 ID**: ${topicId}\n- **导出时间**: ${new Date().toISOString()}\n\n---\n\n## 对话内容\n\n### 👤 **用户**\n\n这是一条测试消息\n\n---\n\n### 🤖 **AI 助手** (gpt-3.5-turbo)\n\n这是 AI 的回复\n\n---\n`
        
        // 下载文件
        downloadFile(mockContent, selectedFormat)
        
        // 关闭对话框
        onOpenChange(false)
        return
      }
      
      // 生产环境：调用后端 API
      console.log('[ExportDialog] 调用后端 API: ai_export_chat')
      
      let response
      try {
        response = await window.pywebview.api.ai_export_chat(topicId, selectedFormat)
      } catch (apiError) {
        console.error('[ExportDialog] API 调用失败:', apiError)
        throw new Error(`API 调用失败: ${apiError instanceof Error ? apiError.message : String(apiError)}`)
      }
      
      console.log('[ExportDialog] API 响应:', response)
      
      if (!response) {
        throw new Error('API 返回空响应')
      }
      
      if (!response.success) {
        throw new Error(response.error_message || '导出失败，未知错误')
      }
      
      if (!response.content) {
        throw new Error('导出内容为空')
      }
      
      console.log('[ExportDialog] 导出成功，内容长度:', response.content.length)
      
      // 下载文件
      downloadFile(response.content, selectedFormat)
      
      // 关闭对话框
      onOpenChange(false)
      
    } catch (err) {
      console.error('[ExportDialog] 导出失败:', err)
      const errorMessage = err instanceof Error ? err.message : '导出失败，请重试'
      setError(errorMessage)
    } finally {
      setIsExporting(false)
    }
  }
  
  /**
   * 下载文件
   */
  const downloadFile = (content: string, format: ExportFormat) => {
    // 生成文件名（包含话题名称和时间戳）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const extension = format === 'json' ? 'json' : 'md'
    const filename = `${topicName}_${timestamp}.${extension}`
    
    // 创建 Blob
    const blob = new Blob([content], {
      type: format === 'json' ? 'application/json' : 'text/markdown'
    })
    
    // 创建下载链接
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    
    // 触发下载
    document.body.appendChild(link)
    link.click()
    
    // 清理
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    console.log('[ExportDialog] 文件已下载:', filename)
  }
  
  /**
   * 处理格式选择
   */
  const handleFormatSelect = (format: ExportFormat) => {
    setSelectedFormat(format)
    setError(null)
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden rounded-lg bg-surface p-0 shadow-xl">
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <DialogTitle className="text-lg font-semibold text-foreground">
            {t('aiAssistant.export.title')}
          </DialogTitle>
        </div>
        
        {/* 内容区域 */}
        <div className="space-y-3 px-5 py-4">
          <DialogDescription className="mb-3 text-sm text-muted-foreground">
            {t('aiAssistant.export.description')}
          </DialogDescription>
          
          {/* JSON 格式 */}
          <Button
            onClick={() => handleFormatSelect('json')}
            variant="outline"
            className={cn(
              'h-auto w-full justify-start gap-3 p-3',
              selectedFormat === 'json'
                ? 'border-primary bg-primary/5'
                : ''
            )}
          >
            <div className={cn(
              'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
              selectedFormat === 'json'
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground'
            )}>
              <FileJson className="size-4" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-foreground">
                {t('aiAssistant.export.jsonFormat')}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {t('aiAssistant.export.jsonDescription')}
              </div>
            </div>
          </Button>
          
          {/* Markdown 格式 */}
          <Button
            onClick={() => handleFormatSelect('markdown')}
            variant="outline"
            className={cn(
              'h-auto w-full justify-start gap-3 p-3',
              selectedFormat === 'markdown'
                ? 'border-primary bg-primary/5'
                : ''
            )}
          >
            <div className={cn(
              'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
              selectedFormat === 'markdown'
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground'
            )}>
              <FileText className="size-4" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-foreground">
                {t('aiAssistant.export.markdownFormat')}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {t('aiAssistant.export.markdownDescription')}
              </div>
            </div>
          </Button>
          
          {/* 错误提示 */}
          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 p-3">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}
        </div>
        
        {/* 底部按钮 */}
        <div className="flex justify-end gap-2.5 border-t border-border bg-muted/30 px-5 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
            className="px-4 py-2"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t('aiAssistant.export.exporting')}
              </>
            ) : (
              <>
                <Upload className="mr-2 size-4" />
                {t('aiAssistant.export.export')}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
