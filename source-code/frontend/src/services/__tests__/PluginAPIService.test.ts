/**
 * PluginAPIService 单元测试
 * 
 * 测试所有 API 方法的正常调用、错误处理逻辑和重试机制
 * 验证需求: 14.1, 14.3, 14.4
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  PluginAPIService,
  handleAPIError,
  retryOperation,
  logError,
  APIErrorType,
  type APIError,
} from '../PluginAPIService'
import type {
  PluginsResponse,
  DependenciesResponse,
  UpdateInfoResponse,
  BranchesResponse,
  BatchUpdateResponse,
  ConflictsResponse,
  PluginUpdateResponse,
  DependencyInstallResponse,
  ApiResponse,
} from '../../types/plugin'

// Mock pywebview API
const mockPywebviewAPI = {
  get_plugins: vi.fn(),
  search_plugins: vi.fn(),
  refresh_plugins: vi.fn(),
  get_plugin_dependencies: vi.fn(),
  install_dependency: vi.fn(),
  update_plugin: vi.fn(),
  update_all_plugins: vi.fn(),
  get_update_info: vi.fn(),
  switch_plugin_branch: vi.fn(),
  get_plugin_branches: vi.fn(),
  uninstall_plugin: vi.fn(),
  open_plugin_folder: vi.fn(),
  detect_plugin_conflicts: vi.fn(),
}

// 设置全局 window.pywebview
beforeEach(() => {
  // @ts-expect-error - 测试环境需要模拟全局对象
  global.window = {
    pywebview: {
      api: mockPywebviewAPI,
    },
  }
  
  // 清除所有 mock
  vi.clearAllMocks()
  
  // Mock console.error 和 console.warn
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PluginAPIService', () => {
  let service: PluginAPIService

  beforeEach(() => {
    service = new PluginAPIService()
  })

  describe('getPlugins', () => {
    it('应该成功获取插件列表（使用缓存）', async () => {
      const mockResponse: PluginsResponse = {
        success: true,
        plugins: [
          {
            name: 'test-plugin',
            path: '/path/to/plugin',
            is_git_repo: true,
            git_url: 'https://github.com/test/plugin',
            branch: 'main',
            default_branch: 'main',
            commit_hash: 'abc1234',
            commit_date: '2024-01-01T00:00:00Z',
            has_update: false,
            behind_commits: 0,
            dependency_updated: false,
            dependency_viewed: true,
          },
        ],
        from_cache: true,
      }

      mockPywebviewAPI.get_plugins.mockResolvedValue(mockResponse)

      const result = await service.getPlugins(true)

      expect(mockPywebviewAPI.get_plugins).toHaveBeenCalledWith(true)
      expect(result).toEqual(mockResponse)
      expect(result.success).toBe(true)
      expect(result.plugins).toHaveLength(1)
      expect(result.from_cache).toBe(true)
    })

    it('应该成功获取插件列表（不使用缓存）', async () => {
      const mockResponse: PluginsResponse = {
        success: true,
        plugins: [],
        from_cache: false,
      }

      mockPywebviewAPI.get_plugins.mockResolvedValue(mockResponse)

      const result = await service.getPlugins(false)

      expect(mockPywebviewAPI.get_plugins).toHaveBeenCalledWith(false)
      expect(result.from_cache).toBe(false)
    })

    it('应该处理 API 返回的错误', async () => {
      const mockResponse: PluginsResponse = {
        success: false,
        error: '获取插件列表失败',
      }

      mockPywebviewAPI.get_plugins.mockResolvedValue(mockResponse)

      const result = await service.getPlugins()

      expect(result.success).toBe(false)
      expect(result.error).toBe('获取插件列表失败')
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('searchPlugins', () => {
    it('应该成功搜索插件', async () => {
      const mockResponse: PluginsResponse = {
        success: true,
        plugins: [
          {
            name: 'manager-plugin',
            path: '/path/to/manager',
            is_git_repo: true,
            git_url: null,
            branch: null,
            default_branch: null,
            commit_hash: null,
            commit_date: null,
            has_update: false,
            behind_commits: 0,
            dependency_updated: false,
            dependency_viewed: true,
          },
        ],
      }

      mockPywebviewAPI.search_plugins.mockResolvedValue(mockResponse)

      const result = await service.searchPlugins('manager')

      expect(mockPywebviewAPI.search_plugins).toHaveBeenCalledWith('manager')
      expect(result.success).toBe(true)
      expect(result.plugins).toHaveLength(1)
      expect(result.plugins![0].name).toBe('manager-plugin')
    })

    it('应该处理搜索错误', async () => {
      mockPywebviewAPI.search_plugins.mockRejectedValue(new Error('搜索失败'))

      await expect(service.searchPlugins('test')).rejects.toThrow()
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('refreshPlugins', () => {
    it('应该成功刷新插件列表', async () => {
      const mockResponse: PluginsResponse = {
        success: true,
        plugins: [],
      }

      mockPywebviewAPI.refresh_plugins.mockResolvedValue(mockResponse)

      const result = await service.refreshPlugins()

      expect(mockPywebviewAPI.refresh_plugins).toHaveBeenCalled()
      expect(result.success).toBe(true)
    })
  })

  describe('getPluginDependencies', () => {
    it('应该成功获取插件依赖', async () => {
      const mockResponse: DependenciesResponse = {
        success: true,
        dependencies: [
          {
            package: 'numpy',
            version: '>=1.20.0',
            installed: true,
            installed_version: '1.21.0',
            version_match: true,
            message: '已安装',
          },
        ],
      }

      mockPywebviewAPI.get_plugin_dependencies.mockResolvedValue(mockResponse)

      const result = await service.getPluginDependencies('test-plugin')

      expect(mockPywebviewAPI.get_plugin_dependencies).toHaveBeenCalledWith('test-plugin')
      expect(result.success).toBe(true)
      expect(result.dependencies).toHaveLength(1)
      expect(result.dependencies![0].package).toBe('numpy')
    })

    it('应该处理获取依赖错误', async () => {
      mockPywebviewAPI.get_plugin_dependencies.mockRejectedValue(
        new Error('插件不存在')
      )

      await expect(service.getPluginDependencies('invalid-plugin')).rejects.toThrow()
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('installDependency', () => {
    it('应该成功安装依赖', async () => {
      const mockResponse: DependencyInstallResponse = {
        success: true,
        installed: true,
        installed_version: '1.21.0',
        message: '安装成功',
      }

      mockPywebviewAPI.install_dependency.mockResolvedValue(mockResponse)

      const result = await service.installDependency('test-plugin', 'numpy', '>=1.20.0')

      expect(mockPywebviewAPI.install_dependency).toHaveBeenCalledWith(
        'test-plugin',
        'numpy',
        '>=1.20.0'
      )
      expect(result.success).toBe(true)
      expect(result.installed).toBe(true)
      expect(result.installed_version).toBe('1.21.0')
    })

    it('应该处理安装失败', async () => {
      const mockResponse: DependencyInstallResponse = {
        success: false,
        error: '安装失败：权限不足',
      }

      mockPywebviewAPI.install_dependency.mockResolvedValue(mockResponse)

      const result = await service.installDependency('test-plugin', 'numpy', '>=1.20.0')

      expect(result.success).toBe(false)
      expect(result.error).toContain('权限不足')
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('updatePlugin', () => {
    it('应该成功更新插件', async () => {
      const mockResponse: PluginUpdateResponse = {
        success: true,
        dependency_changed: false,
        message: '更新成功',
      }

      mockPywebviewAPI.update_plugin.mockResolvedValue(mockResponse)

      const result = await service.updatePlugin('test-plugin')

      expect(mockPywebviewAPI.update_plugin).toHaveBeenCalledWith('test-plugin', false)
      expect(result.success).toBe(true)
      expect(result.dependency_changed).toBe(false)
    })

    it('应该处理依赖变化', async () => {
      const mockResponse: PluginUpdateResponse = {
        success: true,
        dependency_changed: true,
        new_dependencies: [
          {
            package: 'pandas',
            version: '>=1.0.0',
            installed: false,
            installed_version: null,
            version_match: false,
            message: '未安装',
          },
        ],
        message: '更新成功，依赖已变化',
      }

      mockPywebviewAPI.update_plugin.mockResolvedValue(mockResponse)

      const result = await service.updatePlugin('test-plugin')

      expect(result.success).toBe(true)
      expect(result.dependency_changed).toBe(true)
      expect(result.new_dependencies).toHaveLength(1)
    })
  })

  describe('updateAllPlugins', () => {
    it('应该成功批量更新插件', async () => {
      const mockResponse: BatchUpdateResponse = {
        success: true,
        results: [
          {
            plugin_name: 'plugin1',
            success: true,
            message: '更新成功',
            dependency_changed: false,
            dependencies_installed: 0,
          },
          {
            plugin_name: 'plugin2',
            success: true,
            message: '更新成功',
            dependency_changed: false,
            dependencies_installed: 0,
          },
        ],
        summary: {
          total: 2,
          success: 2,
          failed: 0,
          dependencies_installed: 0,
        },
      }

      mockPywebviewAPI.update_all_plugins.mockResolvedValue(mockResponse)

      const result = await service.updateAllPlugins()

      expect(mockPywebviewAPI.update_all_plugins).toHaveBeenCalledWith(undefined, undefined)
      expect(result.success).toBe(true)
      expect(result.summary?.total).toBe(2)
      expect(result.summary?.success).toBe(2)
    })

    it('应该使用自定义并发数', async () => {
      const mockResponse: BatchUpdateResponse = {
        success: true,
        results: [],
        summary: { total: 0, success: 0, failed: 0, dependencies_installed: 0 },
      }

      mockPywebviewAPI.update_all_plugins.mockResolvedValue(mockResponse)

      await service.updateAllPlugins('/usr/bin/python3', 5)

      expect(mockPywebviewAPI.update_all_plugins).toHaveBeenCalledWith(
        '/usr/bin/python3',
        5
      )
    })

    it('应该处理部分失败的情况', async () => {
      const mockResponse: BatchUpdateResponse = {
        success: true,
        results: [
          {
            plugin_name: 'plugin1',
            success: true,
            message: '更新成功',
            dependency_changed: false,
            dependencies_installed: 0,
          },
          {
            plugin_name: 'plugin2',
            success: false,
            message: '更新失败',
            error: 'Git 冲突',
            dependency_changed: false,
            dependencies_installed: 0,
          },
        ],
        summary: {
          total: 2,
          success: 1,
          failed: 1,
          dependencies_installed: 0,
        },
      }

      mockPywebviewAPI.update_all_plugins.mockResolvedValue(mockResponse)

      const result = await service.updateAllPlugins()

      expect(result.success).toBe(true)
      expect(result.summary?.success).toBe(1)
      expect(result.summary?.failed).toBe(1)
    })
  })

  describe('getUpdateInfo', () => {
    it('应该成功获取更新信息', async () => {
      const mockResponse: UpdateInfoResponse = {
        success: true,
        commits: [
          {
            hash: 'abc1234',
            message: 'Fix bug',
            date: '2024-01-01T00:00:00Z',
          },
          {
            hash: 'def5678',
            message: 'Add feature',
            date: '2024-01-02T00:00:00Z',
          },
        ],
      }

      mockPywebviewAPI.get_update_info.mockResolvedValue(mockResponse)

      const result = await service.getUpdateInfo('test-plugin')

      expect(mockPywebviewAPI.get_update_info).toHaveBeenCalledWith('test-plugin')
      expect(result.success).toBe(true)
      expect(result.commits).toHaveLength(2)
    })
  })

  describe('switchBranch', () => {
    it('应该成功切换分支', async () => {
      const mockResponse: ApiResponse = {
        success: true,
        message: '切换成功',
      }

      mockPywebviewAPI.switch_plugin_branch.mockResolvedValue(mockResponse)

      const result = await service.switchBranch('test-plugin', 'dev')

      expect(mockPywebviewAPI.switch_plugin_branch).toHaveBeenCalledWith(
        'test-plugin',
        'dev'
      )
      expect(result.success).toBe(true)
    })

    it('应该处理切换失败', async () => {
      const mockResponse: ApiResponse = {
        success: false,
        error: '分支不存在',
      }

      mockPywebviewAPI.switch_plugin_branch.mockResolvedValue(mockResponse)

      const result = await service.switchBranch('test-plugin', 'invalid')

      expect(result.success).toBe(false)
      expect(result.error).toBe('分支不存在')
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('getBranches', () => {
    it('应该成功获取分支列表', async () => {
      const mockResponse: BranchesResponse = {
        success: true,
        branches: [
          { name: 'main', is_current: true, is_default: true },
          { name: 'dev', is_current: false, is_default: false },
        ],
      }

      mockPywebviewAPI.get_plugin_branches.mockResolvedValue(mockResponse)

      const result = await service.getBranches('test-plugin')

      expect(mockPywebviewAPI.get_plugin_branches).toHaveBeenCalledWith('test-plugin')
      expect(result.success).toBe(true)
      expect(result.branches).toHaveLength(2)
    })
  })

  describe('uninstallPlugin', () => {
    it('应该成功卸载插件', async () => {
      const mockResponse: ApiResponse = {
        success: true,
        message: '卸载成功',
      }

      mockPywebviewAPI.uninstall_plugin.mockResolvedValue(mockResponse)

      const result = await service.uninstallPlugin('test-plugin')

      expect(mockPywebviewAPI.uninstall_plugin).toHaveBeenCalledWith('test-plugin')
      expect(result.success).toBe(true)
    })

    it('应该处理卸载失败', async () => {
      mockPywebviewAPI.uninstall_plugin.mockRejectedValue(
        new Error('permission denied')
      )

      await expect(service.uninstallPlugin('test-plugin')).rejects.toThrow()
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('openPluginFolder', () => {
    it('应该成功打开插件文件夹', async () => {
      const mockResponse: ApiResponse = {
        success: true,
        message: '已打开',
      }

      mockPywebviewAPI.open_plugin_folder.mockResolvedValue(mockResponse)

      const result = await service.openPluginFolder('test-plugin')

      expect(mockPywebviewAPI.open_plugin_folder).toHaveBeenCalledWith('test-plugin')
      expect(result.success).toBe(true)
    })
  })

  describe('detectPluginConflicts', () => {
    it('应该成功检测依赖冲突', async () => {
      const mockResponse: ConflictsResponse = {
        success: true,
        conflicts: [
          {
            package: 'numpy',
            required_versions: ['>=1.20.0', '>=1.21.0'],
            plugins: ['plugin1', 'plugin2'],
            severity: 'medium',
            message: '版本要求不一致',
          },
        ],
      }

      mockPywebviewAPI.detect_plugin_conflicts.mockResolvedValue(mockResponse)

      const result = await service.detectPluginConflicts()

      expect(mockPywebviewAPI.detect_plugin_conflicts).toHaveBeenCalled()
      expect(result.success).toBe(true)
      expect(result.conflicts).toHaveLength(1)
    })

    it('应该处理无冲突的情况', async () => {
      const mockResponse: ConflictsResponse = {
        success: true,
        conflicts: [],
      }

      mockPywebviewAPI.detect_plugin_conflicts.mockResolvedValue(mockResponse)

      const result = await service.detectPluginConflicts()

      expect(result.success).toBe(true)
      expect(result.conflicts).toHaveLength(0)
    })
  })
})

describe('handleAPIError', () => {
  it('应该识别超时错误', () => {
    const error = { message: 'request timeout' }
    const result = handleAPIError(error, '测试操作')

    expect(result.type).toBe(APIErrorType.TIMEOUT)
    expect(result.message).toContain('超时')
    expect(result.originalError).toBe(error)
  })

  it('应该识别权限错误', () => {
    const error = { error: 'permission denied' }
    const result = handleAPIError(error, '测试操作')

    expect(result.type).toBe(APIErrorType.PERMISSION)
    expect(result.message).toContain('权限不足')
  })

  it('应该识别资源不存在错误', () => {
    const error = { message: 'file not found' }
    const result = handleAPIError(error, '测试操作')

    expect(result.type).toBe(APIErrorType.NOT_FOUND)
    expect(result.message).toContain('不存在')
  })

  it('应该识别网络错误', () => {
    const error = { message: 'network connection failed' }
    const result = handleAPIError(error, '测试操作')

    expect(result.type).toBe(APIErrorType.NETWORK)
    expect(result.message).toContain('网络连接失败')
  })

  it('应该处理未知错误', () => {
    const error = { message: 'unknown error' }
    const result = handleAPIError(error, '测试操作')

    expect(result.type).toBe(APIErrorType.UNKNOWN)
    expect(result.message).toContain('测试操作失败')
    expect(result.message).toContain('unknown error')
  })

  it('应该处理没有消息的错误', () => {
    const error = {}
    const result = handleAPIError(error, '测试操作')

    expect(result.type).toBe(APIErrorType.UNKNOWN)
    expect(result.message).toContain('测试操作失败')
  })

  it('应该处理中文错误消息', () => {
    const error = { error: '操作超时，请重试' }
    const result = handleAPIError(error, '测试操作')

    expect(result.type).toBe(APIErrorType.TIMEOUT)
    expect(result.message).toContain('超时')
  })
})

describe('retryOperation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('应该在第一次尝试成功时不重试', async () => {
    const operation = vi.fn().mockResolvedValue('success')

    const promise = retryOperation(operation)
    await vi.runAllTimersAsync()
    const result = await promise

    expect(operation).toHaveBeenCalledTimes(1)
    expect(result).toBe('success')
  })

  it('应该在网络错误时重试', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce({ message: 'network error' })
      .mockRejectedValueOnce({ message: 'network error' })
      .mockResolvedValueOnce('success')

    const promise = retryOperation(operation, { maxRetries: 3 })
    await vi.runAllTimersAsync()
    const result = await promise

    expect(operation).toHaveBeenCalledTimes(3)
    expect(result).toBe('success')
  })

  it('应该在超时错误时重试', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce({ message: 'timeout' })
      .mockResolvedValueOnce('success')

    const promise = retryOperation(operation, { maxRetries: 2 })
    await vi.runAllTimersAsync()
    const result = await promise

    expect(operation).toHaveBeenCalledTimes(2)
    expect(result).toBe('success')
  })

  it('应该在达到最大重试次数后抛出错误', async () => {
    const error = { message: 'network error' }
    const operation = vi.fn().mockRejectedValue(error)

    const promise = retryOperation(operation, { maxRetries: 3 })
    
    // 等待所有定时器执行完成
    await vi.runAllTimersAsync()

    // 使用 rejects 来正确处理 Promise rejection
    await expect(promise).rejects.toEqual(error)
    expect(operation).toHaveBeenCalledTimes(3)
  })

  it('应该在非可重试错误时立即抛出', async () => {
    const error = { message: 'permission denied' }
    const operation = vi.fn().mockRejectedValue(error)

    const promise = retryOperation(operation, {
      maxRetries: 3,
      retryableErrors: [APIErrorType.NETWORK],
    })
    
    // 等待所有定时器执行完成
    await vi.runAllTimersAsync()

    // 使用 rejects 来正确处理 Promise rejection
    await expect(promise).rejects.toEqual(error)
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('应该使用指数退避策略', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce({ message: 'network error' })
      .mockRejectedValueOnce({ message: 'network error' })
      .mockResolvedValueOnce('success')

    const promise = retryOperation(operation, {
      maxRetries: 3,
      initialDelay: 1000,
      exponentialBackoff: true,
    })

    // 第一次失败，等待 1000ms
    await vi.advanceTimersByTimeAsync(1000)
    expect(operation).toHaveBeenCalledTimes(2)

    // 第二次失败，等待 2000ms
    await vi.advanceTimersByTimeAsync(2000)
    expect(operation).toHaveBeenCalledTimes(3)

    const result = await promise
    expect(result).toBe('success')
  })

  it('应该使用固定延迟策略', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce({ message: 'network error' })
      .mockRejectedValueOnce({ message: 'network error' })
      .mockResolvedValueOnce('success')

    const promise = retryOperation(operation, {
      maxRetries: 3,
      initialDelay: 1000,
      exponentialBackoff: false,
    })

    // 第一次失败，等待 1000ms
    await vi.advanceTimersByTimeAsync(1000)
    expect(operation).toHaveBeenCalledTimes(2)

    // 第二次失败，等待 1000ms
    await vi.advanceTimersByTimeAsync(1000)
    expect(operation).toHaveBeenCalledTimes(3)

    const result = await promise
    expect(result).toBe('success')
  })

  it('应该记录重试日志', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce({ message: 'network error' })
      .mockResolvedValueOnce('success')

    const promise = retryOperation(operation, { maxRetries: 2 })
    await vi.runAllTimersAsync()
    await promise

    expect(console.warn).toHaveBeenCalled()
  })
})

describe('logError', () => {
  it('应该记录错误日志', () => {
    const error = new Error('测试错误')
    const context = { pluginName: 'test-plugin' }

    logError('测试操作', error, context)

    expect(console.error).toHaveBeenCalledWith(
      '[PluginAPIService Error]',
      expect.objectContaining({
        timestamp: expect.any(String),
        operation: '测试操作',
        error: '测试错误',
        context,
      })
    )
  })

  it('应该处理没有消息的错误', () => {
    const error = {}
    logError('测试操作', error)

    expect(console.error).toHaveBeenCalledWith(
      '[PluginAPIService Error]',
      expect.objectContaining({
        operation: '测试操作',
        error: {},
      })
    )
  })

  it('应该处理没有上下文的情况', () => {
    const error = new Error('测试错误')
    logError('测试操作', error)

    expect(console.error).toHaveBeenCalledWith(
      '[PluginAPIService Error]',
      expect.objectContaining({
        operation: '测试操作',
        error: '测试错误',
        context: undefined,
      })
    )
  })
})
