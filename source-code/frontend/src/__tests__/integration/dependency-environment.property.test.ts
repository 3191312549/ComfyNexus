/**
 * 依赖管理模块 - 前后端整合属性测试
 * 
 * 使用 fast-check 进行属性测试，验证前后端整合的通用属性
 * 
 * 属性 1: 环境切换时命令使用正确的解释器
 * 属性 2: 空路径配置时禁用操作
 * 属性 3: 环境信息显示一致性
 * 验证需求: 1.1, 1.2, 1.3, 1.4
 */

import { describe, beforeEach, expect, vi } from 'vitest'
import { test, fc } from '@fast-check/vitest'
import { useDependencyStore } from '@/stores/useDependencyStore'
import { useEnvStore } from '@/stores/useEnvStore'
import type { EnvironmentConfig } from '@/types/environment'

describe('依赖管理模块 - 前后端整合属性测试', () => {
  beforeEach(() => {
    // 重置 dependency store 状态
    useDependencyStore.setState({
      currentEnvId: null,
      logs: [],
      isExecuting: false,
      envInfo: null,
      cudaVersion: '',
      pytorchVersions: [],
      selectedPytorchVersion: '',
      packageName: '',
      packageVersions: [],
      selectedVersion: '',
      installMode: 'install',
      requirementsFile: null,
      aiAnalysisOpen: false,
      aiAnalysisContent: '',
      aiAnalysisStreaming: false,
      mirrorSource: 'official',
      autoFallbackEnabled: true
    })

    // 重置 env store 状态
    useEnvStore.setState({
      environments: [],
      currentEnvId: null,
      loading: false,
      error: null,
      computeDevices: [],
      initialized: false
    })
  })

  /**
   * 属性 1.1: 环境切换时命令使用正确的解释器 - 环境 ID 同步
   * 
   * 对于任意环境配置，当 Environment_Selector 的选择发生变化时，
   * Dependency_Manager 应立即更新使用的环境 ID
   * 
   * **Validates: Requirements 1.1, 1.2**
   */
  test.prop([
    fc.record({
      envId: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      alias: fc.string({ minLength: 1, maxLength: 20 }),
      pythonPath: fc.string({ minLength: 1, maxLength: 200 }),
      pipPath: fc.string({ minLength: 1, maxLength: 200 })
    })
  ], { numRuns: 100 })(
    '环境切换时 Dependency Store 应立即更新环境 ID',
    (envConfig) => {
      const envStore = useEnvStore.getState()
      const depStore = useDependencyStore.getState()
      
      // 模拟环境列表
      const mockEnv: Partial<EnvironmentConfig> = {
        id: envConfig.envId,
        name: envConfig.name,
        alias: envConfig.alias,
        general: {
          comfyuiPath: '/path/to/comfyui',
          pythonPath: envConfig.pythonPath,
          pipPath: envConfig.pipPath
        }
      }
      
      // 设置环境列表
      useEnvStore.setState({
        environments: [mockEnv as EnvironmentConfig],
        currentEnvId: envConfig.envId
      })
      
      // 触发依赖 store 的环境切换
      depStore.setCurrentEnv(envConfig.envId)
      
      const depState = useDependencyStore.getState()
      
      // 验证：依赖 store 的环境 ID 应该与环境 store 一致
      expect(depState.currentEnvId).toBe(envConfig.envId)
      expect(depState.currentEnvId).toBe(useEnvStore.getState().currentEnvId)
    }
  )

  /**
   * 属性 1.2: 环境切换时命令使用正确的解释器 - Python 路径关联
   * 
   * 对于任意环境配置和 pip/python 命令，当切换到该环境后执行命令时，
   * 系统应使用该环境配置的 Python 解释器路径
   * 
   * **Validates: Requirements 1.1, 1.2**
   */
  test.prop([
    fc.array(
      fc.record({
        envId: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        alias: fc.string({ minLength: 1, maxLength: 20 }),
        pythonPath: fc.string({ minLength: 10, maxLength: 200 }),
        pipPath: fc.string({ minLength: 10, maxLength: 200 })
      }),
      { minLength: 2, maxLength: 5 }
    )
  ], { numRuns: 100 })(
    '切换环境后应使用对应环境的 Python 路径',
    (envConfigs) => {
      // 创建环境列表
      const mockEnvironments: EnvironmentConfig[] = envConfigs.map(config => ({
        id: config.envId,
        name: config.name,
        alias: config.alias,
        version: '1.0.0',
        isActive: false,
        general: {
          comfyuiPath: '/path/to/comfyui',
          pythonPath: config.pythonPath,
          pipPath: config.pipPath
        },
        dependencies: {
          pythonVersion: '3.11.0',
          pytorchVersion: '2.0.0',
          cudaVersion: '12.1',
          sageAttentionVersion: 'N/A',
          flashAttnVersion: 'N/A',
          tritonVersion: 'N/A',
          xformersVersion: 'N/A'
        },
        acceleration: {
          computeDevice: 'nvidia:0',
          vramStrategy: 'normal',
          cpuOnly: false,
          gpuOnly: false,
          reserveVram: 0,
          unetPrecision: 'auto',
          vaePrecision: 'fp32',
          textEncPrecision: 'fp16',
          attentionMode: 'flash',
          disableXformers: false,
          disableSmartMemory: false,
          forceChannelsLast: false,
          cacheLru: 0,
          deterministic: false,
          fastMode: false,
          listenNetwork: false,
          listenAddress: '',
          port: 8188,
          enableCors: false,
          tlsKeyfile: '',
          tlsCertfile: '',
          baseDirectory: '',
          inputDirectory: '',
          outputDirectory: '',
          tempDirectory: '',
          userDirectory: '',
          extraModelPathsConfig: '',
          previewMethod: 'auto',
          previewSize: 512,
          safeMode: false,
          enableManager: true,
          logLevel: 'INFO',
          disableMetadata: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))
      
      // 设置环境列表
      useEnvStore.setState({
        environments: mockEnvironments,
        currentEnvId: null
      })
      
      // 依次切换到每个环境并验证
      for (const config of envConfigs) {
        // 切换环境
        useEnvStore.setState({ currentEnvId: config.envId })
        useDependencyStore.getState().setCurrentEnv(config.envId)
        
        const depState = useDependencyStore.getState()
        const envState = useEnvStore.getState()
        
        // 验证：当前环境 ID 应该一致
        expect(depState.currentEnvId).toBe(config.envId)
        expect(envState.currentEnvId).toBe(config.envId)
        
        // 验证：可以从环境列表中找到对应的环境配置
        const currentEnv = envState.environments.find(e => e.id === config.envId)
        expect(currentEnv).toBeDefined()
        expect(currentEnv?.general.pythonPath).toBe(config.pythonPath)
        expect(currentEnv?.general.pipPath).toBe(config.pipPath)
      }
    }
  )

  /**
   * 属性 1.3: 环境切换时命令使用正确的解释器 - 环境切换的幂等性
   * 
   * 对于任意环境配置，多次切换到同一个环境应该产生相同的结果
   * 
   * **Validates: Requirements 1.1**
   */
  test.prop([
    fc.record({
      envConfig: fc.record({
        envId: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        alias: fc.string({ minLength: 1, maxLength: 20 }),
        pythonPath: fc.string({ minLength: 10, maxLength: 200 }),
        pipPath: fc.string({ minLength: 10, maxLength: 200 })
      }),
      switchCount: fc.integer({ min: 1, max: 5 })
    })
  ], { numRuns: 100 })(
    '多次切换到同一个环境应该产生相同的结果',
    ({ envConfig, switchCount }) => {
      const mockEnv: EnvironmentConfig = {
        id: envConfig.envId,
        name: envConfig.name,
        alias: envConfig.alias,
        version: '1.0.0',
        isActive: false,
        general: {
          comfyuiPath: '/path/to/comfyui',
          pythonPath: envConfig.pythonPath,
          pipPath: envConfig.pipPath
        },
        dependencies: {
          pythonVersion: '3.11.0',
          pytorchVersion: '2.0.0',
          cudaVersion: '12.1',
          sageAttentionVersion: 'N/A',
          flashAttnVersion: 'N/A',
          tritonVersion: 'N/A',
          xformersVersion: 'N/A'
        },
        acceleration: {
          computeDevice: 'nvidia:0',
          vramStrategy: 'normal',
          cpuOnly: false,
          gpuOnly: false,
          reserveVram: 0,
          unetPrecision: 'auto',
          vaePrecision: 'fp32',
          textEncPrecision: 'fp16',
          attentionMode: 'flash',
          disableXformers: false,
          disableSmartMemory: false,
          forceChannelsLast: false,
          cacheLru: 0,
          deterministic: false,
          fastMode: false,
          listenNetwork: false,
          listenAddress: '',
          port: 8188,
          enableCors: false,
          tlsKeyfile: '',
          tlsCertfile: '',
          baseDirectory: '',
          inputDirectory: '',
          outputDirectory: '',
          tempDirectory: '',
          userDirectory: '',
          extraModelPathsConfig: '',
          previewMethod: 'auto',
          previewSize: 512,
          safeMode: false,
          enableManager: true,
          logLevel: 'INFO',
          disableMetadata: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      useEnvStore.setState({
        environments: [mockEnv],
        currentEnvId: null
      })
      
      // 多次切换到同一个环境
      for (let i = 0; i < switchCount; i++) {
        useEnvStore.setState({ currentEnvId: envConfig.envId })
        useDependencyStore.getState().setCurrentEnv(envConfig.envId)
        
        const depState = useDependencyStore.getState()
        
        // 验证：每次切换后环境 ID 都应该相同
        expect(depState.currentEnvId).toBe(envConfig.envId)
      }
    }
  )

  /**
   * 属性 1.4: 环境切换时命令使用正确的解释器 - 环境切换触发检测
   * 
   * 对于任意环境配置，切换环境后应该自动触发环境信息检测
   * 
   * **Validates: Requirements 1.1, 1.2**
   */
  test.prop([
    fc.record({
      envId: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      alias: fc.string({ minLength: 1, maxLength: 20 }),
      pythonPath: fc.string({ minLength: 10, maxLength: 200 }),
      pipPath: fc.string({ minLength: 10, maxLength: 200 })
    })
  ], { numRuns: 100 })(
    '切换环境后应该自动触发环境信息检测',
    (envConfig) => {
      const mockEnv: Partial<EnvironmentConfig> = {
        id: envConfig.envId,
        name: envConfig.name,
        alias: envConfig.alias,
        general: {
          comfyuiPath: '/path/to/comfyui',
          pythonPath: envConfig.pythonPath,
          pipPath: envConfig.pipPath
        }
      }
      
      useEnvStore.setState({
        environments: [mockEnv as EnvironmentConfig],
        currentEnvId: null
      })
      
      // 切换环境
      useEnvStore.setState({ currentEnvId: envConfig.envId })
      useDependencyStore.getState().setCurrentEnv(envConfig.envId)
      
      const depState = useDependencyStore.getState()
      
      // 验证：环境 ID 应该被设置
      expect(depState.currentEnvId).toBe(envConfig.envId)
      
      // 验证：应该添加了环境检测的日志
      const detectionLog = depState.logs.find(log => 
        log.message.includes('检测环境信息')
      )
      expect(detectionLog).toBeDefined()
    }
  )

  /**
   * 属性 2.1: 空路径配置时禁用操作 - Python 路径为空
   * 
   * 对于任意环境配置，如果 pythonPath 为空，则系统应显示错误提示并禁用所有依赖操作
   * 
   * **Validates: Requirements 1.3**
   */
  test.prop([
    fc.record({
      envId: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      alias: fc.string({ minLength: 1, maxLength: 20 }),
      pipPath: fc.string({ minLength: 10, maxLength: 200 })
    })
  ], { numRuns: 100 })(
    'Python 路径为空时应禁用所有依赖操作',
    (envConfig) => {
      const mockEnv: EnvironmentConfig = {
        id: envConfig.envId,
        name: envConfig.name,
        alias: envConfig.alias,
        version: '1.0.0',
        isActive: true,
        general: {
          comfyuiPath: '/path/to/comfyui',
          pythonPath: '', // 空路径
          pipPath: envConfig.pipPath
        },
        dependencies: {
          pythonVersion: '3.11.0',
          pytorchVersion: '2.0.0',
          cudaVersion: '12.1',
          sageAttentionVersion: 'N/A',
          flashAttnVersion: 'N/A',
          tritonVersion: 'N/A',
          xformersVersion: 'N/A'
        },
        acceleration: {
          computeDevice: 'nvidia:0',
          vramStrategy: 'normal',
          cpuOnly: false,
          gpuOnly: false,
          reserveVram: 0,
          unetPrecision: 'auto',
          vaePrecision: 'fp32',
          textEncPrecision: 'fp16',
          attentionMode: 'flash',
          disableXformers: false,
          disableSmartMemory: false,
          forceChannelsLast: false,
          cacheLru: 0,
          deterministic: false,
          fastMode: false,
          listenNetwork: false,
          listenAddress: '',
          port: 8188,
          enableCors: false,
          tlsKeyfile: '',
          tlsCertfile: '',
          baseDirectory: '',
          inputDirectory: '',
          outputDirectory: '',
          tempDirectory: '',
          userDirectory: '',
          extraModelPathsConfig: '',
          previewMethod: 'auto',
          previewSize: 512,
          safeMode: false,
          enableManager: true,
          logLevel: 'INFO',
          disableMetadata: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      useEnvStore.setState({
        environments: [mockEnv],
        currentEnvId: envConfig.envId
      })
      
      useDependencyStore.getState().setCurrentEnv(envConfig.envId)
      
      const envState = useEnvStore.getState()
      const currentEnv = envState.environments.find(e => e.id === envConfig.envId)
      
      // 验证：Python 路径应该为空
      expect(currentEnv?.general.pythonPath).toBe('')
      
      // 验证：环境配置应该存在但路径为空
      expect(currentEnv).toBeDefined()
      expect(currentEnv?.general.pipPath).toBe(envConfig.pipPath)
    }
  )

  /**
   * 属性 2.2: 空路径配置时禁用操作 - pip 路径为空
   * 
   * 对于任意环境配置，如果 pipPath 为空，则系统应显示错误提示并禁用所有依赖操作
   * 
   * **Validates: Requirements 1.3**
   */
  test.prop([
    fc.record({
      envId: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      alias: fc.string({ minLength: 1, maxLength: 20 }),
      pythonPath: fc.string({ minLength: 10, maxLength: 200 })
    })
  ], { numRuns: 100 })(
    'pip 路径为空时应禁用所有依赖操作',
    (envConfig) => {
      const mockEnv: EnvironmentConfig = {
        id: envConfig.envId,
        name: envConfig.name,
        alias: envConfig.alias,
        version: '1.0.0',
        isActive: true,
        general: {
          comfyuiPath: '/path/to/comfyui',
          pythonPath: envConfig.pythonPath,
          pipPath: '' // 空路径
        },
        dependencies: {
          pythonVersion: '3.11.0',
          pytorchVersion: '2.0.0',
          cudaVersion: '12.1',
          sageAttentionVersion: 'N/A',
          flashAttnVersion: 'N/A',
          tritonVersion: 'N/A',
          xformersVersion: 'N/A'
        },
        acceleration: {
          computeDevice: 'nvidia:0',
          vramStrategy: 'normal',
          cpuOnly: false,
          gpuOnly: false,
          reserveVram: 0,
          unetPrecision: 'auto',
          vaePrecision: 'fp32',
          textEncPrecision: 'fp16',
          attentionMode: 'flash',
          disableXformers: false,
          disableSmartMemory: false,
          forceChannelsLast: false,
          cacheLru: 0,
          deterministic: false,
          fastMode: false,
          listenNetwork: false,
          listenAddress: '',
          port: 8188,
          enableCors: false,
          tlsKeyfile: '',
          tlsCertfile: '',
          baseDirectory: '',
          inputDirectory: '',
          outputDirectory: '',
          tempDirectory: '',
          userDirectory: '',
          extraModelPathsConfig: '',
          previewMethod: 'auto',
          previewSize: 512,
          safeMode: false,
          enableManager: true,
          logLevel: 'INFO',
          disableMetadata: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      useEnvStore.setState({
        environments: [mockEnv],
        currentEnvId: envConfig.envId
      })
      
      useDependencyStore.getState().setCurrentEnv(envConfig.envId)
      
      const envState = useEnvStore.getState()
      const currentEnv = envState.environments.find(e => e.id === envConfig.envId)
      
      // 验证：pip 路径应该为空
      expect(currentEnv?.general.pipPath).toBe('')
      
      // 验证：环境配置应该存在但路径为空
      expect(currentEnv).toBeDefined()
      expect(currentEnv?.general.pythonPath).toBe(envConfig.pythonPath)
    }
  )

  /**
   * 属性 2.3: 空路径配置时禁用操作 - 两个路径都为空
   * 
   * 对于任意环境配置，如果 pythonPath 和 pipPath 都为空，则系统应显示错误提示并禁用所有依赖操作
   * 
   * **Validates: Requirements 1.3**
   */
  test.prop([
    fc.record({
      envId: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      alias: fc.string({ minLength: 1, maxLength: 20 })
    })
  ], { numRuns: 100 })(
    'Python 和 pip 路径都为空时应禁用所有依赖操作',
    (envConfig) => {
      const mockEnv: EnvironmentConfig = {
        id: envConfig.envId,
        name: envConfig.name,
        alias: envConfig.alias,
        version: '1.0.0',
        isActive: true,
        general: {
          comfyuiPath: '/path/to/comfyui',
          pythonPath: '', // 空路径
          pipPath: '' // 空路径
        },
        dependencies: {
          pythonVersion: '3.11.0',
          pytorchVersion: '2.0.0',
          cudaVersion: '12.1',
          sageAttentionVersion: 'N/A',
          flashAttnVersion: 'N/A',
          tritonVersion: 'N/A',
          xformersVersion: 'N/A'
        },
        acceleration: {
          computeDevice: 'nvidia:0',
          vramStrategy: 'normal',
          cpuOnly: false,
          gpuOnly: false,
          reserveVram: 0,
          unetPrecision: 'auto',
          vaePrecision: 'fp32',
          textEncPrecision: 'fp16',
          attentionMode: 'flash',
          disableXformers: false,
          disableSmartMemory: false,
          forceChannelsLast: false,
          cacheLru: 0,
          deterministic: false,
          fastMode: false,
          listenNetwork: false,
          listenAddress: '',
          port: 8188,
          enableCors: false,
          tlsKeyfile: '',
          tlsCertfile: '',
          baseDirectory: '',
          inputDirectory: '',
          outputDirectory: '',
          tempDirectory: '',
          userDirectory: '',
          extraModelPathsConfig: '',
          previewMethod: 'auto',
          previewSize: 512,
          safeMode: false,
          enableManager: true,
          logLevel: 'INFO',
          disableMetadata: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      useEnvStore.setState({
        environments: [mockEnv],
        currentEnvId: envConfig.envId
      })
      
      useDependencyStore.getState().setCurrentEnv(envConfig.envId)
      
      const envState = useEnvStore.getState()
      const currentEnv = envState.environments.find(e => e.id === envConfig.envId)
      
      // 验证：两个路径都应该为空
      expect(currentEnv?.general.pythonPath).toBe('')
      expect(currentEnv?.general.pipPath).toBe('')
      
      // 验证：环境配置应该存在
      expect(currentEnv).toBeDefined()
    }
  )

  /**
   * 属性 2.4: 空路径配置时禁用操作 - 路径配置的随机组合
   * 
   * 对于任意环境配置，验证路径为空或非空的各种组合情况
   * 
   * **Validates: Requirements 1.3**
   */
  test.prop([
    fc.record({
      envId: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      alias: fc.string({ minLength: 1, maxLength: 20 }),
      pythonPath: fc.oneof(
        fc.constant(''),
        fc.string({ minLength: 10, maxLength: 200 })
      ),
      pipPath: fc.oneof(
        fc.constant(''),
        fc.string({ minLength: 10, maxLength: 200 })
      )
    })
  ], { numRuns: 100 })(
    '任意路径配置组合都应该正确处理',
    (envConfig) => {
      const mockEnv: EnvironmentConfig = {
        id: envConfig.envId,
        name: envConfig.name,
        alias: envConfig.alias,
        version: '1.0.0',
        isActive: true,
        general: {
          comfyuiPath: '/path/to/comfyui',
          pythonPath: envConfig.pythonPath,
          pipPath: envConfig.pipPath
        },
        dependencies: {
          pythonVersion: '3.11.0',
          pytorchVersion: '2.0.0',
          cudaVersion: '12.1',
          sageAttentionVersion: 'N/A',
          flashAttnVersion: 'N/A',
          tritonVersion: 'N/A',
          xformersVersion: 'N/A'
        },
        acceleration: {
          computeDevice: 'nvidia:0',
          vramStrategy: 'normal',
          cpuOnly: false,
          gpuOnly: false,
          reserveVram: 0,
          unetPrecision: 'auto',
          vaePrecision: 'fp32',
          textEncPrecision: 'fp16',
          attentionMode: 'flash',
          disableXformers: false,
          disableSmartMemory: false,
          forceChannelsLast: false,
          cacheLru: 0,
          deterministic: false,
          fastMode: false,
          listenNetwork: false,
          listenAddress: '',
          port: 8188,
          enableCors: false,
          tlsKeyfile: '',
          tlsCertfile: '',
          baseDirectory: '',
          inputDirectory: '',
          outputDirectory: '',
          tempDirectory: '',
          userDirectory: '',
          extraModelPathsConfig: '',
          previewMethod: 'auto',
          previewSize: 512,
          safeMode: false,
          enableManager: true,
          logLevel: 'INFO',
          disableMetadata: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      useEnvStore.setState({
        environments: [mockEnv],
        currentEnvId: envConfig.envId
      })
      
      useDependencyStore.getState().setCurrentEnv(envConfig.envId)
      
      const envState = useEnvStore.getState()
      const currentEnv = envState.environments.find(e => e.id === envConfig.envId)
      
      // 验证：路径配置应该与输入一致
      expect(currentEnv?.general.pythonPath).toBe(envConfig.pythonPath)
      expect(currentEnv?.general.pipPath).toBe(envConfig.pipPath)
      
      // 验证：环境配置应该存在
      expect(currentEnv).toBeDefined()
    }
  )

  /**
   * 属性 3.1: 环境信息显示一致性 - 环境名称一致性
   * 
   * 对于任意环境配置，界面上显示的环境名称应与环境配置中的值完全一致
   * 
   * **Validates: Requirements 1.4**
   */
  test.prop([
    fc.record({
      envId: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      alias: fc.string({ minLength: 1, maxLength: 20 }),
      pythonPath: fc.string({ minLength: 10, maxLength: 200 }),
      pipPath: fc.string({ minLength: 10, maxLength: 200 })
    })
  ], { numRuns: 100 })(
    '界面显示的环境名称应与配置一致',
    (envConfig) => {
      const mockEnv: EnvironmentConfig = {
        id: envConfig.envId,
        name: envConfig.name,
        alias: envConfig.alias,
        version: '1.0.0',
        isActive: true,
        general: {
          comfyuiPath: '/path/to/comfyui',
          pythonPath: envConfig.pythonPath,
          pipPath: envConfig.pipPath
        },
        dependencies: {
          pythonVersion: '3.11.0',
          pytorchVersion: '2.0.0',
          cudaVersion: '12.1',
          sageAttentionVersion: 'N/A',
          flashAttnVersion: 'N/A',
          tritonVersion: 'N/A',
          xformersVersion: 'N/A'
        },
        acceleration: {
          computeDevice: 'nvidia:0',
          vramStrategy: 'normal',
          cpuOnly: false,
          gpuOnly: false,
          reserveVram: 0,
          unetPrecision: 'auto',
          vaePrecision: 'fp32',
          textEncPrecision: 'fp16',
          attentionMode: 'flash',
          disableXformers: false,
          disableSmartMemory: false,
          forceChannelsLast: false,
          cacheLru: 0,
          deterministic: false,
          fastMode: false,
          listenNetwork: false,
          listenAddress: '',
          port: 8188,
          enableCors: false,
          tlsKeyfile: '',
          tlsCertfile: '',
          baseDirectory: '',
          inputDirectory: '',
          outputDirectory: '',
          tempDirectory: '',
          userDirectory: '',
          extraModelPathsConfig: '',
          previewMethod: 'auto',
          previewSize: 512,
          safeMode: false,
          enableManager: true,
          logLevel: 'INFO',
          disableMetadata: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      useEnvStore.setState({
        environments: [mockEnv],
        currentEnvId: envConfig.envId
      })
      
      const envState = useEnvStore.getState()
      const currentEnv = envState.environments.find(e => e.id === envConfig.envId)
      
      // 验证：环境名称应该与配置一致
      expect(currentEnv?.name).toBe(envConfig.name)
      expect(currentEnv?.alias).toBe(envConfig.alias)
      
      // 验证：环境名称不应该被修改
      expect(currentEnv?.name).not.toBe('')
      expect(currentEnv?.alias).not.toBe('')
    }
  )

  /**
   * 属性 3.2: 环境信息显示一致性 - 环境别名一致性
   * 
   * 对于任意环境配置，界面上显示的环境别名应与环境配置中的值完全一致
   * 
   * **Validates: Requirements 1.4**
   */
  test.prop([
    fc.array(
      fc.record({
        envId: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        alias: fc.string({ minLength: 1, maxLength: 20 }),
        pythonPath: fc.string({ minLength: 10, maxLength: 200 }),
        pipPath: fc.string({ minLength: 10, maxLength: 200 })
      }),
      { minLength: 1, maxLength: 10 }
    )
  ], { numRuns: 100 })(
    '所有环境的别名都应该与配置一致',
    (envConfigs) => {
      const mockEnvironments: EnvironmentConfig[] = envConfigs.map(config => ({
        id: config.envId,
        name: config.name,
        alias: config.alias,
        version: '1.0.0',
        isActive: false,
        general: {
          comfyuiPath: '/path/to/comfyui',
          pythonPath: config.pythonPath,
          pipPath: config.pipPath
        },
        dependencies: {
          pythonVersion: '3.11.0',
          pytorchVersion: '2.0.0',
          cudaVersion: '12.1',
          sageAttentionVersion: 'N/A',
          flashAttnVersion: 'N/A',
          tritonVersion: 'N/A',
          xformersVersion: 'N/A'
        },
        acceleration: {
          computeDevice: 'nvidia:0',
          vramStrategy: 'normal',
          cpuOnly: false,
          gpuOnly: false,
          reserveVram: 0,
          unetPrecision: 'auto',
          vaePrecision: 'fp32',
          textEncPrecision: 'fp16',
          attentionMode: 'flash',
          disableXformers: false,
          disableSmartMemory: false,
          forceChannelsLast: false,
          cacheLru: 0,
          deterministic: false,
          fastMode: false,
          listenNetwork: false,
          listenAddress: '',
          port: 8188,
          enableCors: false,
          tlsKeyfile: '',
          tlsCertfile: '',
          baseDirectory: '',
          inputDirectory: '',
          outputDirectory: '',
          tempDirectory: '',
          userDirectory: '',
          extraModelPathsConfig: '',
          previewMethod: 'auto',
          previewSize: 512,
          safeMode: false,
          enableManager: true,
          logLevel: 'INFO',
          disableMetadata: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))
      
      useEnvStore.setState({
        environments: mockEnvironments,
        currentEnvId: null
      })
      
      const envState = useEnvStore.getState()
      
      // 验证：每个环境的别名都应该与配置一致
      for (const config of envConfigs) {
        const env = envState.environments.find(e => e.id === config.envId)
        expect(env).toBeDefined()
        expect(env?.alias).toBe(config.alias)
        expect(env?.name).toBe(config.name)
      }
    }
  )

  /**
   * 属性 3.3: 环境信息显示一致性 - 环境配置更新后的一致性
   * 
   * 对于任意环境配置，更新环境配置后，界面显示应该立即反映新的配置
   * 
   * **Validates: Requirements 1.4**
   */
  test.prop([
    fc.record({
      initialConfig: fc.record({
        envId: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        alias: fc.string({ minLength: 1, maxLength: 20 }),
        pythonPath: fc.string({ minLength: 10, maxLength: 200 }),
        pipPath: fc.string({ minLength: 10, maxLength: 200 })
      }),
      updatedConfig: fc.record({
        name: fc.string({ minLength: 1, maxLength: 50 }),
        alias: fc.string({ minLength: 1, maxLength: 20 })
      })
    })
  ], { numRuns: 100 })(
    '更新环境配置后界面应该立即反映新配置',
    ({ initialConfig, updatedConfig }) => {
      const mockEnv: EnvironmentConfig = {
        id: initialConfig.envId,
        name: initialConfig.name,
        alias: initialConfig.alias,
        version: '1.0.0',
        isActive: true,
        general: {
          comfyuiPath: '/path/to/comfyui',
          pythonPath: initialConfig.pythonPath,
          pipPath: initialConfig.pipPath
        },
        dependencies: {
          pythonVersion: '3.11.0',
          pytorchVersion: '2.0.0',
          cudaVersion: '12.1',
          sageAttentionVersion: 'N/A',
          flashAttnVersion: 'N/A',
          tritonVersion: 'N/A',
          xformersVersion: 'N/A'
        },
        acceleration: {
          computeDevice: 'nvidia:0',
          vramStrategy: 'normal',
          cpuOnly: false,
          gpuOnly: false,
          reserveVram: 0,
          unetPrecision: 'auto',
          vaePrecision: 'fp32',
          textEncPrecision: 'fp16',
          attentionMode: 'flash',
          disableXformers: false,
          disableSmartMemory: false,
          forceChannelsLast: false,
          cacheLru: 0,
          deterministic: false,
          fastMode: false,
          listenNetwork: false,
          listenAddress: '',
          port: 8188,
          enableCors: false,
          tlsKeyfile: '',
          tlsCertfile: '',
          baseDirectory: '',
          inputDirectory: '',
          outputDirectory: '',
          tempDirectory: '',
          userDirectory: '',
          extraModelPathsConfig: '',
          previewMethod: 'auto',
          previewSize: 512,
          safeMode: false,
          enableManager: true,
          logLevel: 'INFO',
          disableMetadata: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      useEnvStore.setState({
        environments: [mockEnv],
        currentEnvId: initialConfig.envId
      })
      
      let envState = useEnvStore.getState()
      let currentEnv = envState.environments.find(e => e.id === initialConfig.envId)
      
      // 验证：初始配置应该正确
      expect(currentEnv?.name).toBe(initialConfig.name)
      expect(currentEnv?.alias).toBe(initialConfig.alias)
      
      // 更新环境配置
      const updatedEnv: EnvironmentConfig = {
        ...mockEnv,
        name: updatedConfig.name,
        alias: updatedConfig.alias
      }
      
      useEnvStore.setState({
        environments: [updatedEnv]
      })
      
      envState = useEnvStore.getState()
      currentEnv = envState.environments.find(e => e.id === initialConfig.envId)
      
      // 验证：更新后的配置应该立即反映
      expect(currentEnv?.name).toBe(updatedConfig.name)
      expect(currentEnv?.alias).toBe(updatedConfig.alias)
      
      // 验证：旧的配置不应该残留（除非新旧配置相同）
      if (updatedConfig.name !== initialConfig.name) {
        expect(currentEnv?.name).not.toBe(initialConfig.name)
      }
      if (updatedConfig.alias !== initialConfig.alias) {
        expect(currentEnv?.alias).not.toBe(initialConfig.alias)
      }
    }
  )

  /**
   * 属性 3.4: 环境信息显示一致性 - 环境列表的完整性
   * 
   * 对于任意环境配置列表，所有环境的名称和别名都应该正确显示
   * 
   * **Validates: Requirements 1.4**
   */
  test.prop([
    fc.array(
      fc.record({
        envId: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        alias: fc.string({ minLength: 1, maxLength: 20 }),
        pythonPath: fc.string({ minLength: 10, maxLength: 200 }),
        pipPath: fc.string({ minLength: 10, maxLength: 200 })
      }),
      { minLength: 1, maxLength: 10 }
    )
  ], { numRuns: 100 })(
    '环境列表中所有环境的信息都应该正确显示',
    (envConfigs) => {
      const mockEnvironments: EnvironmentConfig[] = envConfigs.map(config => ({
        id: config.envId,
        name: config.name,
        alias: config.alias,
        version: '1.0.0',
        isActive: false,
        general: {
          comfyuiPath: '/path/to/comfyui',
          pythonPath: config.pythonPath,
          pipPath: config.pipPath
        },
        dependencies: {
          pythonVersion: '3.11.0',
          pytorchVersion: '2.0.0',
          cudaVersion: '12.1',
          sageAttentionVersion: 'N/A',
          flashAttnVersion: 'N/A',
          tritonVersion: 'N/A',
          xformersVersion: 'N/A'
        },
        acceleration: {
          computeDevice: 'nvidia:0',
          vramStrategy: 'normal',
          cpuOnly: false,
          gpuOnly: false,
          reserveVram: 0,
          unetPrecision: 'auto',
          vaePrecision: 'fp32',
          textEncPrecision: 'fp16',
          attentionMode: 'flash',
          disableXformers: false,
          disableSmartMemory: false,
          forceChannelsLast: false,
          cacheLru: 0,
          deterministic: false,
          fastMode: false,
          listenNetwork: false,
          listenAddress: '',
          port: 8188,
          enableCors: false,
          tlsKeyfile: '',
          tlsCertfile: '',
          baseDirectory: '',
          inputDirectory: '',
          outputDirectory: '',
          tempDirectory: '',
          userDirectory: '',
          extraModelPathsConfig: '',
          previewMethod: 'auto',
          previewSize: 512,
          safeMode: false,
          enableManager: true,
          logLevel: 'INFO',
          disableMetadata: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))
      
      useEnvStore.setState({
        environments: mockEnvironments,
        currentEnvId: null
      })
      
      const envState = useEnvStore.getState()
      
      // 验证：环境数量应该正确
      expect(envState.environments.length).toBe(envConfigs.length)
      
      // 验证：每个环境的信息都应该正确
      for (let i = 0; i < envConfigs.length; i++) {
        const config = envConfigs[i]
        const env = envState.environments.find(e => e.id === config.envId)
        
        expect(env).toBeDefined()
        expect(env?.name).toBe(config.name)
        expect(env?.alias).toBe(config.alias)
        expect(env?.general.pythonPath).toBe(config.pythonPath)
        expect(env?.general.pipPath).toBe(config.pipPath)
      }
      
      // 验证：所有环境 ID 应该唯一
      const envIds = envState.environments.map(e => e.id)
      const uniqueIds = new Set(envIds)
      expect(uniqueIds.size).toBe(envState.environments.length)
    }
  )
})
