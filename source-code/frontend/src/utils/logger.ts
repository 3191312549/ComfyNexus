/**
 * 统一的日志工具
 * 
 * 提供带前缀的日志函数，支持调试模式的详细追踪
 */

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  DEV = 'DEV',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * 日志配置
 */
interface LoggerConfig {
  enabled: boolean
  level: LogLevel
  showTimestamp: boolean
}

/**
 * 默认配置
 */
const defaultConfig: LoggerConfig = {
  enabled: true,
  level: LogLevel.INFO,
  showTimestamp: true
}

/**
 * 当前配置
 */
let config: LoggerConfig = { ...defaultConfig }

/**
 * 日志级别优先级
 */
const levelPriority: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.DEV]: 2,
  [LogLevel.WARN]: 3,
  [LogLevel.ERROR]: 4
}

/**
 * 检查是否应该输出日志
 */
const shouldLog = (level: LogLevel): boolean => {
  if (!config.enabled) return false
  return levelPriority[level] >= levelPriority[config.level]
}

/**
 * 格式化时间戳
 */
const formatTimestamp = (): string => {
  const now = new Date()
  return now.toISOString()
}

/**
 * 创建日志器
 */
export const createLogger = (prefix: string) => {
  /**
   * 输出日志
   */
  const log = (level: LogLevel, ...args: any[]) => {
    if (!shouldLog(level)) return

    const timestamp = config.showTimestamp ? `[${formatTimestamp()}]` : ''
    const levelTag = `[${level}]`
    const prefixTag = `[${prefix}]`

    const message = [timestamp, levelTag, prefixTag, ...args].filter(Boolean)

    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(...message)
        break
      case LogLevel.DEV:
        console.log(...message)
        break
      case LogLevel.WARN:
        console.warn(...message)
        break
      case LogLevel.ERROR:
        console.error(...message)
        break
    }
  }

  return {
    debug: (...args: any[]) => log(LogLevel.DEBUG, ...args),
    info: (...args: any[]) => log(LogLevel.INFO, ...args),
    dev: (...args: any[]) => log(LogLevel.DEV, ...args),
    warn: (...args: any[]) => log(LogLevel.WARN, ...args),
    error: (...args: any[]) => log(LogLevel.ERROR, ...args),
    log: (...args: any[]) => log(LogLevel.INFO, ...args)
  }
}

/**
 * 配置日志器
 */
export const configureLogger = (newConfig: Partial<LoggerConfig>) => {
  config = { ...config, ...newConfig }
}

/**
 * 启用调试模式
 */
export const enableDebugMode = () => {
  configureLogger({ level: LogLevel.DEBUG })
  console.log('[Logger] 调试模式已启用')
}

/**
 * 禁用调试模式
 */
export const disableDebugMode = () => {
  configureLogger({ level: LogLevel.INFO })
  console.log('[Logger] 调试模式已禁用')
}

/**
 * 获取当前配置
 */
export const getLoggerConfig = (): LoggerConfig => {
  return { ...config }
}

/**
 * 从后端设置中加载日志配置
 * 
 * 该函数会调用后端API获取日志配置，并应用到前端日志系统
 * 确保前后端日志级别保持一致
 */
export const loadLoggerConfigFromSettings = async (): Promise<void> => {
  try {
    // 检查是否在开发环境（浏览器）
    const isDevelopment = window.location.port === '5173' || window.location.port === '3000'
    
    if (isDevelopment) {
      console.log('[Logger] 开发环境，使用默认日志配置')
      return
    }

    // 检查 pywebview API 是否可用
    if (!window.pywebview || !window.pywebview.api) {
      console.warn('[Logger] pywebview API 不可用，使用默认日志配置')
      return
    }

    // 调用后端API获取设置
    const api = window.pywebview.api as any
    const response = await api.get_settings()

    if (response.success && response.settings && response.settings.logging) {
      const loggingConfig = response.settings.logging
      const backendLevel = loggingConfig.level || 'INFO'

      // 将后端日志级别映射到前端日志级别
      const levelMap: Record<string, LogLevel> = {
        'DEBUG': LogLevel.DEBUG,
        'INFO': LogLevel.INFO,
        'DEV': LogLevel.DEV,
        'WARNING': LogLevel.WARN,
        'ERROR': LogLevel.ERROR
      }

      const frontendLevel = levelMap[backendLevel] || LogLevel.INFO

      // 应用配置
      configureLogger({ level: frontendLevel })
      console.log(`[Logger] 已从后端加载日志配置，级别: ${backendLevel}`)
    } else {
      console.warn('[Logger] 无法从后端获取日志配置，使用默认配置')
    }
  } catch (error) {
    console.error('[Logger] 加载日志配置失败:', error)
    // 失败时使用默认配置，不影响应用运行
  }
}

// 导出默认日志器
export const logger = createLogger('App')
