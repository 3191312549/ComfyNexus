/**
 * 环境设置相关类型定义
 */

// 后端API响应类型
export interface Environment {
  id: string
  name: string
  alias: string
  path: string
  isActive: boolean
}

export interface EnvironmentListResponse {
  success: boolean
  environments: EnvironmentConfig[]
  current_environment_id: string | null
  error_code?: number
  error_message?: string
}

export interface EnvironmentResponse {
  success: boolean
  environment?: EnvironmentConfig
  error_code?: number
  error_message?: string
}

export interface EnvironmentScanResult {
  success: boolean
  scan_result?: {
    is_valid: boolean
    python_version: string
    comfyui_version: string
    python_directory: string | null
    pip_directory: string | null
    available_gpus: string[]
    error_message?: string
    dependencies: Record<string, string>
  }
  error_code?: number
  error_message?: string
}

export interface DependenciesResponse {
  success: boolean
  dependencies?: {
    pythonVersion: string
    pytorchVersion: string
    cudaVersion: string
    sageAttentionVersion: string
    flashAttnVersion: string
    tritonVersion: string
    xformersVersion: string
  }
  error_code?: number
  error_message?: string
}

export interface DirectorySelectResponse {
  success: boolean
  path?: string
  error_code?: number
  error_message?: string
}

export interface ConfigExportResponse {
  success: boolean
  config?: string
  error_code?: number
  error_message?: string
}

export interface ConfigImportResponse {
  success: boolean
  error_code?: number
  error_message?: string
}

export interface EnvironmentInfo {
  id: string
  name: string
  alias: string
  path: string
}

export interface DependencyInfo {
  pythonVersion: string
  pytorchVersion: string
  cudaVersion: string
  sageAttentionVersion: string
  flashAttnVersion: string
  tritonVersion: string
  xformersVersion: string
}

export interface AddEnvironmentRequest {
  path: string
  name?: string
}

// 计算设备接口
export interface ComputeDevice {
  index: number
  name: string
  type: 'nvidia' | 'amd' | 'intel-arc' | 'intel' | 'unknown'
  driver: string
  compatible?: boolean
  incompatibilityReason?: string
}

export interface ComputeDevicesResponse {
  success: boolean
  devices?: ComputeDevice[]
  error_code?: number
  error_message?: string
}

// PyTorch 后端信息接口
export interface PyTorchBackend {
  backend: 'cuda' | 'rocm' | 'xpu' | 'cuda_with_ipex' | 'none' | 'unknown'
  torchVersion: string
  cudaAvailable: boolean
  xpuAvailable: boolean
  ipexInstalled: boolean
  error: string | null
}

export interface PyTorchBackendResponse {
  success: boolean
  pytorchBackend?: PyTorchBackend
  error_code?: number
  error_message?: string
}

export function getPytorchBackendLabel(backend: PyTorchBackend['backend']): string {
  const labels: Record<string, string> = {
    cuda: 'CUDA',
    rocm: 'ROCm',
    xpu: 'XPU',
    cuda_with_ipex: 'CUDA + IPEX',
    none: '-',
    unknown: '-',
  }
  return labels[backend] || backend
}

export interface FilteredComputeDevicesResponse {
  success: boolean
  devices?: ComputeDevice[]
  pytorchBackend?: PyTorchBackend | null
  error_code?: number
  error_message?: string
}

// 模型路径配置接口
export interface ModelPathConfig {
  name: string
  basePath: string
  isDefault?: boolean
  paths: {
    checkpoints?: string
    clip?: string
    clipVision?: string
    configs?: string
    controlnet?: string
    diffusionModels?: string
    embeddings?: string
    loras?: string
    upscaleModels?: string
    vae?: string
    gligen?: string
    hypernetworks?: string
    customNodes?: string
    styleModels?: string
    diffusers?: string
    vaeApprox?: string
    t2iAdapter?: string
    latentUpscaleModels?: string
    photomaker?: string
    classifiers?: string
    modelPatches?: string
    audioEncoders?: string
    frameInterpolation?: string
    [key: string]: string | undefined
  }
}

// 环境配置接口
export interface EnvironmentConfig {
  id: string                    // 环境唯一标识
  name: string                  // 环境名称
  alias: string                 // 环境别名（用于顶部导航栏显示）
  version: string               // ComfyUI 版本号（独立字段，不可修改）
  isActive: boolean             // 是否为当前激活环境
  envType?: 'portable' | 'desktop' | 'unknown'  // 环境类型：便携版、桌面版、未知
  desktopDataPath?: string      // 桌面版数据目录（仅桌面版有效）
  
