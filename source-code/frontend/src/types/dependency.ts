/**
 * 依赖管理模块的 TypeScript 类型定义
 * 
 * 该文件定义了依赖管理功能所需的所有数据类型、接口和枚举
 */

// ==================== 枚举类型 ====================

/**
 * 依赖包安装状态枚举
 */
export enum DependencyStatus {
  /** 未安装 */
  NOT_INSTALLED = 'not_installed',
  /** 已安装 */
  INSTALLED = 'installed',
  /** 版本不匹配 */
  VERSION_MISMATCH = 'version_mismatch',
  /** 未知状态 */
  UNKNOWN = 'unknown'
}

/**
 * 操作类型枚举
 */
export enum OperationType {
  /** 安装单个包 */
  INSTALL_SINGLE = 'install_single',
  /** 卸载单个包 */
  UNINSTALL_SINGLE = 'uninstall_single',
  /** 批量安装 */
  INSTALL_BATCH = 'install_batch',
  /** 扫描依赖 */
  SCAN = 'scan',
  /** 检查状态 */
  CHECK_STATUS = 'check_status'
}

/**
 * 操作状态枚举
 */
export enum OperationStatus {
  /** 等待中 */
  PENDING = 'pending',
  /** 运行中 */
  RUNNING = 'running',
  /** 成功 */
  SUCCESS = 'success',
  /** 失败 */
  FAILED = 'failed',
  /** 已取消 */
  CANCELLED = 'cancelled'
}

/**
 * 错误类型枚举
 */
export enum ErrorType {
  /** 网络错误 */
  NETWORK_ERROR = 'network_error',
  /** 权限错误 */
  PERMISSION_ERROR = 'permission_error',
  /** 版本冲突 */
  VERSION_CONFLICT = 'version_conflict',
  /** 文件系统错误 */
  FILE_SYSTEM_ERROR = 'file_system_error',
  /** pip 命令错误 */
  PIP_ERROR = 'pip_error',
  /** 环境错误 */
  ENVIRONMENT_ERROR = 'environment_error',
  /** 解析错误 */
  PARSE_ERROR = 'parse_error',
  /** 未知错误 */
  UNKNOWN_ERROR = 'unknown_error'
}

// ==================== 核心接口 ====================

/**
 * 依赖包接口
 * 表示一个 Python 依赖包的完整信息
 */
export interface Dependency {
  /** 唯一标识 (package_name + source) */
  id: string;
  /** 包名 */
  packageName: string;
  /** 版本约束 (e.g., ">=1.0.0", "==2.1.0") */
  versionSpec: string;
  /** 来源 ("core" 或插件名) */
  source: string;
  /** requirements.txt 文件路径 */
  sourceFile: string;
  /** 是否已安装 */
  installed: boolean;
  /** 已安装版本 */
  installedVersion: string | null;
  /** 版本是否匹配 */
  versionMatch: boolean;
  /** 状态枚举 */
  status: DependencyStatus;
}

/**
 * 插件接口
 * 表示一个 ComfyUI 插件的信息
 */
export interface Plugin {
  /** 插件名称 */
  name: string;
  /** 插件目录路径 */
  path: string;
  /** 是否有 requirements.txt */
  hasRequirements: boolean;
  /** 依赖数量 */
  dependencyCount: number;
  /** 依赖列表 */
  dependencies: Dependency[];
}

/**
 * 操作结果接口
 */
export interface OperationResult {
  /** 是否成功 */
  success: boolean;
  /** 结果消息 */
  message: string;
  /** 详细信息 */
  details?: any;
}

/**
 * 操作接口
 * 表示一个正在进行或已完成的操作
 */
export interface Operation {
  /** 操作 ID */
  id: string;
  /** 操作类型 */
  type: OperationType;
  /** 操作状态 */
  status: OperationStatus;
  /** 操作目标 (包名或插件名) */
  target: string;
  /** 进度 (0-100) */
  progress: number;
  /** 当前消息 */
  message: string;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime: number | null;
  /** 操作结果 */
  result: OperationResult | null;
}

/**
 * Python 环境信息接口
 */
export interface EnvironmentInfo {
  /** Python 解释器路径 */
  pythonPath: string;
  /** Python 版本 */
  pythonVersion: string;
  /** pip 版本 */
  pipVersion: string;
  /** 是否虚拟环境 */
  isVenv: boolean;
  /** 虚拟环境路径 */
  venvPath: string | null;
}

