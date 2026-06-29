/**
 * 系统提示词设置按钮组件
 * 
 * 用于打开系统提示词管理弹窗
 * 
 * 验证需求：3.1, 3.2, 3.3, 3.4
 */

import React from 'react'
import { useTranslation } from 'react-i18next'
import { Settings } from 'lucide-react'
import { Button } from '../ui/Button'

interface PromptSettingsButtonProps {
  onClick: () => void
  className?: string
}

export const PromptSettingsButton: React.FC<PromptSettingsButtonProps> = React.memo(({
  onClick,
  className = ''
}) => {
  const { t } = useTranslation()
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={className}
      title={t("common.title.managePromptPresets")}
    >
      <Settings className="size-4" />
    </Button>
  )
})

PromptSettingsButton.displayName = 'PromptSettingsButton'