  // 版本详细信息
  versionInfo?: {
    commitHash?: string         // 核心版本:稳定版显示tag,开发版显示短hash(前7位)
    isDev?: boolean             // 是否为dev标签
    lastUpdated?: string        // 版本更新时间戳(ISO格式)
  }
  
  // 通用配置
  general: {
    comfyuiPath: string         // ComfyUI目录
    pythonPath: string          // Python目录
    pipPath: string             // pip目录（自动计算）
    gitPath?: string            // Git目录
    // gpuSelection: string[]   // 已删除
  }
  
  // 依赖信息（只读）
  dependencies: {
    pythonVersion: string       // Python版本
    pytorchVersion: string      // PyTorch版本
    cudaVersion: string         // CUDA版本
    sageAttentionVersion: string // SageAttention版本
    flashAttnVersion: string    // flash_attn版本
    tritonVersion: string       // Triton版本
    xformersVersion: string     // xFormers版本
  }
  
  // 加速配置
  acceleration: {
    // 计算设备
    computeDevice: string       // "" | "nvidia:0" | "amd:0" | "intel:0" | "intel-arc:0" | "cpu"
    
    // 极客模式配置
    geekMode?: GeekMode
    
    // 显存策略
    vramStrategy: 'auto' | 'normal' | 'low' | 'high' | 'no'
    cpuOnly: boolean
    gpuOnly: boolean
    reserveVram: number
    // directML: boolean        // 已删除
    // cudaDevice: number       // 已删除
    
    // 模型精度
    unetPrecision: 'auto' | 'fp16' | 'bf16' | 'fp8_e4m3fn' | 'fp8_e5m2' | 'fp32'
    vaePrecision: 'auto' | 'fp32' | 'fp16' | 'bf16' | 'cpu'
    textEncPrecision: 'auto' | 'fp8_e4m3fn' | 'fp8_e5m2' | 'fp16' | 'fp32' | 'bf16'
    
    // 性能优化
    attentionMode: 'auto' | 'flash' | 'sage' | 'split' | 'pytorch' | 'quad'
    disableXformers: boolean
    disableSmartMemory: boolean
    forceChannelsLast: boolean
    cacheLru: number  // 新增：LRU 缓存大小，0 表示禁用
    deterministic: boolean  // 新增：确定性模式
    fastMode: boolean  // 新增：激进加速模式
    cudaMalloc: 'auto' | 'enable' | 'disable'  // CUDA 内存分配策略
    
    // 网络与服务
    listenNetwork: boolean
    listenAddress: string  // 监听地址，空字符串表示默认 0.0.0.0,::
    port: number
    enableCors: boolean
    tlsKeyfile: string
    tlsCertfile: string
    
    // 路径配置
    baseDirectory: string
    inputDirectory: string
    outputDirectory: string
    tempDirectory: string
    userDirectory: string
    extraModelPathsConfig: string
    
    // 辅助功能
    previewMethod: 'auto' | 'taesd' | 'latent2rgb' | 'none'
    previewSize: number  // 新增：预览大小（像素）
    safeMode: boolean
    enableManager: boolean
    logLevel: 'DEBUG' | 'INFO'
    disableMetadata: boolean  // 新增：禁用元数据保存
  }
  
  // 模型路径配置
  modelPathConfigs?: ModelPathConfig[]
  
  // 高级环境变量配置（多行文本）
  advancedEnvVars?: string
  
  createdAt: string             // 创建时间
  updatedAt: string             // 更新时间
}

// 极客模式接口
export interface GeekMode {
  enabled: boolean              // 是否启用极客模式
  customArgs?: string           // 自定义启动参数（多行文本）
  currentPresetId?: string      // 当前激活的极客预设ID
}

// 极客模式配置保存接口
export interface GeekModeSaveConfig {
  geekMode: {
    enabled: boolean
    customArgs: string
    currentPresetId: string
  }
}

// 极客模式预设接口
export interface GeekPreset {
  id: string                    // 预设ID
  name: string                  // 预设名称
  description: string           // 预设描述
  args: string                  // 启动参数（多行文本）
  createdAt: string             // 创建时间
  updatedAt: string             // 更新时间
}

// 预设方案接口
export interface PresetConfig {
  id: string
  name: string
  description: string
  vramRequirement: string       // 显存要求
  isDefault?: boolean           // 是否为默认方案
  type?: 'builtin' | 'custom'   // 预设类型：内置或自定义
  createdAt?: string            // 创建时间（仅自定义预设）
  config: Partial<EnvironmentConfig['acceleration']>
}