/**
 * 安装详情接口
 */
export interface InstallationDetail {
  /** 包名 */
  package: string;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error: string | null;
  /** pip 输出 */
  output: string;
}

/**
 * 安装报告接口
 * 批量安装操作的结果摘要
 */
export interface InstallationReport {
  /** 总数 */
  total: number;
  /** 成功数 */
  succeeded: number;
  /** 失败数 */
  failed: number;
  /** 跳过数 */
  skipped: number;
  /** 详细信息列表 */
  details: InstallationDetail[];
}

/**
 * 错误信息接口
 */
export interface ErrorInfo {
  /** 错误类型 */
  type: ErrorType;
  /** 错误消息 */
  message: string;
  /** 详细信息 */
  details?: string;
  /** 是否可恢复 */
  recoverable: boolean;
  /** 建议操作 */
  suggestions?: string[];
}

// ==================== API 响应接口 ====================

/**
 * 通用 API 响应接口
 */
export interface ApiResponse<T = any> {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data: T | null;
  /** 错误信息 */
  error: ErrorInfo | null;
}

/**
 * 扫描依赖响应数据
 */
export interface ScanDependenciesData {
  /** 核心依赖列表 */
  core: Dependency[];
  /** 插件依赖映射 */
  plugins: Record<string, Dependency[]>;
}

/**
 * 包状态响应数据
 */
export interface PackageStatusData {
  /** 是否已安装 */
  installed: boolean;
  /** 版本号 */
  version: string | null;
  /** 安装位置 */
  location: string | null;
}

/**
 * 批量状态响应数据
 */
export interface BatchStatusData {
  /** 包名到状态的映射 */
  [packageName: string]: {
    installed: boolean;
    version: string | null;
  };
}

/**
 * 安装包响应数据
 */
export interface InstallPackageData {
  /** 包名 */
  package: string;
  /** 已安装版本 */
  installedVersion: string;
  /** pip 输出 */
  output: string;
}

/**
 * 卸载包响应数据
 */
export interface UninstallPackageData {
  /** 包名 */
  package: string;
  /** pip 输出 */
  output: string;
}

/**
 * 插件信息
 */
export interface PluginInfo {
  /** 插件名称 */
  name: string;
  /** 插件路径 */
  path: string;
  /** 是否有 requirements.txt */
  hasRequirements: boolean;
  /** 依赖数量 */
  dependencyCount: number;
}

// ==================== 新增类型定义 ====================

/**
 * 镜像源类型
 */
export type MirrorSource = 'auto' | 'official' | 'tuna' | 'bfsu' | 'aliyun' | 'tencent';

/**
 * 安装模式枚举
 */
export enum InstallMode {
  /** 标准安装 */
  STANDARD = 'install',
  /** 强制重装 */
  FORCE_REINSTALL = 'force_reinstall',
  /** 仅下载 */
  DOWNLOAD_ONLY = 'download_only',
  /** 离线安装 */
  OFFLINE = 'offline',
  /** 试运行 */
  DRY_RUN = 'dry-run'
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  /** 日志 ID */
  id: string;
  /** 时间戳 */
  timestamp: number;
  /** 日志级别 */
  level: 'info' | 'warning' | 'error' | 'success';
  /** 日志消息 */
  message: string;
  /** 日志来源 */
  source?: string;
  /** 详细信息 */
  details?: string;
}

/**
 * GPU 信息接口
 */
export interface GPUInfo {
  /** GPU 型号 */
  model: string;
  /** 显存大小 */
  vram: string;
  /** 驱动版本 */
  driver?: string;
}

/**
 * CPU 信息接口
 */
export interface CPUInfo {
  /** CPU 型号 */
  model: string;
  /** 内存大小 */
  ram: string;
  /** 核心数 */
  cores?: number;
}

/**
 * Python 详细信息接口
 */
export interface PythonInfo {
  /** Python 版本 */
  version: string;
  /** Python 路径 */
  path: string;
  /** 是否虚拟环境 */
  isVenv?: boolean;
}

/**
 * CUDA 信息接口
 */
