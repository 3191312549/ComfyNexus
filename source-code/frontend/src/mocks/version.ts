/**
 * 版本管理 Mock 数据
 */

import type { VersionInfo, RemoteInfo, BranchesData } from '@/types/version'

const now = new Date()
const formatDate = (date: Date) => date.toISOString()

const stableVersions: VersionInfo[] = [
  { id: 'v0.3.50', tag: 'v0.3.50', type: 'stable', message: '修复了若干已知问题，优化了性能', timestamp: formatDate(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.49', tag: 'v0.3.49', type: 'stable', message: '新增节点支持，修复内存泄漏问题', timestamp: formatDate(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.48', tag: 'v0.3.48', type: 'stable', message: '优化模型加载速度', timestamp: formatDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.47', tag: 'v0.3.47', type: 'stable', message: '修复 CUDA 兼容性问题', timestamp: formatDate(new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.46', tag: 'v0.3.46', type: 'stable', message: '新增批量处理功能', timestamp: formatDate(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.45', tag: 'v0.3.45', type: 'stable', message: '修复预览图生成问题', timestamp: formatDate(new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.44', tag: 'v0.3.44', type: 'stable', message: '优化 UI 响应速度', timestamp: formatDate(new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.43', tag: 'v0.3.43', type: 'stable', message: '新增自定义节点模板', timestamp: formatDate(new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.42', tag: 'v0.3.42', type: 'stable', message: '修复模型路径问题', timestamp: formatDate(new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.41', tag: 'v0.3.41', type: 'stable', message: '新增 LoRA 预览功能', timestamp: formatDate(new Date(now.getTime() - 32 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.40', tag: 'v0.3.40', type: 'stable', message: '优化显存使用', timestamp: formatDate(new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.39', tag: 'v0.3.39', type: 'stable', message: '修复工作流保存问题', timestamp: formatDate(new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.38', tag: 'v0.3.38', type: 'stable', message: '新增快捷键支持', timestamp: formatDate(new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.37', tag: 'v0.3.37', type: 'stable', message: '修复节点连接问题', timestamp: formatDate(new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.36', tag: 'v0.3.36', type: 'stable', message: '优化图像预览质量', timestamp: formatDate(new Date(now.getTime() - 55 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.35', tag: 'v0.3.35', type: 'stable', message: '新增模型管理功能', timestamp: formatDate(new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.34', tag: 'v0.3.34', type: 'stable', message: '修复进度条显示问题', timestamp: formatDate(new Date(now.getTime() - 65 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.33', tag: 'v0.3.33', type: 'stable', message: '优化队列管理', timestamp: formatDate(new Date(now.getTime() - 70 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.32', tag: 'v0.3.32', type: 'stable', message: '新增历史记录功能', timestamp: formatDate(new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.31', tag: 'v0.3.31', type: 'stable', message: '修复内存溢出问题', timestamp: formatDate(new Date(now.getTime() - 80 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.30', tag: 'v0.3.30', type: 'stable', message: '新增批量导出功能', timestamp: formatDate(new Date(now.getTime() - 85 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.29', tag: 'v0.3.29', type: 'stable', message: '优化启动速度', timestamp: formatDate(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.28', tag: 'v0.3.28', type: 'stable', message: '修复 API 接口问题', timestamp: formatDate(new Date(now.getTime() - 95 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.27', tag: 'v0.3.27', type: 'stable', message: '新增服务器配置选项', timestamp: formatDate(new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.26', tag: 'v0.3.26', type: 'stable', message: '修复多 GPU 支持问题', timestamp: formatDate(new Date(now.getTime() - 105 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.25', tag: 'v0.3.25', type: 'stable', message: '优化图像缓存机制', timestamp: formatDate(new Date(now.getTime() - 110 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.24', tag: 'v0.3.24', type: 'stable', message: '新增自定义主题支持', timestamp: formatDate(new Date(now.getTime() - 115 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.23', tag: 'v0.3.23', type: 'stable', message: '修复节点搜索问题', timestamp: formatDate(new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.22', tag: 'v0.3.22', type: 'stable', message: '优化工作流加载', timestamp: formatDate(new Date(now.getTime() - 125 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.21', tag: 'v0.3.21', type: 'stable', message: '新增节点分组功能', timestamp: formatDate(new Date(now.getTime() - 130 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.20', tag: 'v0.3.20', type: 'stable', message: '修复缩放问题', timestamp: formatDate(new Date(now.getTime() - 135 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.19', tag: 'v0.3.19', type: 'stable', message: '优化拖拽体验', timestamp: formatDate(new Date(now.getTime() - 140 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.18', tag: 'v0.3.18', type: 'stable', message: '新增节点收藏功能', timestamp: formatDate(new Date(now.getTime() - 145 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.17', tag: 'v0.3.17', type: 'stable', message: '修复连接线显示问题', timestamp: formatDate(new Date(now.getTime() - 150 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
  { id: 'v0.3.16', tag: 'v0.3.16', type: 'stable', message: '优化右键菜单', timestamp: formatDate(new Date(now.getTime() - 155 * 24 * 60 * 60 * 1000)), author: 'comfyanonymous' },
]

const devVersions: VersionInfo[] = Array.from({ length: 50 }, (_, i) => ({
  id: `${Math.random().toString(36).substring(2, 9)}`,
  type: 'dev' as const,
  message: [
    'Fix memory leak in image processing',
    'Add new sampling method support',
    'Update dependencies to latest versions',
    'Fix node connection validation',
    'Improve startup performance',
    'Add support for new model format',
    'Fix CUDA out of memory error',
    'Update UI components',
    'Add batch processing optimization',
    'Fix workflow serialization issue',
  ][i % 10],
  timestamp: formatDate(new Date(now.getTime() - i * 6 * 60 * 60 * 1000)),
  author: ['comfyanonymous', 'city', 'player', 'developer', 'contributor'][i % 5],
}))

export const mockRemoteInfo: RemoteInfo = {
  url: 'https://github.com/comfyanonymous/ComfyUI.git',
  branch: 'master',
  history: [
    'https://github.com/comfyanonymous/ComfyUI.git',
    'https://gitee.com/comfyanonymous/ComfyUI.git',
  ],
}

export const mockBranches: BranchesData = {
  currentBranch: 'master',
  localBranches: ['master', 'dev'],
  remoteBranches: ['origin/master', 'origin/dev', 'origin/feature-new'],
}

export function getVersions(type: 'stable' | 'dev', page: number, pageSize: number): {
  versions: VersionInfo[]
  hasMore: boolean
} {
  const allVersions = type === 'stable' ? stableVersions : devVersions
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const versions = allVersions.slice(start, end)
  
  return {
    versions,
    hasMore: end < allVersions.length,
  }
}

export function getCurrentVersion(): VersionInfo {
  return stableVersions[0]
}
