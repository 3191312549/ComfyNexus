/**
 * 插件管理相关类型定义
 */

/**
 * Git 错误类型
 */
export type ErrorType = 
  | 'remote'
  | 'branch'
  | 'commit'
  | 'permission'
  | 'network'
  | 'repository'
  | 'authentication'
  | 'conflict'
  | 'timeout'
  | 'unknown';

/**
 * 插件信息
 */
export interface PluginInfo {
  /** 插件名称 */
  name: string;
  /** 插件路径 */
  path: string;
  /** 是否为 Git 仓库 */
  is_git_repo: boolean;
  /** Git 仓库 URL */
  git_url: string | null;
  /** 当前分支 */
  branch: string | null;
  /** 默认分支 */
  default_branch: string | null;
  /** 当前提交哈希 */
  commit_hash: string | null;
  /** 提交日期 */
  commit_date: string | null;
  /** 是否有更新 */
  has_update: boolean;
  /** 落后的提交数 */
  behind_commits: number;
  /** 依赖是否已更新 */
  dependency_updated: boolean;
  /** 依赖是否已查看 */
  dependency_viewed: boolean;
  /** 安装日期（文件夹创建时间） */
  install_date: string | null;
  /** 是否启用（根据文件夹名是否有 .disabled 后缀判断） */
  enabled?: boolean;
  /** Git 信息获取错误（简短描述） */
  git_fetch_error?: string | null;
  /** Git 信息获取错误详情（完整日志） */
  git_fetch_error_detail?: string | null;
  /** Git 信息获取错误类型 */
  git_fetch_error_type?: ErrorType | null;
  /** Git 信息获取错误可能原因（JSON 字符串） */
  git_fetch_error_causes?: string | null;
  /** Git 信息获取错误解决方案（JSON 字符串） */
  git_fetch_error_solutions?: string | null;
  /** 插件来源: "primary" | 外置 model_path_config 的名称 */
  source?: string;
}

/**
 * 依赖信息
 */
export interface Dependency {
  /** 包名 */
  package: string;
  /** 版本要求 */
  version: string;
  /** 是否已安装 */
  installed: boolean;
  /** 已安装版本 */
  installed_version: string | null;
  /** 版本是否匹配 */
  version_match: boolean;
  /** 状态消息 */
  message: string;
  /** 环境标记 (如 "platform_machine == 'aarch64'") */
  environment_marker?: string;
  /** 环境标记是否匹配当前系统 */
  marker_match?: boolean;
  /** pip 安装选项 (如 ["--extra-index-url", "https://..."]) */
  pip_options?: string[];
}

/**
 * 提交信息
 */
export interface CommitInfo {
  /** 提交哈希 */
  hash: string;
  /** 提交消息 */
  message: string;
  /** 提交日期 */
  date: string;
}

/**
 * 分支信息
 */
export interface BranchInfo {
  /** 分支名称 */
  name: string;
  /** 是否为当前分支 */
  is_current: boolean;
  /** 是否为默认分支 */
  is_default: boolean;
  /** 提交哈希 */
  commit_hash?: string;
  /** 提交日期 */
  commit_date?: string;
}

/**
 * 更新结果
 */
export interface UpdateResult {
  /** 插件名称 */
  plugin_name: string;
  /** 是否成功 */
  success: boolean;
  /** 消息 */
  message: string;
  /** 依赖是否变更 */
  dependency_changed: boolean;
  /** 新增依赖列表 */
  new_dependencies?: Dependency[];
  /** 已安装依赖数 */
  dependencies_installed: number;
  /** 错误信息（如果失败） */
  error?: string;
  /** 更新后的插件信息（用于局部更新） */
  plugin?: PluginInfo;
}

/**
 * 批量更新摘要
 */
export interface UpdateSummary {
  /** 总数 */
  total: number;
  /** 成功数 */
  success: number;
  /** 失败数 */
  failed: number;
  /** 已安装依赖数 */
  dependencies_installed: number;
}

/**
 * 依赖冲突信息
 */
export interface DependencyConflict {
  /** 包名 */
  package: string;
  /** 要求的版本列表 */
  required_versions: string[];
  /** 涉及的插件列表 */
  plugins: string[];
  /** 严重程度 */
  severity: 'high' | 'medium' | 'low';
  /** 冲突消息 */
  message: string;
}

/**
 * API 响应基础接口
 */
export interface ApiResponse<T = any> {
  /** 是否成功 */
  success: boolean;
  /** 错误消息 */
  error?: string;
  /** 消息（用于成功或失败的提示） */
  message?: string;
  /** 响应数据 */
  data?: T;
}

/**
 * 插件列表响应
 */
