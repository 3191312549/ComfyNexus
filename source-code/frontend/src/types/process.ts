/**
 * 进程冲突检测相关类型定义
 */

/**
 * 冲突进程信息
 */
export interface ConflictProcess {
  /** 进程 ID */
  pid: number
  /** 监听端口 */
  port: number
  /** 完整命令行 */
  cmdline: string
  /** 工作目录 */
  cwd: string
  /** 创建时间戳 */
  create_time: number
}

/**
 * 进程检测结果
 */
export interface CheckProcessResult {
  /** 是否成功 */
  success: boolean
  /** 检测数据 */
  data: {
    /** 不受管理的进程列表 */
    processes: ConflictProcess[]
    /** 是否存在端口冲突 */
    has_conflict: boolean
    /** 目标端口 */
    target_port: number
  }
  /** 错误信息（如果失败） */
  error: string | null
}

/**
 * 进程终止结果
 */
export interface KillProcessResult {
  /** 是否成功 */
  success: boolean
  /** 结果消息 */
  message: string
  /** 错误信息（如果失败） */
  error?: string
}
