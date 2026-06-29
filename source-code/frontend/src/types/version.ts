/**
 * 版本管理相关类型定义
 */

// 版本信息类型
export interface VersionInfo {
  id: string              // Commit hash（前7位）
  tag?: string            // 版本号（仅稳定版）
  timestamp: string       // 更新时间戳
  message: string         // Commit message
  type: 'stable' | 'dev'  // 版本类型
  author?: string         // 作者
  fullHash?: string       // 完整 hash
  releaseNotesHtml?: string  // Release 更新日志（HTML 格式）
  releaseName?: string       // Release 名称
  releaseUrl?: string        // GitHub Release 链接
  publishedAt?: string       // Release 发布时间
}

// 远端信息类型
export interface RemoteInfo {
  branch: string          // 当前分支
  url: string             // 远端地址
  history: string[]       // 历史记录
}

// 版本切换结果类型
export interface SwitchResult {
  success: boolean
  needDependencyUpdate: boolean
  message: string
  originalCommit?: string  // 原始 commit hash（用于回退）
  requiresForce?: boolean  // 是否需要强制切换（本地有修改）
  stashed?: boolean        // 是否已暂存本地文件到 stash
}

// 依赖更新结果类型
export interface DependencyUpdateResult {
  success: boolean
  message: string
  logFile?: string
}

// 进程状态类型
export interface ProcessStatus {
  isRunning: boolean
  hasTask: boolean
}

// 版本列表响应类型
export interface VersionListResponse {
  versions: VersionInfo[]
  hasMore: boolean
  errorType?: 'ownership' | 'network' | 'branch_not_found' | 'no_tags' | 'no_commits' | 'no_environment' | 'unknown'
  error?: string
  repoPath?: string
  branch?: string
  fromCache?: boolean
  cacheAge?: number
  isUpdating?: boolean
  totalCached?: number
  newItemsCount?: number
  needBackgroundUpdate?: boolean
}

// 分页参数类型
export interface PaginationParams {
  page: number
  pageSize: number
}

// 版本切换参数类型
export interface SwitchVersionParams {
  versionId: string
  type: 'stable' | 'dev'
  force?: boolean  // 是否强制切换（忽略本地修改）
}

// 分支信息类型
export interface BranchInfo {
  name: string            // 分支名称
  isCurrent: boolean      // 是否为当前分支
  isLocal: boolean        // 是否为本地分支
  isRemote: boolean       // 是否为远程分支
}

// 分支数据类型
export interface BranchesData {
  currentBranch: string
  localBranches: string[]
  remoteBranches: string[]
}

// 切换分支结果类型
export interface SwitchBranchResult {
  success: boolean
  message: string
}

// ============ 版本切换卡片相关类型 ============

/** 切换步骤 */
export type SwitchStep = 
  | 'idle'              // 初始状态
  | 'git'               // Git 切换中
  | 'dependency-check'  // 依赖检测中
  | 'dependency-install'// 依赖安装中
  | 'restart'           // 进程重启中
  | 'complete';         // 完成

/** 步骤状态 */
export interface StepStatus {
  /** 状态 */
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  /** 消息 */
  message: string;
}

/** 切换进度 */
export interface SwitchProgress {
  /** 当前步骤 */
  currentStep: SwitchStep;
  /** 各步骤状态 */
  steps: {
    git: StepStatus;
    dependencyCheck: StepStatus;
    dependencyInstall: StepStatus;
    restart: StepStatus;
  };
  /** 最终结果 */
  success: boolean | null;
  message: string;
  /** 日志文件路径 */
  logFile?: string;
  /** 是否需要强制切换（本地有修改） */
  requiresForce?: boolean;
  /** 是否已暂存本地文件到 stash */
  stashed?: boolean;
}
