/**
 * 运行环境选项卡组件
 * 
 * 三栏式布局：
 * - 左侧：功能控制面板（固定宽度 350px）
 * - 中间：日志显示面板（自适应）
 * - 右侧：环境状态面板（固定宽度 350px）
 */

import LeftControlPanel from './LeftControlPanel'
import MiddleLogPanel from './MiddleLogPanel'
import RightStatusPanel from './RightStatusPanel'

export default function RuntimeEnvTab() {
  return (
    <div className="flex h-full gap-4 bg-background p-6">
      {/* 左侧：功能控制面板 */}
      <div className="flex w-[350px] shrink-0 flex-col">
        <LeftControlPanel />
      </div>

      {/* 中间：日志显示面板 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <MiddleLogPanel />
      </div>

      {/* 右侧：环境状态面板 */}
      <div className="flex w-[350px] shrink-0 flex-col">
        <RightStatusPanel />
      </div>
    </div>
  )
}
