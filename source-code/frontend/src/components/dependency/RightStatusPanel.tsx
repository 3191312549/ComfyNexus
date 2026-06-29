/**
 * 右侧环境状态面板组件
 * 
 * 功能：
 * - 显示系统信息
 * - 显示硬件资源
 * - 显示软件依赖
 * - 刷新按钮
 */

import { useTranslation } from 'react-i18next'
import { useDependencyStore } from '@/stores/useDependencyStore'
import { Button } from '@/components/ui/Button'
import { RefreshCw, Terminal } from 'lucide-react'

export default function RightStatusPanel() {
  const { t } = useTranslation()
  const {
    envInfo,
    detectEnvironment,
    openTerminal,
  } = useDependencyStore()

  // 处理刷新
  const handleRefresh = () => {
    detectEnvironment()
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      {/* 工具箱卡片 */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <h3 className="mb-3 font-semibold text-content-primary">{t("dependency.toolbox")}</h3>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openTerminal}
            className="w-full justify-start"
          >
            <Terminal className="mr-2 size-4" />
            {t('dependency.openTerminal')}
          </Button>
        </div>
      </div>

      {/* 环境信息卡片 */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-content-primary">{t("dependency.envInfo")}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>

        {!envInfo ? (
          <div className="text-sm text-content-secondary">
            {t('dependency.detecting')}
          </div>
        ) : (
          <div className="space-y-4">
            {/* 系统信息 */}
            <div>
              <h4 className="mb-2 text-sm font-medium text-content-primary">{t("dependency.systemInfo")}</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-content-secondary">{t("dependency.system")}:</span>
                  <span className="text-right text-content-primary">{envInfo.windowsVersion || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* 硬件资源 */}
            <div>
              <h4 className="mb-2 text-sm font-medium text-content-primary">{t("dependency.hardwareResources")}</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-content-secondary">GPU:</span>
                  <span className="text-right text-content-primary">{envInfo.gpu?.model || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-secondary">{t("dependency.vram")}:</span>
                  <span className="text-right text-content-primary">{envInfo.gpu?.vram || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-secondary">CPU：</span>
                  <span className="text-right text-content-primary">{envInfo.cpu?.model || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-secondary">{t("dependency.memory")}:</span>
                  <span className="text-right text-content-primary">{envInfo.cpu?.ram || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* 软件依赖 */}
            <div>
              <h4 className="mb-2 text-sm font-medium text-content-primary">{t("dependency.softwareDeps")}</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-content-secondary">Python：</span>
                  <span className="text-right text-content-primary">{envInfo.python?.version || envInfo.pythonVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-secondary">{t("dependency.path")}:</span>
                  <span className="max-w-[200px] truncate text-right text-xs text-content-primary" title={envInfo.python?.path || envInfo.pythonPath}>
                    {envInfo.python?.path || envInfo.pythonPath}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-secondary">CUDA：</span>
                  <span className="text-right text-content-primary">{envInfo.cuda?.version || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-secondary">PyTorch:</span>
                  <span className="text-right text-content-primary">{envInfo.dependencies?.pytorch || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-secondary">Transformer:</span>
                  <span className="text-right text-content-primary">{envInfo.dependencies?.transformer || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* 注意力依赖 */}
            <div>
              <h4 className="mb-2 text-sm font-medium text-content-primary">{t("dependency.attentionDeps")}</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-content-secondary">Flash Attention:</span>
                  <span className="text-right text-content-primary">{envInfo.dependencies?.flashAttn || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-secondary">Sage Attention:</span>
                  <span className="text-right text-content-primary">{envInfo.dependencies?.sageAttention || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-secondary">xFormers:</span>
                  <span className="text-right text-content-primary">{envInfo.dependencies?.xformers || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