export interface CUDAInfo {
  /** CUDA 版本 */
  version: string;
  /** 是否可用 */
  available?: boolean;
}

/**
 * 依赖版本信息接口
 */
export interface DependencyVersions {
  /** PyTorch 版本 */
  pytorch: string;
  /** Transformers 版本 */
  transformer: string;
  /** 其他依赖 */
  [key: string]: string;
}

/**
 * 扩展的环境信息接口（包含硬件和系统信息）
 */
export interface ExtendedEnvironmentInfo extends EnvironmentInfo {
  /** Windows 版本 */
  windowsVersion?: string;
  /** GPU 信息 */
  gpu?: GPUInfo;
  /** CPU 信息 */
  cpu?: CPUInfo;
  /** Python 详细信息 */
  python?: PythonInfo;
  /** CUDA 信息 */
  cuda?: CUDAInfo;
  /** 依赖版本信息 */
  dependencies?: DependencyVersions;
}

// ==================== API 响应类型 ====================

/**
 * CUDA 版本响应
 */
export interface CudaVersionResponse {
  /** 是否成功 */
  success: boolean;
  /** CUDA 版本 */
  cuda_version: string | null;
  /** 可用版本列表 */
  available_versions?: string[];
  /** 错误信息 */
  error?: string;
  /** 错误消息 */
  error_message?: string;
}

/**
 * PyTorch 版本响应
 */
export interface PytorchVersionsResponse {
  /** 是否成功 */
  success: boolean;
  /** 可用版本列表 */
  versions: string[];
  /** 推荐版本 */
  recommended?: string;
  /** 错误信息 */
  error?: string;
  /** 错误消息 */
  error_message?: string;
}

/**
 * 包搜索响应
 */
export interface PackageSearchResponse {
  /** 是否成功 */
  success: boolean;
  /** 搜索结果 (可选) */
  packages?: Array<{
    name: string;
    version: string;
    description: string;
  }>;
  /** 包信息 (后端使用) */
  package_info?: {
    name: string;
    latest_version: string;
    description: string;
    author: string;
    homepage: string;
  };
  /** 错误信息 */
  error?: string;
  /** 错误消息 (后端使用) */
  error_message?: string;
}

/**
 * 包版本响应
 */
export interface PackageVersionsResponse {
  /** 是否成功 */
  success: boolean;
  /** 包名 (可选) */
  package?: string;
  /** 可用版本列表 */
  versions: string[];
  /** 最新版本 */
  latest?: string;
  /** 错误信息 */
  error?: string;
  /** 错误消息 (后端使用) */
  error_message?: string;
}

/**
 * 已安装版本响应
 */
export interface InstalledVersionResponse {
  /** 是否成功 */
  success: boolean;
  /** 包名 (可选) */
  package?: string;
  /** 是否已安装 */
  installed?: boolean;
  /** 已安装版本 */
  version: string | null;
  /** 安装位置 */
  location?: string;
  /** 错误信息 */
  error?: string;
  /** 错误消息 (后端使用) */
  error_message?: string;
}

/**
 * 安装响应
 */
export interface InstallResponse {
  /** 是否成功 */
  success: boolean;
  /** 包名 (可选) */
  package?: string;
  /** 已安装版本 (可选) */
  installed_version?: string;
  /** 输出日志 (可选) */
  output?: string;
  /** 日志文件路径 (可选) */
  log_file?: string;
  /** 错误信息 */
  error?: string;
  /** 错误消息 (后端使用) */
  error_message?: string;
}

/**
 * 环境检测响应
 */
export interface EnvironmentDetectionResponse {
  /** 是否成功 */
  success: boolean;
  /** 环境信息 */
  env_info?: {
    // 基础字段（后端可能直接返回）
    python_path?: string;
    python_version?: string;
    pip_version?: string;
    is_venv?: boolean;
    venv_path?: string | null;
    // 扩展字段
    windows_version?: string;
    gpu?: {
      model: string;
      vram: string;
      driver?: string;
    };
    cpu?: {
      model: string;
      ram: string;
      cores?: number;
    };
    // Python 信息（嵌套对象）
    python?: {
      version: string;
      path: string;
    };
    cuda?: {
      version: string;
      available?: boolean;
    };
    dependencies?: {
      pytorch: string;
      transformer: string;
      [key: string]: string;
    };
  };
  /** 错误信息 */
  error?: string;
  /** 错误消息 (后端使用) */
  error_message?: string;
}

