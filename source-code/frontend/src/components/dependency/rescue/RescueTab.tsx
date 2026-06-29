/**
 * 救援模式主容器组件
 *
 * 左右分栏布局：左侧快照创建表单，右侧快照列表。
 * 组件挂载时加载快照列表，监听环境切换重新加载。
 */

import { useEffect } from 'react'
import { useRescueStore } from '@/stores/useRescueStore'
import { useEnvStore } from '@/stores/useEnvStore'
import { Button } from '@/components/ui/Button'
import SnapshotCreateForm from './SnapshotCreateForm'
import SnapshotList from './SnapshotList'

export default function RescueTab() {
  const fetchSnapshots = useRescueStore((s) => s.fetchSnapshots)
  const error = useRescueStore((s) => s.error)
  const clearError = useRescueStore((s) => s.clearError)
  const currentEnvId = useEnvStore((s) => s.currentEnvId)

  // 挂载时 & 环境切换时加载快照列表
  useEffect(() => {
    fetchSnapshots()
  }, [currentEnvId, fetchSnapshots])

  return (
    <div className="h-full overflow-auto p-4">
      {/* 错误提示 */}
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-danger/20 bg-danger/10 p-3">
          <span className="text-sm text-danger">{error}</span>
          <Button
            onClick={clearError}
            variant="ghost"
            size="sm"
            className="ml-2 text-danger/60 hover:text-danger"
          >
            ✕
          </Button>
        </div>
      )}

      {/* 左右分栏 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        <div>
          <SnapshotCreateForm />
        </div>
        <div>
          <SnapshotList />
        </div>
      </div>
    </div>
  )
}
