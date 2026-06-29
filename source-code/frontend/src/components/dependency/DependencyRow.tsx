/**
 * 依赖行组件
 * 
 * 显示单个依赖的详细信息和操作按钮
 * 返回5个独立的 grid 子元素，与表头共享同一个 grid 容器
 */

import { CheckCircle2, XCircle, AlertCircle, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { Dependency } from '@/types/dependency'

interface DependencyRowProps {
  dependency: Dependency
  onInstall: (dependency: Dependency) => void
  onUninstall: (dependency: Dependency) => void
}

export default function DependencyRow({
  dependency,
  onInstall,
  onUninstall
}: DependencyRowProps) {
  // 获取状态显示配置
  const getStatusConfig = () => {
    switch (dependency.status) {
      case 'installed':
        return {
          icon: <CheckCircle2 className="size-4" />,
          text: '已安装',
          color: 'text-success',
          bgColor: 'bg-success/10'
        }
      case 'not_installed':
        return {
          icon: <XCircle className="size-4" />,
          text: '未安装',
          color: 'text-content-secondary',
          bgColor: 'bg-muted'
        }
      case 'version_mismatch':
        return {
          icon: <AlertCircle className="size-4" />,
          text: '版本不匹配',
          color: 'text-warning',
          bgColor: 'bg-warning/10'
        }
      case 'unknown':
      default:
        return {
          icon: <HelpCircle className="size-4" />,
          text: '未知',
          color: 'text-content-muted',
          bgColor: 'bg-muted'
        }
    }
  }

  const statusConfig = getStatusConfig()
  const rowClass = 'px-4 py-3 border-b border-border transition-colors hover:bg-muted/50';

  return (
    <>
      {/* 来源 */}
      <div className={rowClass}>
        <Badge variant="outline" className="font-normal">
          {dependency.source === 'core' ? 'ComfyUI 核心' : dependency.source}
        </Badge>
      </div>

      {/* 包名 */}
      <div className={rowClass}>
        <div className="font-mono text-sm text-content-primary">{dependency.packageName}</div>
      </div>

      {/* 版本 */}
      <div className={rowClass}>
        <div className="space-y-1">
          {dependency.versionSpec && (
            <div className="text-sm text-content-secondary">
              要求: {dependency.versionSpec}
            </div>
          )}
          {dependency.installedVersion && (
            <div className={cn(
              'text-sm',
              dependency.versionMatch 
                ? 'text-success' 
                : 'text-warning'
            )}>
              已安装: {dependency.installedVersion}
            </div>
          )}
        </div>
      </div>

      {/* 安装状态 */}
      <div className={rowClass}>
        <div className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm',
          statusConfig.color,
          statusConfig.bgColor
        )}>
          {statusConfig.icon}
          <span>{statusConfig.text}</span>
        </div>
      </div>

      {/* 操作 */}
      <div className={rowClass}>
        <div className="flex items-center gap-2">
          {dependency.installed ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUninstall(dependency)}
              className="text-danger hover:bg-danger/10 hover:text-danger"
            >
              卸载
            </Button>
          ) : (
            <Button
              size="sm"
              variant="default"
              onClick={() => onInstall(dependency)}
            >
              安装
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