/**
 * 打开终端响应
 */
export interface OpenTerminalResponse {
  /** 是否成功 */
  success: boolean;
  /** 消息 (可选) */
  message?: string;
  /** 错误信息 */
  error?: string;
  /** 错误消息 (后端使用) */
  error_message?: string;
}

/**
 * 文件选择响应
 */
export interface FileSelectResponse {
  /** 是否成功 */
  success: boolean;
  /** 选择的文件路径 */
  file_path?: string | null;
  /** 文件类型 */
  file_type?: 'requirements' | 'whl';
  /** 错误信息 */
  error?: string;
  /** 错误消息 (后端使用) */
  error_message?: string;
}

// ==================== 依赖冲突分析类型定义 ====================

/**
 * 依赖节点接口
 * 表示依赖树中的一个包节点，包含包的基本信息和依赖关系
 */
export interface DependencyNode {
  /** 节点唯一标识 */
  id: string;
  
  /** 包名 */
  packageName: string;
  
  /** 已安装版本 */
  installedVersion: string;
  
  /** 要求的版本范围（如果是子依赖） */
  requiredVersion?: string;
  
  /** 子依赖列表 */
  dependencies: DependencyNode[];
  
  /** 是否存在冲突 */
  hasConflict: boolean;
  
  /** 冲突类型 */
  conflictType?: 'version' | 'circular' | 'missing';
  
  /** 节点深度（从 0 开始） */
  depth: number;
  
  /** 父节点 ID */
  parentId?: string;
}

/**
 * 冲突信息接口
 * 表示依赖树中检测到的冲突详情
 */
export interface ConflictInfo {
  /** 冲突唯一标识 */
  id: string;
  
  /** 冲突类型 */
  type: 'version_mismatch' | 'circular_dependency' | 'missing_dependency';
  
  /** 严重程度 */
  severity: 'critical' | 'warning' | 'info';
  
  /** 涉及的包名 */
  packageName: string;
  
  /** 已安装版本 */
  installedVersion: string;
  
  /** 要求的版本 */
  requiredVersion: string;
  
  /** 冲突来源（哪个包依赖了它） */
  source: string;
  
  /** 冲突描述 */
  description: string;
  
  /** 解决建议 */
  suggestion: string;
  
  /** 相关节点 ID 列表 */
  relatedNodeIds: string[];
}

/**
 * 分析结果接口
 * 包含完整的依赖树分析结果
 */
export interface AnalysisResult {
  /** 依赖树 */
  tree: DependencyNode[];
  
  /** 冲突列表 */
  conflicts: ConflictInfo[];
  
  /** 统计信息 */
  stats: {
    /** 总包数 */
    totalPackages: number;
    
    /** 冲突总数 */
    totalConflicts: number;
    
    /** 最大深度 */
    maxDepth: number;
    
    /** 版本冲突数 */
    versionConflicts: number;
    
    /** 循环依赖数 */
    circularDependencies: number;
  };
  
  /** 分析时间戳 */
  timestamp: string;
}

/**
 * 依赖分析 API 响应接口
 */
export interface AnalyzeDependenciesResponse {
  /** 是否成功 */
  success: boolean;
  
  /** 分析结果数据 */
  data?: AnalysisResult;
  
  /** 错误信息 */
  error_message?: string;
}

/**
 * pipdeptree 检查响应接口
 */
export interface CheckPipDepTreeResponse {
  /** 是否成功 */
  success: boolean;
  
  /** 是否已安装 */
  installed: boolean;
  
  /** pipdeptree 版本 */
  version?: string;
  
  /** 错误信息 */
  error_message?: string;
}

/**
 * pipdeptree 安装响应接口
 */
export interface InstallPipDepTreeResponse {
  /** 是否成功 */
  success: boolean;
  
  /** 消息 */
  message: string;
  
  /** 错误信息 */
  error_message?: string;
}

/**
 * 导出报告响应接口
 */
export interface ExportAnalysisReportResponse {
  /** 是否成功 */
  success: boolean;
  
  /** 导出的文件路径 */
  file_path?: string;
  
  /** 导出的内容 */
  content?: string;
  
  /** 错误信息 */
  error_message?: string;
}
