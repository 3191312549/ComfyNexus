/**
 * 环境设置Mock数据和API
 */

import type { EnvironmentConfig, PresetConfig } from '@/types/environment'

// 辅助函数：模拟延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 预设方案定义
export const PRESETS: PresetConfig[] = [
  {
    id: 'flux',
    name: '标准模式（推荐）',
    description: '适用于 8-16GB 显存，平衡性能与质量',
    vramRequirement: '8-16GB',
    isDefault: true,
    config: {
      vramStrategy: 'normal',
      unetPrecision: 'fp8_e4m3fn',
      textEncPrecision: 'fp8_e4m3fn',
      vaePrecision: 'fp32',
      attentionMode: 'flash'
    }
  },
  {
    id: 'flagship',
    name: '高显存模式',
    description: '适用于 24GB+ 显存，追求极致画质',
    vramRequirement: '24GB+',
    config: {
      vramStrategy: 'high',
      unetPrecision: 'bf16',
      vaePrecision: 'fp32',
      attentionMode: 'flash'
    }
  },
  {
    id: 'legacy',
    name: '低显存模式',
    description: '适用于 4-6GB 显存，优化内存占用',
    vramRequirement: '4-6GB',
    config: {
      vramStrategy: 'low',
      unetPrecision: 'fp16',
      vaePrecision: 'fp16',
      attentionMode: 'split'
    }
  },
  {
    id: 'custom',
    name: '自定义',
    description: '用户自定义配置',
    vramRequirement: '-',
    config: {}
  }
]

// Mock环境数据
export const mockEnvironments: EnvironmentConfig[] = [
  {
    id: 'env-1',
    name: 'ComfyUI 主环境 0.2.8',
    alias: 'ComfyUI 主环境',
    version: '0.2.8',
    isActive: true,
    general: {
      comfyuiPath: 'C:\\ComfyUI',
      pythonPath: 'C:\\ComfyUI\\python',
      pipPath: 'C:\\ComfyUI\\python\\Scripts\\pip',
      // gpuSelection: ['NVIDIA RTX 4090']  // 已删除
    },
    dependencies: {
      pythonVersion: '3.12.0',
      pytorchVersion: '2.1.0+cu121',
      cudaVersion: '12.1',
      sageAttentionVersion: '1.0.0',
      flashAttnVersion: '2.5.0',
      tritonVersion: '2.1.0',
      xformersVersion: '0.0.23'
    },
    acceleration: {
      computeDevice: 'nvidia:0',
      vramStrategy: 'auto',
      cpuOnly: false,
      gpuOnly: false,
      reserveVram: 1.0,
      unetPrecision: 'fp8_e4m3fn',
      vaePrecision: 'fp32',
      textEncPrecision: 'fp8_e4m3fn',
      attentionMode: 'flash',
      disableXformers: false,
      disableSmartMemory: false,
      forceChannelsLast: false,
      cacheLru: 0,
      deterministic: false,
      fastMode: false,
      cudaMalloc: 'auto',
      listenNetwork: false,
      listenAddress: '',
      port: 8188,
      enableCors: false,
      tlsKeyfile: '',
      tlsCertfile: '',
      baseDirectory: '',
      inputDirectory: 'input',
      outputDirectory: 'output',
      tempDirectory: 'temp',
      userDirectory: 'user',
      extraModelPathsConfig: '',
      previewMethod: 'auto',
      previewSize: 512,
      safeMode: false,
      enableManager: true,
      logLevel: 'INFO',
      disableMetadata: false
    },
    createdAt: '2026-01-27T10:00:00Z',
    updatedAt: '2026-01-27T10:00:00Z'
  },
  {
    id: 'env-2',
    name: 'ComfyUI 测试环境 0.2.7',
    alias: 'ComfyUI 测试环境',
    version: '0.2.7',
    isActive: false,
    general: {
      comfyuiPath: 'D:\\ComfyUI-Dev',
      pythonPath: 'D:\\ComfyUI-Dev\\python_embeded',
      pipPath: 'D:\\ComfyUI-Dev\\python_embeded\\Scripts\\pip',
      // gpuSelection: ['NVIDIA RTX 3060']  // 已删除
    },
    dependencies: {
      pythonVersion: '3.11.5',
      pytorchVersion: '2.0.1+cu118',
      cudaVersion: '11.8',
      sageAttentionVersion: '0.9.0',
      flashAttnVersion: '2.4.0',
      tritonVersion: '2.0.0',
      xformersVersion: '0.0.22'
    },
    acceleration: {
      computeDevice: 'nvidia:0',
      vramStrategy: 'low',
      cpuOnly: false,
      gpuOnly: false,
      reserveVram: 0.5,
      unetPrecision: 'fp8_e4m3fn',
      vaePrecision: 'fp32',
      textEncPrecision: 'fp8_e4m3fn',
      attentionMode: 'split',
      disableXformers: false,
      disableSmartMemory: false,
      forceChannelsLast: false,
      cacheLru: 0,
      deterministic: false,
      fastMode: false,
      cudaMalloc: 'auto',
      listenNetwork: false,
      listenAddress: '',
      port: 8188,
      enableCors: false,
      tlsKeyfile: '',
      tlsCertfile: '',
      baseDirectory: '',
      inputDirectory: 'input',
      outputDirectory: 'output',
      tempDirectory: 'temp',
      userDirectory: 'user',
      extraModelPathsConfig: '',
      previewMethod: 'taesd',
      previewSize: 512,
      safeMode: false,
      enableManager: true,
      logLevel: 'INFO',
      disableMetadata: false
    },
    createdAt: '2026-01-27T09:00:00Z',
    updatedAt: '2026-01-27T09:30:00Z'
  },
  {
    id: 'env-3',
    name: 'ComfyUI 开发环境 0.3.0-dev',
    alias: 'ComfyUI 开发环境',
    version: '0.3.0-dev',
    isActive: false,
    general: {
      comfyuiPath: 'E:\\ComfyUI-Dev',
      pythonPath: 'E:\\ComfyUI-Dev\\python',
      pipPath: 'E:\\ComfyUI-Dev\\python\\Scripts\\pip',
      // gpuSelection: ['NVIDIA RTX 4070']  // 已删除
    },
    dependencies: {
      pythonVersion: '3.12.1',
      pytorchVersion: '2.2.0+cu121',
      cudaVersion: '12.1',
      sageAttentionVersion: '1.1.0-dev',
      flashAttnVersion: '2.5.5',
      tritonVersion: '2.2.0',
      xformersVersion: '0.0.24'
    },
    acceleration: {
      computeDevice: 'nvidia:0',
      vramStrategy: 'auto',
      cpuOnly: false,
      gpuOnly: false,
      reserveVram: 1.0,
      unetPrecision: 'fp16',
      vaePrecision: 'fp32',
      textEncPrecision: 'fp16',
      attentionMode: 'flash',
      disableXformers: false,
      disableSmartMemory: false,
      forceChannelsLast: false,
      cacheLru: 0,
      deterministic: false,
      fastMode: false,
      cudaMalloc: 'auto',
      listenNetwork: true,
      listenAddress: '',
      port: 8189,
      enableCors: true,
      tlsKeyfile: '',
      tlsCertfile: '',
      baseDirectory: '',
      inputDirectory: 'input',
      outputDirectory: 'output',
      tempDirectory: 'temp',
      userDirectory: 'user',
      extraModelPathsConfig: '',
      previewMethod: 'auto',
      previewSize: 512,
      safeMode: false,
      enableManager: true,
      logLevel: 'DEBUG',
      disableMetadata: false
    },
    createdAt: '2026-01-27T08:00:00Z',
    updatedAt: '2026-01-27T08:30:00Z'
  }
]

