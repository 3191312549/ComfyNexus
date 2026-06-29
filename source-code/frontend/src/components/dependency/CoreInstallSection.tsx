/**
 * 核心安装组件 - PyTorch 快速部署
 * 
 * 功能：
 * - 自动检测 CUDA 版本
 * - 查询 PyTorch 可用版本
 * - 一键安装 PyTorch
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDependencyStore } from '@/stores/useDependencyStore'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'

export default function CoreInstallSection() {
  const { t } = useTranslation()
  const {
    cudaVersion,
    pytorchVersions,
    isExecuting,
    detectCudaVersion,
    fetchPytorchVersions,
    installPytorch,
  } = useDependencyStore()

  const [localSelectedVersion, setLocalSelectedVersion] = useState('')

  // 组件挂载时检测 CUDA 版本
  useEffect(() => {
    detectCudaVersion()
  }, [detectCudaVersion])

  // CUDA 版本检测完成后查询 PyTorch 版本
  useEffect(() => {
    if (cudaVersion) {
      fetchPytorchVersions(cudaVersion)
    }
  }, [cudaVersion, fetchPytorchVersions])

  // 处理版本选择
  const handleVersionChange = (version: string) => {
    setLocalSelectedVersion(version)
  }

  // 处理安装
  const handleInstall = () => {
    if (!localSelectedVersion) {
      return
    }
    installPytorch(localSelectedVersion, cudaVersion)
  }

  return (
    <div className="dark:border-dark-border dark:bg-dark-secondary border-gray-200 bg-white rounded-lg border p-4">
      <h3 className="dark:text-dark-text-primary text-gray-900 mb-4 font-semibold">{t("dependency.coreInstall")} (PyTorch)</h3>
      
      <div className="space-y-4">
        {/* CUDA 版本显示 */}
        <div>
          <label className="dark:text-dark-text-secondary text-gray-500 mb-2 block text-sm">
            CUDA 版本
          </label>
          <div className="dark:bg-dark-tertiary dark:text-dark-text-primary bg-gray-100 text-gray-900 rounded px-3 py-2 text-sm">
            {cudaVersion || '检测中...'}
          </div>
        </div>

        {/* PyTorch 版本选择 */}
        <div>
          <label className="dark:text-dark-text-secondary text-gray-500 mb-2 block text-sm">
            PyTorch 版本
          </label>
          <Select
            value={localSelectedVersion}
            onValueChange={handleVersionChange}
            disabled={pytorchVersions.length === 0 || isExecuting}
          >
            <SelectTrigger>
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

        {/* 安装按钮 */}
        <Button
          className="w-full"
          onClick={handleInstall}
          disabled={!localSelectedVersion || isExecuting}
        >
          {isExecuting ? '安装中...' : '安装 PyTorch'}
        </Button>

        {/* 提示信息 */}
        <p className="dark:text-dark-text-secondary text-gray-500 text-xs">
          将自动安装 PyTorch、torchvision 和 torchaudio
        </p>
      </div>
    </div>
  )
}
