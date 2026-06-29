/**
 * 首页功能 Mock 数据
 */

import type {
  SystemMonitorData,
  ComfyUIStatus,
  FolderShortcut,
  Creator
} from '@/types/home'

/**
 * Mock 系统监控数据
 */
export const mockSystemMonitorData: SystemMonitorData = {
  vram: {
    used: 45.2,
    total: 24,
    used_gb: 10.8
  },
  memory: {
    used: 62.5,
    total: 32,
    used_gb: 20.0
  },
  virtual_memory: {
    used: 35.8,
    total: 64,
    used_gb: 22.9
  },
  cpu: {
    usage: 28.5,
    power: 65.0,
    temperature: 58.0
  },
  gpu: {
    usage: 75.3,
    power: 280.0,
    temperature: 72.0
  }
}

/**
 * Mock ComfyUI 状态
 */
export const mockComfyUIStatus: ComfyUIStatus = {
  isRunning: false,
  pid: undefined,
  port: undefined,
  uptime: undefined,
  url: undefined
}

/**
 * Mock 运行中的 ComfyUI 状态
 */
export const mockComfyUIStatusRunning: ComfyUIStatus = {
  isRunning: true,
  pid: 12345,
  port: 8188,
  portAvailable: true,
  uptime: 3600, // 1小时
  url: 'http://127.0.0.1:8188'
}

/**
 * Mock 启动中的 ComfyUI 状态（端口尚未可用）
 */
export const mockComfyUIStatusStarting: ComfyUIStatus = {
  isRunning: true,
  pid: 12345,
  port: 8188,
  portAvailable: false,
  uptime: 0,
  url: undefined
}

/**
 * Mock 文件夹快捷方式
 * 使用 i18n key 作为 name，实际显示时通过 t() 翻译
 * 注意：folder 键在 home 命名空间下，所以完整的 key 是 'home.folder.input'
 */
export const mockFolderShortcuts: FolderShortcut[] = [
  {
    id: 'input',
    name: 'home.folder.input',
    path: '', // 空路径，等待环境配置同步
    icon: 'FolderInput',
    order: 0,
    isDefault: true
  },
  {
    id: 'output',
    name: 'home.folder.output',
    path: '', // 空路径，等待环境配置同步
    icon: 'FolderOutput',
    order: 1,
    isDefault: true
  },
  {
    id: 'models',
    name: 'home.folder.models',
    path: '', // 空路径，等待环境配置同步
    icon: 'FolderCog',
    order: 2,
    isDefault: true
  }
]

/**
 * Mock 创作者推荐列表
 */
export const mockCreators: Creator[] = [
  {
    id: 1,
    name: '诶-阿伟哥',
    avatar: '/avatars/weige.jpg',
    description: 'ComfyUI最好用的提示词插件作者',
    link: 'https://space.bilibili.com/520680644',
    platform: 'bilibili'
  },
  {
    id: 2,
    name: 'ComfyUI官方',
    avatar: '/avatars/comfyui.jpg',
    description: 'ComfyUI官方账号',
    link: 'https://github.com/comfyanonymous/ComfyUI',
    platform: 'github'
  },
  {
    id: 3,
    name: 'Stability AI',
    avatar: '/avatars/stability.jpg',
    description: 'Stable Diffusion开发团队',
    link: 'https://stability.ai',
    platform: 'web'
  },
  {
    id: 4,
    name: 'AI绘画教程',
    avatar: '/avatars/tutorial.jpg',
    description: '专注AI绘画教程分享',
    link: 'https://space.bilibili.com/123456789',
    platform: 'bilibili'
  },
  {
    id: 5,
    name: 'ComfyUI中文社区',
    avatar: '/avatars/community.jpg',
    description: 'ComfyUI中文用户交流社区',
    link: 'https://github.com/comfyui-cn',
    platform: 'github'
  },
  {
    id: 6,
    name: 'AI工具箱',
    avatar: '/avatars/tools.jpg',
    description: 'AI工具和插件推荐',
    link: 'https://www.youtube.com/@aitools',
    platform: 'youtube'
  }
]

/**
 * 生成随机监控数据（用于模拟实时更新）
 */