// Mock API函数

/**
 * 获取环境列表
 */
export const fetchEnvironments = async (): Promise<EnvironmentConfig[]> => {
  await delay(300)
  return mockEnvironments
}

/**
 * 获取环境配置
 */
export const getEnvConfig = async (envId: string): Promise<EnvironmentConfig> => {
  await delay(200)
  const env = mockEnvironments.find(e => e.id === envId)
  if (!env) throw new Error('Environment not found')
  return env
}

/**
 * 保存环境配置
 */
export const saveEnvConfig = async (
  envId: string,
  config: EnvironmentConfig
): Promise<void> => {
  await delay(500)
  const index = mockEnvironments.findIndex(e => e.id === envId)
  if (index !== -1) {
    mockEnvironments[index] = {
      ...config,
      updatedAt: new Date().toISOString()
    }
  }
}

/**
 * 切换环境
 */
export const switchEnvironment = async (envId: string): Promise<void> => {
  await delay(300)
  mockEnvironments.forEach(env => {
    env.isActive = env.id === envId
  })
}

/**
 * 搜寻Python目录
 */
export const searchPython = async (
  comfyuiPath: string
): Promise<{ pythonPath: string | null; pipPath: string | null }> => {
  await delay(500)
  
  // Mock逻辑：优先搜寻python_embeded，其次python
  const pythonEmbededPath = `${comfyuiPath}\\python_embeded`
  
  // 模拟：假设总能找到python_embeded
  return {
    pythonPath: pythonEmbededPath,
    pipPath: `${pythonEmbededPath}\\Scripts\\pip`
  }
}

/**
 * 获取依赖信息
 */
