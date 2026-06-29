/**
 * 清单安装组件 - 批量安装依赖
 * 
 * 功能：
 * - 选择 requirements.txt 文件
 * - 批量安装依赖
 * - 支持模拟安装
 */

import { useTranslation } from 'react-i18next'
import { useDependencyStore } from '@/stores/useDependencyStore'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useState } from 'react'

export default function BatchInstallSection() {
  const { t } = useTranslation()
  const {
    requirementsFile,
    isExecuting,
    selectRequirementsFile,
    installFromRequirements,
  } = useDependencyStore()

  const [installMode, setInstallMode] = useState<'dry-run' | 'install'>('install')

  // 处理文件选择
  const handleSelectFile = () => {
    selectRequirementsFile()
  }

  // 处理安装
  const handleInstall = () => {
    if (!requirementsFile) return
    
    installFromRequirements(installMode)
  }

  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <h3 className="text-foreground mb-4 font-semibold">{t("dependency.manifestInstall")}</h3>
      
      <div className="space-y-4">
        {/* 文件选择 */}
        <div>
          <label className="text-muted-foreground mb-2 block text-sm">
            requirements.txt 文件
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={requirementsFile || ''}
              placeholder="选择文件..."
              className="flex-1 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none"
            />
            <Button
              variant="outline"
              onClick={handleSelectFile}
              disabled={isExecuting}
            >
              浏览
            </Button>
          </div>
        </div>

        {/* 安装模式切换 */}
        <div>
          <label className="text-muted-foreground mb-2 block text-sm">
            操作模式
          </label>
          <Tabs
            value={installMode}
            onValueChange={(value) => setInstallMode(value as 'dry-run' | 'install')}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dry-run">{t("dependency.simulateInstall")}</TabsTrigger>
              <TabsTrigger value="install">{t("dependency.actualInstall")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* 安装按钮 */}
        <Button
          className="w-full"
          onClick={handleInstall}
          disabled={!requirementsFile || isExecuting}
        >
          {isExecuting ? '执行中...' : installMode === 'dry-run' ? '模拟安装' : '批量安装'}
        </Button>
      </div>
    </div>
  )
}