export const generateRandomMonitorData = (): SystemMonitorData => {
  const randomInRange = (min: number, max: number): number => {
    return Math.round((Math.random() * (max - min) + min) * 10) / 10
  }

  return {
    vram: {
      used: randomInRange(30, 80),
      total: 24,
      used_gb: randomInRange(7, 19)
    },
    memory: {
      used: randomInRange(40, 80),
      total: 32,
      used_gb: randomInRange(13, 26)
    },
    virtual_memory: {
      used: randomInRange(20, 60),
      total: 64,
      used_gb: randomInRange(13, 38)
    },
    cpu: {
      usage: randomInRange(10, 60),
      power: randomInRange(40, 120),
      temperature: randomInRange(45, 75)
    },
    gpu: {
      usage: randomInRange(20, 90),
      power: randomInRange(150, 350),
      temperature: randomInRange(50, 85)
    }
  }
}

/**
 * Mock API: 获取系统监控数据
 */
export const getSystemMonitorData = async (): Promise<SystemMonitorData> => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // 返回随机数据以模拟实时更新
  return generateRandomMonitorData()
}

/**
 * Mock API: 获取 ComfyUI 状态
 */
export const getComfyUIStatus = async (): Promise<ComfyUIStatus> => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 200))
  
  // 随机返回运行中或停止状态
  const isRunning = Math.random() > 0.5
  
  return isRunning ? mockComfyUIStatusRunning : mockComfyUIStatus
}

/**
 * Mock API: 打开 ComfyUI
 */
export const openComfyUI = async (): Promise<void> => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 500))
  
  console.log('[Mock] 打开 ComfyUI: http://127.0.0.1:8188')
  
  // 在开发环境中，尝试打开新窗口
  if (typeof window !== 'undefined') {
    window.open('http://127.0.0.1:8188', '_blank')
  }
}

/**
 * Mock API: 启动 ComfyUI
 */
export const startComfyUI = async (): Promise<void> => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  console.log('[Mock] 启动 ComfyUI')
}

/**
 * Mock API: 停止 ComfyUI
 */
export const stopComfyUI = async (): Promise<void> => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 500))
  
  console.log('[Mock] 停止 ComfyUI')
}

/**
 * Mock API: 获取文件夹快捷方式
 */
export const getFolderShortcuts = async (): Promise<FolderShortcut[]> => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 200))
  
  return mockFolderShortcuts
}

/**
 * Mock API: 保存文件夹快捷方式
 */
export const saveFolderShortcuts = async (shortcuts: FolderShortcut[]): Promise<void> => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 300))
  
  console.log('[Mock] 保存文件夹快捷方式:', shortcuts)
}

/**
 * Mock API: 打开文件夹
 */
export const openFolder = async (path: string): Promise<void> => {
  // 检查是否在生产环境
  const isProduction = window.pywebview && window.pywebview.api
  
  if (isProduction) {
    // 生产环境：调用后端 API
    try {
      const result = await window.pywebview.api.open_folder(path)
      if (!result.success) {
        throw new Error(result.error_message || '打开文件夹失败')
      }
    } catch (error) {
      console.error('[openFolder] 打开文件夹失败:', error)
      throw error
    }
  } else {
    // 开发环境：模拟延迟并显示提示
    await new Promise(resolve => setTimeout(resolve, 200))
    console.log('[Mock] 打开文件夹:', path)
    alert(`[开发环境] 打开文件夹: ${path}`)
  }
}

/**
 * Mock API: 验证文件夹路径
 */
export const validateFolderPath = async (path: string): Promise<boolean> => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // 简单验证：路径不为空且包含盘符
  const isValid = path.length > 0 && /^[A-Za-z]:\\/.test(path)
  
  console.log('[Mock] 验证文件夹路径:', path, '结果:', isValid)
  
  return isValid
}

/**
 * Mock API: 浏览文件夹
 */
export const browseFolder = async (): Promise<string | null> => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // 在开发环境中，返回模拟路径
  const mockPath = 'C:\\ComfyUI\\custom_folder'
  
  console.log('[Mock] 浏览文件夹，返回:', mockPath)
  
  return mockPath
}