// 环境Store接口
export interface EnvStore {
  // 状态
  environments: EnvironmentConfig[]
  currentEnvId: string | null
  loading: boolean
  error: string | null
  computeDevices: ComputeDevice[]
  pytorchBackend: PyTorchBackend | null
  initialized: boolean
  onEnvironmentChange?: () => void
  
  // 操作
  fetchEnvironments: (force?: boolean) => Promise<void>
  switchEnvironment: (envId: string) => Promise<void>
  getEnvConfig: (envId: string) => Promise<EnvironmentConfig>
  saveEnvConfig: (envId: string, config: EnvironmentConfig) => Promise<void>
  searchPython: (comfyuiPath: string) => Promise<{pythonPath: string | null, pipPath: string | null}>
  getDependencies: (envId: string) => Promise<EnvironmentConfig['dependencies']>
  applyPreset: (envId: string, presetId: string) => Promise<void>
  deleteEnvironment: (envId: string) => Promise<void>
  createEnvironment: (comfyuiPath: string) => Promise<EnvironmentConfig>
  validateComfyUIPath: (path: string) => Promise<boolean>
  fetchComputeDevices: () => Promise<void>
  fetchFilteredComputeDevices: (envId: string) => Promise<void>
  reorderEnvironments: (envIds: string[]) => Promise<void>
  setOnEnvironmentChange: (callback: () => void) => void
}

// 组件Props接口
export interface EnvironmentSelectorProps {
  currentEnvId: string
  environments: EnvironmentConfig[]
  onSwitch: (envId: string) => void
}

export interface TabContainerProps {
  activeTab: 'general' | 'acceleration' | 'modelPaths' | 'advancedEnv'
  onTabChange?: (tab: 'general' | 'acceleration' | 'modelPaths' | 'advancedEnv') => void
  config: EnvironmentConfig
  currentEnvId?: string
  onConfigChange: (config: Partial<EnvironmentConfig>) => void
  onRefreshDependencies?: () => void
  onApplyPreset?: (presetId: string) => void
  onPresetChange?: (presetId: string) => void
  onShowToast?: (message: string, variant: 'success' | 'error') => void
}

export interface GeneralTabProps {
  config: EnvironmentConfig['general'] & EnvironmentConfig['acceleration'] & { alias?: string }
  dependencies: EnvironmentConfig['dependencies']
  onConfigChange: (config: Partial<EnvironmentConfig['general'] & EnvironmentConfig['acceleration'] & { alias?: string }>) => void
  onRefreshDependencies: () => void
}

export interface AccelerationTabProps {
  config: EnvironmentConfig['acceleration']
  currentEnvId?: string
  onConfigChange: (config: Partial<EnvironmentConfig['acceleration']>) => void
  onPresetChange?: (presetId: string) => void
  onShowToast?: (message: string, variant: 'success' | 'error') => void
}

export interface AdvancedEnvTabProps {
  value: string
  onChange: (value: string) => void
}

export interface PathConfigSectionProps {
  config: EnvironmentConfig['general']
  onConfigChange: (config: Partial<EnvironmentConfig['general']>) => void
}

export interface DependencyInfoSectionProps {
  dependencies: EnvironmentConfig['dependencies']
  onRefresh: () => void
}

export interface VRAMStrategySectionProps {
  config: EnvironmentConfig['acceleration']
  currentEnvId?: string
  onConfigChange: (config: Partial<EnvironmentConfig['acceleration']>) => void
}

export interface PrecisionControlSectionProps {
  config: EnvironmentConfig['acceleration']
  onConfigChange: (config: Partial<EnvironmentConfig['acceleration']>) => void
}

export interface PerformanceSectionProps {
  config: EnvironmentConfig['acceleration']
  onConfigChange: (config: Partial<EnvironmentConfig['acceleration']>) => void
}

export interface NetworkSectionProps {
  config: EnvironmentConfig['acceleration']
  onConfigChange: (config: Partial<EnvironmentConfig['acceleration']>) => void
}

export interface PathsSectionProps {
  config: EnvironmentConfig['acceleration']
  onConfigChange: (config: Partial<EnvironmentConfig['acceleration']>) => void
}

export interface AuxiliarySectionProps {
  config: EnvironmentConfig['acceleration']
  onConfigChange: (config: Partial<EnvironmentConfig['acceleration']>) => void
}

// 极客模式组件Props
export interface GeekModeToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  hasUnsavedChanges: boolean
}

export interface LineNumberTextareaProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  errors?: Array<{ line: number; message: string }>
  placeholder?: string
  className?: string
}

export interface GeekModeEditorProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
}

export interface GeekModePresetsProps {
  currentEnvId?: string
  onLoadPreset: (args: string) => void
}
