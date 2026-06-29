/**
 * 系统状态 Mock 数据
 */

import { SystemStatus } from '@/stores/useSystemStore'

export const mockSystemStatus: SystemStatus = {
  cpu: 45,
  memory: 62,
  disk: 78,
  gpu: 35,
}

export const mockSystemApi = {
  getStatus: async (): Promise<SystemStatus> => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    // 模拟动态数据
    return {
      cpu: Math.floor(Math.random() * 100),
      memory: Math.floor(Math.random() * 100),
      disk: 78,
      gpu: Math.floor(Math.random() * 100),
    }
  },
}
