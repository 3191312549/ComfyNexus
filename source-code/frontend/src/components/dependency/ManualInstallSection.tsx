/**
 * 手动安装组件 - 指定包管理
 * 
 * 功能：
 * - 包名搜索
 * - 版本选择
 * - 安装模式切换（模拟/安装/卸载）
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDependencyStore } from '@/stores/useDependencyStore'
import { InstallMode } from '@/types/dependency'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ManualInstallSection() {
  const { t } = useTranslation()
  const {
    packageVersions,
    isExecuting,
    searchPackage,
    installPackage,
    uninstallPackage,
  } = useDependencyStore()

  const [packageName, setPackageName] = useState('')
  const [selectedVersion, setSelectedVersion] = useState('')
  const [installMode, setInstallMode] = useState<'dry-run' | 'install'>('install')

  // 处理搜索
  const handleSearch = async () => {
    if (!packageName.trim()) return
    
    // searchPackage 内部已经会自动调用 fetchPackageVersions
    await searchPackage(packageName)
  }

  // 处理安装/模拟安装
  const handleInstall = () => {
    if (!packageName.trim() || !selectedVersion) return
    
    // 将字符串模式转换为 InstallMode 枚举
    const mode = installMode === 'dry-run' ? InstallMode.DRY_RUN : InstallMode.STANDARD
    installPackage(packageName, selectedVersion, mode)
  }

  // 处理卸载
  const handleUninstall = () => {
    if (!packageName.trim()) return
    
    uninstallPackage(packageName)
  }

  return (
    <div className="dark:border-dark-border dark:bg-dark-secondary border-gray-200 bg-white rounded-lg border p-4">
      <h3 className="dark:text-dark-text-primary text-gray-900 mb-4 font-semibold">{t("dependency.manualInstall")}</h3>
      
      <div className="space-y-4">
        {/* 包名输入 */}
        <div>
          <label className="dark:text-dark-text-secondary text-gray-500 mb-2 block text-sm">
            包名
          </label>
          <div className="flex gap-2">
            <Input
              placeholder={t("common.placeholder.packageExample")}
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              disabled={isExecuting}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
              }}
            />
            <Button
              variant="outline"
              onClick={handleSearch}
              disabled={!packageName.trim() || isExecuting}
            >
              搜索
            </Button>
          </div>
        </div>

        {/* 版本选择 */}
        <div>
          <label className="dark:text-dark-text-secondary text-gray-500 mb-2 block text-sm">
            版本
          </label>
          <Select
            value={selectedVersion}
            onValueChange={setSelectedVersion}
            disabled={packageVersions.length === 0 || isExecuting}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("common.placeholder.selectVersion")} />
            </SelectTrigger>
            <SelectContent>
              {packageVersions.map((version) => (
                <SelectItem key={version} value={version}>
                  {version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 安装模式切换 */}
        <div>
          <label className="dark:text-dark-text-secondary text-gray-500 mb-2 block text-sm">
            操作模式
          </label>
          <Tabs
            value={installMode}
            onValueChange={(value) => setInstallMode(value as 'dry-run' | 'install')}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dry-run">{t('dependency.dryRunInstall')}</TabsTrigger>
              <TabsTrigger value="install">{t('dependency.actualInstall')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={handleInstall}
            disabled={!packageName.trim() || !selectedVersion || isExecuting}
          >
            {isExecuting ? '执行中...' : installMode === InstallMode.DRY_RUN ? '模拟安装' : '安装'}
          </Button>
          <Button
            variant="destructive"
            onClick={handleUninstall}
            disabled={!packageName.trim() || isExecuting}
          >
            卸载
          </Button>
        </div>
      </div>
    </div>
  )
}
