/**
 * 左侧功能控制面板组件（统一版本）
 * 
 * 功能：
 * - 核心安装 (PyTorch)
 * - 手动安装
 * - 清单安装
 * - 工具箱
 * 
 * 所有功能合并在一个卡片中，标题和输入框在同一行
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDependencyStore } from '@/stores/useDependencyStore'
import { InstallMode, type MirrorSource } from '@/types/dependency'
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

export default function LeftControlPanel() {
  const { t } = useTranslation()
  const {
    cudaVersion,
    availableCudaVersions,
    selectedCudaVersion,
    pytorchVersions,
    packageVersions,
    requirementsFile,
    selectedFileType,
    isExecuting,
    detectCudaVersion,
    setSelectedCudaVersion,
    fetchPytorchVersions,
    installPytorch,
    searchPackage,
    installPackage,
    uninstallPackage,
    selectRequirementsFile,
    installFromRequirements,
    mirrorSource,
    setMirrorSource,
  } = useDependencyStore()

  // 核心安装状态
  const [selectedPytorchVersion, setSelectedPytorchVersion] = useState('')

  // 手动安装状态
  const [packageName, setPackageName] = useState('')
  const [selectedVersion, setSelectedVersion] = useState('')
  const [manualInstallMode, setManualInstallMode] = useState<'dry-run' | 'install'>('install')

  // 清单安装状态
  const [batchInstallMode, setBatchInstallMode] = useState<'dry-run' | 'install'>('install')

  const mirrorSourceOptions: { value: MirrorSource; label: string }[] = [
    { value: 'auto', label: t('dependency.mirror.auto') },
    { value: 'official', label: t('dependency.mirror.official') },
    { value: 'tuna', label: t('dependency.mirror.tuna') },
    { value: 'bfsu', label: t('dependency.mirror.bfsu') },
    { value: 'aliyun', label: t('dependency.mirror.aliyun') },
    { value: 'tencent', label: t('dependency.mirror.tencent') },
  ]

  // 组件挂载时检测 CUDA 版本
  useEffect(() => {
    detectCudaVersion()
  }, [detectCudaVersion])

  // 移除自动查询 PyTorch 版本的逻辑
  // 用户需要手动点击查询按钮

  // 处理 PyTorch 安装
  const handleInstallPytorch = () => {
    if (!selectedPytorchVersion) return
    installPytorch(selectedPytorchVersion, selectedCudaVersion)
  }

  // 处理查询 PyTorch 版本
  const handleQueryPytorchVersions = () => {
    if (!selectedCudaVersion) return
    fetchPytorchVersions(selectedCudaVersion)
  }

  // 处理包搜索
  const handleSearchPackage = async () => {
    if (!packageName.trim()) return
    // searchPackage 内部已经会自动调用 fetchPackageVersions
    await searchPackage(packageName)
  }

  // 处理手动安装
  const handleManualInstall = () => {
    if (!packageName.trim() || !selectedVersion) return
    // 将字符串模式转换为 InstallMode 枚举
    const mode = manualInstallMode === 'dry-run' ? InstallMode.DRY_RUN : InstallMode.STANDARD
    installPackage(packageName, selectedVersion, mode)
  }

  // 处理卸载
  const handleUninstall = () => {
    if (!packageName.trim()) return
    uninstallPackage(packageName)
  }

  // 处理清单安装
  const handleBatchInstall = () => {
    if (!requirementsFile) return
    installFromRequirements(batchInstallMode)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 space-y-6 overflow-y-auto rounded-lg border border-border bg-surface p-4">
        
        {/* 镜像源选择 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-content-primary">{t("dependency.mirrorSource")}</h3>
          <Select value={mirrorSource} onValueChange={(value) => setMirrorSource(value as MirrorSource)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mirrorSourceOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {mirrorSource === 'auto' && (
            <p className="text-xs text-content-secondary">
              {t('dependency.autoMirrorNote')}
            </p>
          )}
        </div>

        {/* 分隔线 */}
        <div className="border-t border-border"></div>

        {/* 核心安装 (PyTorch) */}
        <div className="space-y-3">
          <h3 className="font-semibold text-content-primary">{t("dependency.coreInstall")} (PyTorch)</h3>
          
          {/* CUDA 版本 - 标题、下拉选择器和查询按钮在同一行 */}
          <div className="flex items-center gap-3">
            <label className="w-12 whitespace-nowrap text-sm text-content-secondary">
              CUDA
            </label>
            <Select
              value={selectedCudaVersion}
              onValueChange={setSelectedCudaVersion}
              disabled={availableCudaVersions.length === 0 || isExecuting}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={t("common.placeholder.detecting")} />
              </SelectTrigger>
              <SelectContent>
                {availableCudaVersions.map((version) => (
                  <SelectItem key={version} value={version}>
                    {version === cudaVersion ? `${version} (${t('dependency.current')})` : version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={handleQueryPytorchVersions}
              disabled={!selectedCudaVersion || isExecuting}
              className="whitespace-nowrap"
            >
              {t('dependency.query')}
            </Button>
          </div>

          {/* PyTorch 版本 - 标题和选择器在同一行 */}
          <div className="flex items-center gap-3">
            <label className="w-12 whitespace-nowrap text-sm text-content-secondary">
              PyTorch
            </label>
            <Select
              value={selectedPytorchVersion}
              onValueChange={setSelectedPytorchVersion}
              disabled={pytorchVersions.length === 0 || isExecuting}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={t("common.placeholder.selectVersion")} />
              </SelectTrigger>
              <SelectContent>
                {pytorchVersions.map((version) => (
                  <SelectItem key={version} value={version}>
                    {version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            onClick={handleInstallPytorch}
            disabled={!selectedPytorchVersion || isExecuting}
          >
            {isExecuting ? t('dependency.installing') : t('dependency.installPytorch')}
          </Button>

          <p className="text-xs text-content-secondary">
            {t('dependency.autoInstallPytorchNote')}
          </p>
        </div>

        {/* 分隔线 */}
        <div className="border-t border-border"></div>

        {/* 手动安装 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-content-primary">{t("dependency.manualInstall")}</h3>
          
          {/* 包名 - 标题和输入框在同一行 */}
          <div className="flex items-center gap-3">
            <label className="w-12 whitespace-nowrap text-sm text-content-secondary">
              {t('dependency.packageName')}
            </label>
            <Input
              placeholder={t("common.placeholder.packageExample")}
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              disabled={isExecuting}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearchPackage()
                }
              }}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={handleSearchPackage}
              disabled={!packageName.trim() || isExecuting}
            >
              搜索
            </Button>
          </div>

          {/* 版本 - 标题和选择器在同一行 */}
          <div className="flex items-center gap-3">
            <label className="w-12 whitespace-nowrap text-sm text-content-secondary">
              版本
            </label>
            <Select
              value={selectedVersion}
              onValueChange={setSelectedVersion}
              disabled={packageVersions.length === 0 || isExecuting}
            >
              <SelectTrigger className="flex-1">
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

          {/* 操作 - 标题和选项卡在同一行 */}
          <div className="flex items-center gap-3">
            <label className="w-12 whitespace-nowrap text-sm text-content-secondary">
              {t('dependency.operation')}
            </label>
            <Tabs
              value={manualInstallMode}
              onValueChange={(value) => setManualInstallMode(value as 'dry-run' | 'install')}
              className="flex-1"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dry-run">{t('dependency.dryRunInstall')}</TabsTrigger>
                <TabsTrigger value="install">{t('dependency.actualInstall')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleManualInstall}
              disabled={!packageName.trim() || !selectedVersion || isExecuting}
            >
              {isExecuting ? t('dependency.executing') : manualInstallMode === InstallMode.DRY_RUN ? t('dependency.dryRunInstall') : t('dependency.install')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleUninstall}
              disabled={!packageName.trim() || isExecuting}
            >
              {t('dependency.uninstall')}
            </Button>
          </div>
        </div>

        {/* 分隔线 */}
        <div className="border-t border-border"></div>

        {/* 批量安装 */}
        <div className="space-y-3">
          <h3 className="font-semibold text-content-primary">{t("dependency.batchInstall")}</h3>
          
          {/* 文件选择 - 标题、输入框和按钮在同一行 */}
          <div className="flex items-center gap-3">
            <label className="w-12 whitespace-nowrap text-sm text-content-secondary">
              {t('dependency.file')}
            </label>
            <input
              type="text"
              readOnly
              value={requirementsFile ? requirementsFile.split(/[/\\]/).pop() : ''}
              placeholder={t('dependency.selectFile')}
              className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-content-primary outline-none"
            />
            <Button
              variant="outline"
              onClick={selectRequirementsFile}
              disabled={isExecuting}
            >
              {t('dependency.browse')}
            </Button>
          </div>

          {/* 操作 - 标题和选项卡在同一行，仅在 requirements.txt 时显示 */}
          {selectedFileType === 'requirements' && (
            <div className="flex items-center gap-3">
              <label className="w-12 whitespace-nowrap text-sm text-content-secondary">
                {t('dependency.operation')}
              </label>
              <Tabs
                value={batchInstallMode}
                onValueChange={(value) => setBatchInstallMode(value as 'dry-run' | 'install')}
                className="flex-1"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="dry-run">{t('dependency.dryRunInstall')}</TabsTrigger>
                  <TabsTrigger value="install">{t('dependency.actualInstall')}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleBatchInstall}
            disabled={!requirementsFile || isExecuting}
          >
            {isExecuting ? t('dependency.executing') : 
             selectedFileType === 'whl' ? t('dependency.installWhl') :
             batchInstallMode === 'dry-run' ? t('dependency.dryRunInstall') : t('dependency.batchInstall')}
          </Button>
          
          <p className="text-xs text-content-secondary">
            {t('dependency.supportRequirementsAndWhl')}
          </p>
        </div>
      </div>
    </div>
  )
}
