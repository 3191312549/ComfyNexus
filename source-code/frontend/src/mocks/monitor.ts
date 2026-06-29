/**
 * 监控中心 Mock 数据
 */

export interface MonitorData {
  cpu: {
    usage: number
    cores: number
    temperature?: number
  }
  memory: {
    used: number
    total: number
    percentage: number
  }
  disk: {
    used: number
    total: number
    percentage: number
  }
  gpu?: {
    name: string
    usage: number
    memory: {
      used: number
      total: number
      percentage: number
    }
    temperature: number
  }
  network: {
    upload: number
    download: number
  }
  timestamp: string
}

export const mockMonitorData: MonitorData = {
  cpu: {
    usage: 45.6,
    cores: 16,
    temperature: 62
  },
  memory: {
    used: 12884901888,
    total: 34359738368,
    percentage: 37.5
  },
  disk: {
    used: 536870912000,
    total: 1099511627776,
    percentage: 48.8
  },
  gpu: {
    name: 'NVIDIA GeForce RTX 4090',
    usage: 78.3,
    memory: {
      used: 16106127360,
      total: 25769803776,
      percentage: 62.5
    },
    temperature: 75
  },
  network: {
    upload: 1048576,
    download: 5242880
  },
  timestamp: new Date().toISOString()
}

// 生成历史数据
export const generateHistoryData = (count: number = 20): MonitorData[] => {
  const data: MonitorData[] = []
  const now = Date.now()
  
  for (let i = count - 1; i >= 0; i--) {
    data.push({
      cpu: {
        usage: 30 + Math.random() * 40,
        cores: 16,
        temperature: 55 + Math.random() * 20
      },
      memory: {
        used: 10737418240 + Math.random() * 8589934592,
        total: 34359738368,
        percentage: 30 + Math.random() * 30
      },
      disk: {
        used: 536870912000,
        total: 1099511627776,
        percentage: 48.8
      },
      gpu: {
        name: 'NVIDIA GeForce RTX 4090',
        usage: 50 + Math.random() * 40,
        memory: {
          used: 12884901888 + Math.random() * 8589934592,
          total: 25769803776,
          percentage: 50 + Math.random() * 30
        },
        temperature: 65 + Math.random() * 20
      },
      network: {
        upload: Math.random() * 2097152,
        download: Math.random() * 10485760
      },
      timestamp: new Date(now - i * 3000).toISOString()
    })
  }
  
  return data
}