export interface PluginsResponse extends ApiResponse {
  /** 插件列表 */
  plugins?: PluginInfo[];
  /** 是否来自缓存 */
  from_cache?: boolean;
  /** 是否后台正在更新 */
  background_updating?: boolean;
  /** 是否已更新 */
  updated?: boolean;
}

/**
 * 依赖列表响应
 */
export interface DependenciesResponse extends ApiResponse {
  /** 依赖列表 */
  dependencies?: Dependency[];
}

/**
 * 更新信息响应
 */
export interface UpdateInfoResponse extends ApiResponse {
  /** 提交列表 */
  commits?: CommitInfo[];
}

/**
 * 分支列表响应
 */
export interface BranchesResponse extends ApiResponse {
  /** 分支列表 */
  branches?: BranchInfo[];
}

/**
 * 批量更新响应
 */
export interface BatchUpdateResponse extends ApiResponse {
  /** 更新结果列表 */
  results?: UpdateResult[];
  /** 摘要统计 */
  summary?: UpdateSummary;
  /** 消息 */
  message?: string;
}

/**
 * 冲突检测响应
 */
export interface ConflictsResponse extends ApiResponse {
  /** 冲突列表 */
  conflicts?: DependencyConflict[];
}

/**
 * 通用操作响应
 */
export interface OperationResponse extends ApiResponse {
  /** 消息 */
  message?: string;
  /** 是否已安装 (用于依赖安装) */
  installed?: boolean;
  /** 已安装版本 (用于依赖安装) */
  installed_version?: string;
}

/**
 * 更新进度状态
 */
export type UpdateProgressStatus = 'waiting' | 'updating' | 'success' | 'failed';

/**
 * 单个插件的更新进度
 */
export interface UpdateProgress {
  /** 更新状态 */
  status: UpdateProgressStatus;
  /** 进度百分比 (0-100) */
  progress: number;
  /** 状态消息 */
  message: string;
  /** 已安装依赖数 */
  dependenciesInstalled: number;
}

/**
 * 插件更新响应
 */
export interface PluginUpdateResponse extends ApiResponse {
  /** 依赖是否变更 */
  dependency_changed?: boolean;
  /** 新增依赖列表 */
  new_dependencies?: Dependency[];
  /** 消息 */
  message?: string;
  /** 更新后的插件信息（用于局部更新） */
  plugin?: PluginInfo;
  /** 自动安装成功的依赖 */
  installed_deps?: { package: string; version: string; success: boolean }[];
  /** 自动安装失败的依赖 */
  failed_deps?: { package: string; version: string; success: boolean; error?: string }[];
}

/**
 * 依赖安装响应
 */
export interface DependencyInstallResponse extends ApiResponse {
  /** 是否已安装 */
  installed?: boolean;
  /** 已安装版本 */
  installed_version?: string;
  /** 消息 */
  message?: string;
  /** 日志文件路径 */
  log_file?: string;
}

/**
 * 插件操作响应（启用/禁用、切换分支等）
 */
export interface PluginOperationResponse extends ApiResponse {
  /** 消息 */
  message?: string;
  /** 更新后的插件信息（用于局部更新） */
  plugin?: PluginInfo;
  /** 插件是否被移除（用于卸载操作） */
  removed?: boolean;
  /** 插件名称（用于定位） */
  plugin_name?: string;
}

/**
 * 问题仓库信息
 */
export interface ProblemRepository {
  /** 插件名称 */
  name: string;
  /** 仓库路径 */
  path: string;
  /** 错误信息 */
  error: string;
}

/**
 * Git 权限检查响应
 */
export interface GitPermissionCheckResponse extends ApiResponse {
  /** 总仓库数 */
  total?: number;
  /** 问题仓库数 */
  problem_count?: number;
  /** 问题仓库列表 */
  problem_repos?: ProblemRepository[];
  /** Git 版本 */
  git_version?: string;
  /** 是否支持 safe.directory 功能 */
  is_supported?: boolean;
}

/**
 * Git 权限修复响应
 */
export interface GitPermissionFixResponse extends ApiResponse {
  /** 总仓库数 */
  total?: number;
  /** 成功修复数 */
  fixed?: number;
  /** 失败数 */
  failed?: number;
  /** 失败仓库列表 */
  failed_repos?: ProblemRepository[];
  /** 总耗时（秒） */
  duration?: number;
}

// 为了向后兼容，导出别名
export type Plugin = PluginInfo;
export type Commit = CommitInfo;
export type Branch = BranchInfo;
export type Conflict = DependencyConflict;

// 导出响应类型别名
export type BaseResponse = ApiResponse;
export type PluginListResponse = PluginsResponse;
export type DependencyResponse = DependenciesResponse;
export type InstallResponse = DependencyInstallResponse;
export type UpdateResponse = PluginUpdateResponse;
export type BranchResponse = BranchesResponse;
export type ConflictResponse = ConflictsResponse;
