/**
 * 工具箱组件 - 终端和日志管理
 * 
 * 功能：
 * - 打开终端
 * - 清空日志
 */

import { useTranslation } from 'react-i18next'
import { useDependencyStore } from '@/stores/useDependencyStore'
import { Button } from '@/components/ui/Button'
import { Terminal, Trash2 } from 'lucide-react'

export default function ToolboxSection() {
  const { t } = useTranslation()
  const {
    isExecuting,
    openTerminal,
    clearLogs,
  } = useDependencyStore()

  // 处理打开终端
  const handleOpenTerminal = () => {
    openTerminal()
  }

  // 处理清空日志
  const handleClearLogs = () => {
    clearLogs()
  }

  return (
    <div className="dark:border-dark-border dark:bg-dark-secondary border-gray-200 bg-white rounded-lg border p-4">
      <h3 className="dark:text-dark-text-primary text-gray-900 mb-4 font-semibold">{t("dependency.toolbox")}</h3>
      
      <div className="space-y-2">
        {/* 打开终端按钮 */}
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleOpenTerminal}
          disabled={isExecuting}
        >
          <Terminal className="mr-2 size-4" />
          打开终端
        </Button>

        {/* 清空日志按钮 */}
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleClearLogs}
          disabled={isExecuting}
        >
          <Trash2 className="mr-2 size-4" />
          清空日志
        </Button>
      </div>
    </div>
  )
}
