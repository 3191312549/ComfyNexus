/**
 * 前端日志系统单元测试
 * 
 * 测试日志级别过滤、配置加载、日志格式等功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createLogger,
  configureLogger,
  enableDebugMode,
  disableDebugMode,
  getLoggerConfig,
  loadLoggerConfigFromSettings,
  LogLevel
} from '../logger'

describe('前端日志系统', () => {
  // 保存原始的 console 方法
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error
  }

  beforeEach(() => {
    // Mock console 方法
    console.log = vi.fn()
    console.warn = vi.fn()
    console.error = vi.fn()

    // 重置配置为默认值
    configureLogger({
      enabled: true,
      level: LogLevel.INFO,
      showTimestamp: true
    })
  })

  afterEach(() => {
    // 恢复原始的 console 方法
    console.log = originalConsole.log
    console.warn = originalConsole.warn
    console.error = originalConsole.error
  })

  describe('日志级别过滤', () => {
    it('INFO级别应该输出INFO、WARN、ERROR，但不输出DEBUG', () => {
      configureLogger({ level: LogLevel.INFO })
      const logger = createLogger('Test')

      logger.debug('debug message')
      logger.info('info message')
      logger.warn('warn message')
      logger.error('error message')

      // DEBUG 不应该被输出
      expect(console.log).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('[DEBUG]'),
        expect.anything(),
        'debug message'
      )

      // INFO 应该被输出
      expect(console.log).toHaveBeenCalledWith(
        expect.anything(),
        '[INFO]',
        '[Test]',
        'info message'
      )

      // WARN 应该被输出
      expect(console.warn).toHaveBeenCalledWith(
        expect.anything(),
        '[WARN]',
        '[Test]',
        'warn message'
      )

      // ERROR 应该被输出
      expect(console.error).toHaveBeenCalledWith(
        expect.anything(),
        '[ERROR]',
        '[Test]',
        'error message'
      )
    })

    it('DEBUG级别应该输出所有级别的日志', () => {
      configureLogger({ level: LogLevel.DEBUG })
      const logger = createLogger('Test')

      logger.debug('debug message')
      logger.info('info message')
      logger.warn('warn message')
      logger.error('error message')

      // 所有级别都应该被输出
      expect(console.log).toHaveBeenCalledWith(
        expect.anything(),
        '[DEBUG]',
        '[Test]',
        'debug message'
      )
      expect(console.log).toHaveBeenCalledWith(
        expect.anything(),
        '[INFO]',
        '[Test]',
        'info message'
      )
      expect(console.warn).toHaveBeenCalledWith(
        expect.anything(),
        '[WARN]',
        '[Test]',
        'warn message'
      )
      expect(console.error).toHaveBeenCalledWith(
        expect.anything(),
        '[ERROR]',
        '[Test]',
        'error message'
      )
    })

    it('ERROR级别应该只输出ERROR', () => {
      configureLogger({ level: LogLevel.ERROR })
      const logger = createLogger('Test')

      logger.debug('debug message')
      logger.info('info message')
      logger.warn('warn message')
      logger.error('error message')

      // 只有 ERROR 应该被输出
      expect(console.log).not.toHaveBeenCalled()
      expect(console.warn).not.toHaveBeenCalled()
      expect(console.error).toHaveBeenCalledWith(
        expect.anything(),
        '[ERROR]',
        '[Test]',
        'error message'
      )
    })

    it('WARN级别应该输出WARN和ERROR', () => {
      configureLogger({ level: LogLevel.WARN })
      const logger = createLogger('Test')

      logger.debug('debug message')
      logger.info('info message')
      logger.warn('warn message')
      logger.error('error message')

      // DEBUG 和 INFO 不应该被输出
      expect(console.log).not.toHaveBeenCalled()

      // WARN 和 ERROR 应该被输出
      expect(console.warn).toHaveBeenCalledWith(
        expect.anything(),
        '[WARN]',
        '[Test]',
        'warn message'
      )
      expect(console.error).toHaveBeenCalledWith(
        expect.anything(),
        '[ERROR]',
        '[Test]',
        'error message'
      )
    })
  })

  describe('日志格式', () => {
    it('应该包含时间戳、级别、前缀和消息', () => {
      configureLogger({ level: LogLevel.INFO, showTimestamp: true })
      const logger = createLogger('TestModule')

      logger.info('test message')

      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]$/),
        '[INFO]',
        '[TestModule]',
        'test message'
      )
    })

    it('禁用时间戳时不应该包含时间戳', () => {
      configureLogger({ level: LogLevel.INFO, showTimestamp: false })
      const logger = createLogger('TestModule')

      logger.info('test message')

      // 第一个参数应该是级别标签，而不是时间戳
      expect(console.log).toHaveBeenCalledWith(
        '[INFO]',
        '[TestModule]',
        'test message'
      )
    })

    it('应该支持多个参数', () => {
      configureLogger({ level: LogLevel.INFO })
      const logger = createLogger('Test')

      logger.info('message', { key: 'value' }, [1, 2, 3])

      expect(console.log).toHaveBeenCalledWith(
        expect.anything(),
        '[INFO]',
        '[Test]',
        'message',
        { key: 'value' },
        [1, 2, 3]
      )
    })
  })

  describe('配置管理', () => {
    it('应该能够获取当前配置', () => {
      configureLogger({
        enabled: true,
        level: LogLevel.DEBUG,
        showTimestamp: false
      })

      const config = getLoggerConfig()

      expect(config).toEqual({
        enabled: true,
        level: LogLevel.DEBUG,
        showTimestamp: false
      })
    })

    it('应该能够部分更新配置', () => {
      configureLogger({ level: LogLevel.INFO })
      configureLogger({ showTimestamp: false })

      const config = getLoggerConfig()

      expect(config.level).toBe(LogLevel.INFO)
      expect(config.showTimestamp).toBe(false)
      expect(config.enabled).toBe(true)
    })

    it('禁用日志时不应该输出任何日志', () => {
      configureLogger({ enabled: false, level: LogLevel.DEBUG })
      const logger = createLogger('Test')

      logger.debug('debug')
      logger.info('info')
      logger.warn('warn')
      logger.error('error')

      expect(console.log).not.toHaveBeenCalled()
      expect(console.warn).not.toHaveBeenCalled()
      expect(console.error).not.toHaveBeenCalled()
    })
  })

  describe('调试模式', () => {
    it('启用调试模式应该设置日志级别为DEBUG', () => {
      enableDebugMode()

      const config = getLoggerConfig()
      expect(config.level).toBe(LogLevel.DEBUG)
    })

    it('禁用调试模式应该设置日志级别为INFO', () => {
      enableDebugMode()
      disableDebugMode()

      const config = getLoggerConfig()
      expect(config.level).toBe(LogLevel.INFO)
    })
  })

  describe('从后端加载配置', () => {
    beforeEach(() => {
      // 清理 window 对象
      delete (window as any).pywebview
      // 重置 location.port
      Object.defineProperty(window, 'location', {
        value: { port: '' },
        writable: true
      })
    })

    it('开发环境应该跳过加载配置', async () => {
      // 模拟开发环境
      Object.defineProperty(window, 'location', {
        value: { port: '5173' },
        writable: true
      })

      await loadLoggerConfigFromSettings()

      // 应该使用默认配置
      const config = getLoggerConfig()
      expect(config.level).toBe(LogLevel.INFO)
    })

    it('pywebview不可用时应该使用默认配置', async () => {
      // 不设置 pywebview
      Object.defineProperty(window, 'location', {
        value: { port: '' },
        writable: true
      })

      await loadLoggerConfigFromSettings()

      // 应该使用默认配置
      const config = getLoggerConfig()
      expect(config.level).toBe(LogLevel.INFO)
    })

    it('应该从后端加载DEBUG级别配置', async () => {
      // 模拟 pywebview API
      Object.defineProperty(window, 'location', {
        value: { port: '' },
        writable: true
      })
      ;(window as any).pywebview = {
        api: {
          get_settings: vi.fn().mockResolvedValue({
            success: true,
            settings: {
              logging: {
                level: 'DEBUG'
              }
            }
          })
        }
      }

      await loadLoggerConfigFromSettings()

      const config = getLoggerConfig()
      expect(config.level).toBe(LogLevel.DEBUG)
    })

    it('应该从后端加载WARNING级别配置', async () => {
      Object.defineProperty(window, 'location', {
        value: { port: '' },
        writable: true
      })
      ;(window as any).pywebview = {
        api: {
          get_settings: vi.fn().mockResolvedValue({
            success: true,
            settings: {
              logging: {
                level: 'WARNING'
              }
            }
          })
        }
      }

      await loadLoggerConfigFromSettings()

      const config = getLoggerConfig()
      expect(config.level).toBe(LogLevel.WARN)
    })

    it('应该从后端加载ERROR级别配置', async () => {
      Object.defineProperty(window, 'location', {
        value: { port: '' },
        writable: true
      })
      ;(window as any).pywebview = {
        api: {
          get_settings: vi.fn().mockResolvedValue({
            success: true,
            settings: {
              logging: {
                level: 'ERROR'
              }
            }
          })
        }
      }

      await loadLoggerConfigFromSettings()

      const config = getLoggerConfig()
      expect(config.level).toBe(LogLevel.ERROR)
    })

    it('后端返回失败时应该使用默认配置', async () => {
      Object.defineProperty(window, 'location', {
        value: { port: '' },
        writable: true
      })
      ;(window as any).pywebview = {
        api: {
          get_settings: vi.fn().mockResolvedValue({
            success: false
          })
        }
      }

      await loadLoggerConfigFromSettings()

      const config = getLoggerConfig()
      expect(config.level).toBe(LogLevel.INFO)
    })

    it('后端API调用失败时应该使用默认配置', async () => {
      Object.defineProperty(window, 'location', {
        value: { port: '' },
        writable: true
      })
      ;(window as any).pywebview = {
        api: {
          get_settings: vi.fn().mockRejectedValue(new Error('API调用失败'))
        }
      }

      await loadLoggerConfigFromSettings()

      const config = getLoggerConfig()
      expect(config.level).toBe(LogLevel.INFO)
    })

    it('无效的日志级别应该使用默认INFO级别', async () => {
      Object.defineProperty(window, 'location', {
        value: { port: '' },
        writable: true
      })
      ;(window as any).pywebview = {
        api: {
          get_settings: vi.fn().mockResolvedValue({
            success: true,
            settings: {
              logging: {
                level: 'INVALID_LEVEL'
              }
            }
          })
        }
      }

      await loadLoggerConfigFromSettings()

      const config = getLoggerConfig()
      expect(config.level).toBe(LogLevel.INFO)
    })
  })

  describe('多个日志器实例', () => {
    it('不同前缀的日志器应该独立工作', () => {
      const logger1 = createLogger('Module1')
      const logger2 = createLogger('Module2')

      logger1.info('message from module1')
      logger2.info('message from module2')

      expect(console.log).toHaveBeenCalledWith(
        expect.anything(),
        '[INFO]',
        '[Module1]',
        'message from module1'
      )
      expect(console.log).toHaveBeenCalledWith(
        expect.anything(),
        '[INFO]',
        '[Module2]',
        'message from module2'
      )
    })

    it('所有日志器应该共享相同的配置', () => {
      const logger1 = createLogger('Module1')
      const logger2 = createLogger('Module2')

      configureLogger({ level: LogLevel.ERROR })

      logger1.info('should not appear')
      logger2.info('should not appear')
      logger1.error('should appear')
      logger2.error('should appear')

      expect(console.log).not.toHaveBeenCalled()
      expect(console.error).toHaveBeenCalledTimes(2)
    })
  })
})
