/**
 * 插件市场 Mock 数据
 * 
 * 用于开发和测试插件市场功能
 */

import type { Plugin } from '@/types/plugin-marketplace'

const now = new Date()
const formatDate = (daysAgo: number): string => {
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
  return date.toISOString()
}

export const mockPlugins: Plugin[] = [
  {
    name: 'ComfyUI-Manager',
    description: 'ComfyUI 插件管理器，提供插件安装、更新、管理功能。支持一键安装、批量更新、依赖管理等功能，是 ComfyUI 生态中最重要的工具之一。',
    repository: 'https://github.com/ltdrdata/ComfyUI-Manager',
    version_tag: 'v2.50.0',
    updated_at: formatDate(1),
    node_count: 45,
    is_installed: true,
    install_status: 'installed',
    author: 'ltdrdata',
    stars: 8500,
    downloads: 500000,
    tags: ['manager', 'essential', 'utility'],
  },
  {
    name: 'ComfyUI-Impact-Pack',
    description: '强大的图像处理工具包，包含多种实用节点。提供图像增强、检测、分割等功能，支持批量处理和自动化工作流。',
    repository: 'https://github.com/ltdrdata/ComfyUI-Impact-Pack',
    version_tag: 'v5.20.0',
    updated_at: formatDate(3),
    node_count: 120,
    is_installed: true,
    install_status: 'installed',
    author: 'ltdrdata',
    stars: 4200,
    downloads: 280000,
    tags: ['image-processing', 'detection', 'enhancement'],
  },
  {
    name: 'ComfyUI-AnimateDiff-Evolved',
    description: 'AnimateDiff 动画生成插件，支持高质量视频生成。提供多种运动模型和调度器，支持自定义动画参数和批量渲染。',
    repository: 'https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved',
    version_tag: 'v1.15.0',
    updated_at: formatDate(5),
    node_count: 35,
    is_installed: true,
    install_status: 'installed',
    author: 'Kosinkadink',
    stars: 3800,
    downloads: 195000,
    tags: ['animation', 'video', 'motion'],
  },
  {
    name: 'ComfyUI-ControlNet-Aux',
    description: 'ControlNet 辅助预处理器，支持多种预处理方法。包括边缘检测、姿态估计、深度估计、法线估计等功能。',
    repository: 'https://github.com/Fannovel16/comfyui_controlnet_aux',
    version_tag: 'v1.0.0',
    updated_at: formatDate(7),
    node_count: 85,
    is_installed: false,
    install_status: 'not_installed',
    author: 'Fannovel16',
    stars: 2900,
    downloads: 180000,
    tags: ['controlnet', 'preprocessor', 'pose'],
  },
  {
    name: 'WAS Node Suite',
    description: 'WAS 节点套件，包含大量实用工具节点。提供图像处理、文本处理、数学运算、逻辑控制等多种功能节点。',
    repository: 'https://github.com/WASasquatch/was-node-suite-comfyui',
    version_tag: 'v3.2.0',
    updated_at: formatDate(10),
    node_count: 250,
    is_installed: false,
    install_status: 'not_installed',
    author: 'WASasquatch',
    stars: 2600,
    downloads: 165000,
    tags: ['utility', 'image-processing', 'text'],
  },
  {
    name: 'ComfyUI-Custom-Scripts',
    description: '自定义脚本集合，增强 ComfyUI 功能。提供工作流管理、节点搜索、快捷键、自动保存等实用功能。',
    repository: 'https://github.com/pythongosssss/ComfyUI-Custom-Scripts',
    version_tag: 'v1.8.0',
    updated_at: formatDate(12),
    node_count: 20,
    is_installed: false,
    install_status: 'not_installed',
    author: 'pythongosssss',
    stars: 2400,
    downloads: 150000,
    tags: ['utility', 'workflow', 'scripts'],
  },
  {
    name: 'ComfyUI_IPAdapter_plus',
    description: 'IP-Adapter 增强版，支持图像风格迁移。提供多种 IP-Adapter 模型支持，支持风格混合、参考图像引导等功能。',
    repository: 'https://github.com/cubiq/ComfyUI_IPAdapter_plus',
    version_tag: 'v2.0.0',
    updated_at: formatDate(14),
    node_count: 40,
    is_installed: false,
    install_status: 'not_installed',
    author: 'cubiq',
    stars: 3200,
    downloads: 175000,
    tags: ['ip-adapter', 'style-transfer', 'reference'],
  },
  {
    name: 'ComfyUI_Comfyroll_CustomNodes',
    description: 'Comfyroll 自定义节点集合，提供丰富的创意工具。包含动画、排版、图像处理等多种节点。',
    repository: 'https://github.com/Suzie1/ComfyUI_Comfyroll_CustomNodes',
    version_tag: 'v1.5.0',
    updated_at: formatDate(18),
    node_count: 180,
    is_installed: false,
    install_status: 'not_installed',
    author: 'Suzie1',
    stars: 1800,
    downloads: 120000,
    tags: ['creative', 'animation', 'layout'],
  },
  {
    name: 'ComfyUI-Advanced-ControlNet',
    description: '高级 ControlNet 节点，提供更精细的控制。支持 ControlNet 强度调度、区域控制、条件组合等高级功能。',
    repository: 'https://github.com/Kosinkadink/ComfyUI-Advanced-ControlNet',
    version_tag: 'v1.2.0',
    updated_at: formatDate(20),
    node_count: 25,
    is_installed: false,
    install_status: 'not_installed',
    author: 'Kosinkadink',
    stars: 1500,
    downloads: 95000,
    tags: ['controlnet', 'advanced', 'scheduling'],
  },
  {
    name: 'ComfyUI-VideoHelperSuite',
    description: '视频处理辅助工具套件。支持视频加载、保存、格式转换、帧提取等功能，是视频工作流的必备工具。',
    repository: 'https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite',
    version_tag: 'v1.0.0',
    updated_at: formatDate(22),
    node_count: 30,
    is_installed: false,
    install_status: 'not_installed',
    author: 'Kosinkadink',
    stars: 1300,
    downloads: 85000,
    tags: ['video', 'format', 'frames'],
  },
  {
    name: 'ComfyUI_Ultimate_SD_Upscale',
    description: '终极 SD 放大节点。提供高质量图像放大功能，支持多种放大模型和自定义参数。',
    repository: 'https://github.com/ssitu/ComfyUI_Ultimate_SD_Upscale',
    version_tag: 'v1.0.0',
    updated_at: formatDate(25),
    node_count: 8,
    is_installed: false,
    install_status: 'not_installed',
    author: 'ssitu',
    stars: 1100,
    downloads: 72000,
    tags: ['upscale', 'enhancement', 'quality'],
  },
  {
    name: 'ComfyUI-Inspire-Pack',
    description: 'Inspire 节点包，提供多种创意工具。包含提示词处理、随机生成、批量处理等功能。',
    repository: 'https://github.com/ltdrdata/ComfyUI-Inspire-Pack',
    version_tag: 'v1.0.0',
    updated_at: formatDate(28),
    node_count: 65,
    is_installed: false,
    install_status: 'not_installed',
    author: 'ltdrdata',
    stars: 950,
    downloads: 65000,
    tags: ['prompt', 'random', 'batch'],
  },
]

