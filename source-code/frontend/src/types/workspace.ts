/**
 * 工作台模块类型定义
 */

/**
 * 工作台引导界面 Props
 */
export interface WorkspaceGuideProps {
  onStart: () => Promise<void>
  onStartAndOpenBrowser?: () => Promise<void>
  onOpenBrowser?: () => Promise<void>
  isStarting: boolean
  isPortAvailable?: boolean
  onStop?: () => Promise<void>
}

/**
 * 工作台 iframe 容器 Props
 */
export interface WorkspaceFrameProps {
  url: string
}

/**
 * 全屏按钮 Props
 */
export interface FullscreenButtonProps {
  isFullscreen: boolean
  onToggle: () => void
}

/**
 * 工作台 Store 接口
 */
export interface WorkspaceStore {
  isFullscreen: boolean
  setFullscreen: (isFullscreen: boolean) => void
  toggleFullscreen: () => void
}
