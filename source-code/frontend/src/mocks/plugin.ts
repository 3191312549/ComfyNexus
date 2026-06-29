/**
 * 插件管理 Mock 数据
 */

// 暂时注释掉未使用的类型导入
// import { InstalledPlugin, MarketPlugin } from '@/stores/usePluginStore'

// Mock 数据类型定义
interface MockInstalledPlugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  dependencies: string[];
  path: string;
  enabled: boolean;
}

interface MockMarketPlugin {
  author: string;
  title: string;
  id: string;
  reference: string;
  description: string;
  installed: boolean;
}

export const mockInstalledPlugins: MockInstalledPlugin[] = [
  {
    id: 'plugin-1',
    name: 'ComfyUI-Manager',
    version: '2.50.0',
    author: 'ltdrdata',
    description: 'ComfyUI 插件管理器',
    dependencies: [],
    path: 'custom_nodes/ComfyUI-Manager',
    enabled: true,
  },
  {
    id: 'plugin-2',
    name: 'ComfyUI-Impact-Pack',
    version: '5.20.0',
    author: 'ltdrdata',
    description: '强大的图像处理工具包',
    dependencies: ['ComfyUI-Manager'],
    path: 'custom_nodes/ComfyUI-Impact-Pack',
    enabled: true,
  },
  {
    id: 'plugin-3',
    name: 'ComfyUI-AnimateDiff-Evolved',
    version: '1.15.0',
    author: 'Kosinkadink',
    description: 'AnimateDiff 动画生成插件',
    dependencies: [],
    path: 'custom_nodes/ComfyUI-AnimateDiff-Evolved',
    enabled: true,
  },
  {
    id: 'plugin-4',
    name: 'ComfyUI-ControlNet-Aux',
    version: '1.0.0',
    author: 'Fannovel16',
    description: 'ControlNet 辅助预处理器',
    dependencies: [],
    path: 'custom_nodes/ComfyUI-ControlNet-Aux',
    enabled: false,
  },
]

export const mockMarketPlugins: MockMarketPlugin[] = [
  {
    author: 'ltdrdata',
    title: 'ComfyUI-Manager',
    id: 'comfyui-manager',
    reference: 'https://github.com/ltdrdata/ComfyUI-Manager',
    description: 'ComfyUI 插件管理器，提供插件安装、更新、管理功能',
    installed: true,
  },
  {
    author: 'ltdrdata',
    title: 'ComfyUI-Impact-Pack',
    id: 'comfyui-impact-pack',
    reference: 'https://github.com/ltdrdata/ComfyUI-Impact-Pack',
    description: '强大的图像处理工具包，包含多种实用节点',
    installed: true,
  },
  {
    author: 'Kosinkadink',
    title: 'ComfyUI-AnimateDiff-Evolved',
    id: 'comfyui-animatediff-evolved',
    reference: 'https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved',
    description: 'AnimateDiff 动画生成插件，支持视频生成',
    installed: true,
  },
  {
    author: 'Fannovel16',
    title: 'ComfyUI-ControlNet-Aux',
    id: 'comfyui-controlnet-aux',
    reference: 'https://github.com/Fannovel16/comfyui_controlnet_aux',
    description: 'ControlNet 辅助预处理器，支持多种预处理方法',
    installed: true,
  },
  {
    author: 'WASasquatch',
    title: 'was-node-suite-comfyui',
    id: 'was-node-suite',
    reference: 'https://github.com/WASasquatch/was-node-suite-comfyui',
    description: 'WAS 节点套件，包含大量实用工具节点',
    installed: false,
  },
  {
    author: 'pythongosssss',
    title: 'ComfyUI-Custom-Scripts',
    id: 'comfyui-custom-scripts',
    reference: 'https://github.com/pythongosssss/ComfyUI-Custom-Scripts',
    description: '自定义脚本集合，增强 ComfyUI 功能',
    installed: false,
  },
  {
    author: 'cubiq',
    title: 'ComfyUI_IPAdapter_plus',
    id: 'comfyui-ipadapter-plus',
    reference: 'https://github.com/cubiq/ComfyUI_IPAdapter_plus',
    description: 'IP-Adapter 增强版，支持图像风格迁移',
    installed: false,
  },
  {
    author: 'Suzie1',
    title: 'ComfyUI_Comfyroll_CustomNodes',
    id: 'comfyui-comfyroll',
    reference: 'https://github.com/Suzie1/ComfyUI_Comfyroll_CustomNodes',
    description: 'Comfyroll 自定义节点集合',
    installed: false,
  },
]

export const mockPluginApi = {
  getInstalledPlugins: async (): Promise<MockInstalledPlugin[]> => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return mockInstalledPlugins
  },
  
  getMarketPlugins: async (keyword?: string): Promise<MockMarketPlugin[]> => {
    await new Promise((resolve) => setTimeout(resolve, 800))
    if (keyword) {
      return mockMarketPlugins.filter(
        (p) =>
          p.title.toLowerCase().includes(keyword.toLowerCase()) ||
          p.description.toLowerCase().includes(keyword.toLowerCase())
      )
    }
    return mockMarketPlugins
  },
  
  installPlugin: async (id: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 3000))
    console.log('Installed plugin:', id)
  },
  
  uninstallPlugin: async (id: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log('Uninstalled plugin:', id)
  },
  
  togglePlugin: async (id: string, enabled: boolean): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    console.log('Toggled plugin:', id, enabled)
  },
}