export function createMockPlugin(index: number): Plugin {
  const authors = ['ltdrdata', 'Kosinkadink', 'Fannovel16', 'WASasquatch', 'pythongosssss', 'cubiq', 'Suzie1', 'ssitu']
  const tags = ['utility', 'image-processing', 'animation', 'controlnet', 'video', 'upscale', 'prompt']
  const isInstalled = Math.random() > 0.7
  
  return {
    name: `ComfyUI-Plugin-${index}`,
    description: `这是一个测试插件 ${index}，用于开发和测试插件市场功能。提供了多种实用节点和功能，支持自定义参数配置。`,
    repository: `https://github.com/test-user/comfyui-plugin-${index}`,
    version_tag: `v1.${index}.0`,
    updated_at: formatDate(index * 2),
    node_count: Math.floor(Math.random() * 100) + 10,
    is_installed: isInstalled,
    install_status: isInstalled ? 'installed' : 'not_installed',
    author: authors[index % authors.length],
    stars: Math.floor(Math.random() * 5000),
    downloads: Math.floor(Math.random() * 100000),
    tags: [tags[index % tags.length]],
  }
}

export function createMockPlugins(count: number): Plugin[] {
  return Array.from({ length: count }, (_, i) => createMockPlugin(i + 1))
}

export const mockPluginMarketplaceService = {
  getPlugins: async (_useCache: boolean = true): Promise<{ success: boolean; plugins: Plugin[]; error_message?: string }> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { success: true, plugins: mockPlugins }
  },
  
  getInstalledPluginsStatus: async (): Promise<{ success: boolean; installed_plugins: string[] }> => {
    await new Promise(resolve => setTimeout(resolve, 300))
    const installed = mockPlugins.filter(p => p.is_installed).map(p => {
      const parts = p.repository.split('/')
      return parts[parts.length - 1]
    })
    return { success: true, installed_plugins: installed }
  },
  
  searchPlugins: async (keyword: string): Promise<{ success: boolean; plugins: Plugin[] }> => {
    await new Promise(resolve => setTimeout(resolve, 300))
    const filtered = mockPlugins.filter(p => 
      p.name.toLowerCase().includes(keyword.toLowerCase()) ||
      p.description.toLowerCase().includes(keyword.toLowerCase())
    )
    return { success: true, plugins: filtered }
  },
}
