/**
 * 进程管理 Mock 数据
 */

import { ProcessStatus } from '@/stores/useProcessStore'
import type { CheckProcessResult, KillProcessResult, ConflictProcess } from '@/types/process'

export const mockProcessStatus: ProcessStatus = {
  isRunning: false,
  pid: undefined,
  port: undefined,
  uptime: undefined,
  url: undefined,
}

export const mockLogs: string[] = [
  '[2026-01-26 15:00:00] ComfyUI 启动中...',
  '[2026-01-26 15:00:01] 加载配置文件...',
  '[2026-01-26 15:00:02] 初始化模型...',
  '[2026-01-26 15:00:05] 加载自定义节点...',
  '[2026-01-26 15:00:08] 服务器启动成功',
  '[2026-01-26 15:00:08] 监听端口: 8188',
  '[2026-01-26 15:00:08] 访问地址: http://127.0.0.1:8188',
]

/**
 * Mock 冲突进程数据
 * 可以通过修改这个数组来测试不同场景
 */
export const mockConflictProcesses: ConflictProcess[] = [
  // 场景 1: 无冲突（默认）
  // 取消注释以下内容来测试有冲突的场景
  
  // 场景 2: 有冲突但无端口冲突
  // {
  //   pid: 8888,
  //   port: 8189,
  //   cmdline: 'python main.py --port 8189',
  //   cwd: 'C:\\ComfyUI-Another',
  //   create_time: Date.now() / 1000 - 7200, // 2小时前创建
  // },
  
  // 场景 3: 端口冲突（8188）
  // {
  //   pid: 9999,
  //   port: 8188,
  //   cmdline: 'python main.py --port 8188',
  //   cwd: 'C:\\ComfyUI-External',
  //   create_time: Date.now() / 1000 - 3600, // 1小时前创建
  // },
  
  // 场景 4: 多个冲突进程
  // {
  //   pid: 9999,
  //   port: 8188,
  //   cmdline: 'python main.py --port 8188',
  //   cwd: 'C:\\ComfyUI-External-1',
  //   create_time: Date.now() / 1000 - 3600,
  // },
  // {
  //   pid: 8888,
  //   port: 8189,
  //   cmdline: 'python main.py --port 8189',
  //   cwd: 'C:\\ComfyUI-External-2',
  //   create_time: Date.now() / 1000 - 7200,
  // },
  // {
  //   pid: 7777,
  //   port: 8190,
  //   cmdline: 'python main.py --port 8190',
  //   cwd: 'C:\\ComfyUI-External-3',
  //   create_time: Date.now() / 1000 - 10800,
  // },
]

/**
 * Mock 配置：控制 Mock 行为
 */
export const mockConfig = {
  // 是否模拟检测失败
  simulateCheckFailure: false,
  // 是否模拟终止失败
  simulateKillFailure: false,
  // 模拟终止失败的 PID（如果为 null，则所有终止都成功）
  killFailurePid: null as number | null,
  // 检测延迟（毫秒）
  checkDelay: 500,
  // 终止延迟（毫秒）
  killDelay: 800,
}

/**
 * 检查 ComfyUI 进程冲突 (Mock)
 */
export const checkComfyUIProcesses = async (): Promise<CheckProcessResult> => {
  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, mockConfig.checkDelay))
  
  // 模拟检测失败场景
  if (mockConfig.simulateCheckFailure) {
    return {
      success: false,
      data: {
        processes: [],
        has_conflict: false,
        target_port: 8188,
      },
      error: '模拟的检测失败错误',
    }
  }
  
  const targetPort = 8188
  const hasConflict = mockConflictProcesses.some(proc => proc.port === targetPort)
  
  return {
    success: true,
    data: {
      processes: mockConflictProcesses,
      has_conflict: hasConflict,
      target_port: targetPort,
    },
    error: null,
  }
}

/**
 * 终止进程 (Mock)
 */
export const killProcess = async (pid: number): Promise<KillProcessResult> => {
  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, mockConfig.killDelay))
  
  console.log(`[Mock] 终止进程 ${pid}`)
  
  // 模拟终止失败场景
  if (mockConfig.simulateKillFailure || mockConfig.killFailurePid === pid) {
    return {
      success: false,
      message: `终止进程 ${pid} 失败`,
      error: '权限不足，无法终止进程。请以管理员身份运行应用。',
    }
  }
  
  // 模拟成功
  return {
    success: true,
    message: `进程 ${pid} 已成功终止`,
  }
}

export const mockProcessApi = {
  getStatus: async (): Promise<ProcessStatus> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return mockProcessStatus
  },
  
  startComfyUI: async (): Promise<ProcessStatus> => {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    return {
      isRunning: true,
      pid: 12345,
      port: 8188,
      uptime: 0,
      url: 'http://127.0.0.1:8188',
    }
  },
  
  stopComfyUI: async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log('ComfyUI stopped')
  },
  
  getLogs: async (): Promise<string[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return mockLogs
  },
}
