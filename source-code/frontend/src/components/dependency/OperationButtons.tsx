/**
 * 操作按钮组件
 * 
 * 根据选中的插件显示相应的批量操作按钮
 */

import { Download, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface OperationButtonsProps {
  selectedPlugin: string | null
  onBatchInstall: () => void
  disabled?: boolean
  hasRequirements?: boolean
}

export default function OperationButtons({
  selectedPlugin,
  onBatchInstall,
  disabled = false,
  hasRequirements = true
}: OperationButtonsProps) {
  // 根据选中的插件确定按钮文本和样式
  const getButtonConfig = () => {
    if (!selectedPlugin) {
      return null
    }

    if (selectedPlugin === 'core') {
      return {
        text: '一键安装核心依赖',
        variant: 'default' as const,
        icon: <Download className="mr-2 size-4" />,
        tooltip: '安装 ComfyUI 核心的所有依赖包'
      }
    }

    if (selectedPlugin === 'all') {
      return {
        text: '一键安装全部依赖',
        variant: 'destructive' as const,
        icon: <AlertTriangle className="mr-2 size-4" />,
        tooltip: '安装所有依赖（核心 + 所有插件）'
      }
    }

    // 单个插件
    return {
      text: `一键安装 ${selectedPlugin} 依赖`,
      variant: 'default' as const,
      icon: <Download className="mr-2 size-4" />,
      tooltip: `安装 ${selectedPlugin} 插件的所有依赖包`
    }
  }

  const buttonConfig = getButtonConfig()

  if (!buttonConfig) {
    return null
  }

  // 如果插件没有 requirements.txt，禁用按钮
  const isDisabled = disabled || !hasRequirements

  return (
    <Button
      onClick={onBatchInstall}
      disabled={isDisabled}
      variant={buttonConfig.variant}
      size="default"
      className="min-w-[180px]"
    >
      {buttonConfig.icon}
      {buttonConfig.text}
    </Button>
  )
}