export const getDependencies = async (
  envId: string
): Promise<EnvironmentConfig['dependencies']> => {
  await delay(400)
  const env = mockEnvironments.find(e => e.id === envId)
  if (!env) throw new Error('Environment not found')
  return env.dependencies
}

/**
 * 应用预设方案
 */
export const applyPreset = async (
  envId: string,
  presetId: string
): Promise<EnvironmentConfig> => {
  await delay(300)
  const env = mockEnvironments.find(e => e.id === envId)
  const preset = PRESETS.find(p => p.id === presetId)
  if (!env || !preset) throw new Error('Not found')
  
  // 应用预设方案的配置
  env.acceleration = {
    ...env.acceleration,
    ...preset.config
  }
  
  env.updatedAt = new Date().toISOString()
  
  return env
}

/**
 * 删除环境
 */
export const deleteEnvironment = async (envId: string): Promise<void> => {
  await delay(300)
  const index = mockEnvironments.findIndex(e => e.id === envId)
  if (index === -1) throw new Error('Environment not found')
  
  // 不允许删除当前激活环境
  if (mockEnvironments[index].isActive) {
    throw new Error('Cannot delete active environment')
  }
  
  mockEnvironments.splice(index, 1)
}

/**
 * 创建环境
 */
export const createEnvironment = async (comfyuiPath: string): Promise<EnvironmentConfig> => {
  await delay(500)
  
  // 生成唯一别名
  const generateUniqueAlias = (): string => {
    const baseAlias = 'ComfyUI'
    const existingAliases = mockEnvironments.map(e => e.alias)
    
    if (!existingAliases.includes(baseAlias)) {
      return baseAlias
    }
    
    let counter = 2
    while (existingAliases.includes(`${baseAlias}_${counter}`)) {
      counter++
    }
    
    return `${baseAlias}_${counter}`
  }
  
  const newEnv: EnvironmentConfig = {
    id: `env-${Date.now()}`,
    name: 'ComfyUI',
    alias: generateUniqueAlias(),
    version: 'Unknown',  // 添加版本字段
    isActive: false,
    general: {
      comfyuiPath,
      pythonPath: '',
      pipPath: '',
      // gpuSelection: []  // 已删除
    },
    dependencies: {
      pythonVersion: 'Unknown',
      pytorchVersion: 'Unknown',
      cudaVersion: 'Unknown',
      sageAttentionVersion: 'Unknown',
      flashAttnVersion: 'Unknown',
      tritonVersion: 'Unknown',
      xformersVersion: 'Unknown'
    },
    acceleration: {
      computeDevice: 'nvidia:0',
      vramStrategy: 'auto',
      cpuOnly: false,
      gpuOnly: false,
      reserveVram: 1.0,
      unetPrecision: 'fp8_e4m3fn',
      vaePrecision: 'fp32',
      textEncPrecision: 'fp8_e4m3fn',
      attentionMode: 'flash',
      disableXformers: false,
      disableSmartMemory: false,
      forceChannelsLast: false,
      cacheLru: 0,
      deterministic: false,
      fastMode: false,
      cudaMalloc: 'auto',
      listenNetwork: false,
      listenAddress: '',
      port: 8188,
      enableCors: false,
      tlsKeyfile: '',
      tlsCertfile: '',
      baseDirectory: '',
      inputDirectory: '',
      outputDirectory: '',
      tempDirectory: '',
      userDirectory: '',
      extraModelPathsConfig: '',
      previewMethod: 'auto',
      previewSize: 512,
      safeMode: false,
      enableManager: false,
      logLevel: 'INFO',
      disableMetadata: false,
      // 辅助选项第5组预设方案2: 显存优化
      geekMode: {
        enabled: false,
        customArgs: '',
        currentPresetId: 'custom'
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  mockEnvironments.push(newEnv)
  return newEnv
}

/**
 * 验证ComfyUI路径
 */
export const validateComfyUIPath = async (path: string): Promise<boolean> => {
  await delay(200)
  
  // Mock逻辑：简单验证路径格式
  // 实际应该检查main.py文件是否存在
  if (!path || path.trim() === '') {
    return false
  }
  
  // 模拟：假设路径包含"ComfyUI"就是有效的
  return path.toLowerCase().includes('comfyui')
}

/**
 * 获取计算设备列表
 */
export const getComputeDevices = async (): Promise<import('@/types/environment').ComputeDevice[]> => {
  await delay(200)
  
  return [
    {
      index: 0,
      name: "Intel(R) UHD Graphics 630",
      type: "intel",
      driver: "27.20.100.9316"
    },
    {
      index: 0,
      name: "NVIDIA GeForce RTX 4090",
      type: "nvidia",
      driver: "31.0.15.3623"
    }
  ]
}
