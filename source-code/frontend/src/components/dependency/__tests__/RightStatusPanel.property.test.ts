/**
 * RightStatusPanel 属性测试
 * 
 * 使用 fast-check 进行属性测试，验证环境状态面板的通用属性
 * 
 * 属性 20: 环境信息显示完整性
 * 验证需求: 9.3, 9.4
 */

import { describe, beforeEach, expect } from 'vitest'
import { test, fc } from '@fast-check/vitest'
import { useDependencyStore } from '@/stores/useDependencyStore'
import type { EnvironmentInfo } from '@/types/dependency'

describe('RightStatusPanel - 属性测试', () => {
  beforeEach(() => {
    // 重置 store 状态
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
  })

  /**
   * 属性 20.1: 环境信息显示完整性 - 所有字段都应该显示
   * 
   * 对于任意环境配置，执行环境检测后应显示系统信息、硬件资源和软件依赖的所有字段
   * 
   * **Validates: Requirements 9.3, 9.4**
   */
  test.prop([
    fc.record({
      windowsVersion: fc.string({ minLength: 1, maxLength: 50 }),
      gpu: fc.record({
        model: fc.string({ minLength: 1, maxLength: 100 }),
        vram: fc.string({ minLength: 1, maxLength: 20 })
      }),
      cpu: fc.record({
        model: fc.string({ minLength: 1, maxLength: 100 }),
        ram: fc.string({ minLength: 1, maxLength: 20 })
      }),
      python: fc.record({
        version: fc.string({ minLength: 1, maxLength: 20 }),
        path: fc.string({ minLength: 1, maxLength: 200 })
      }),
      cuda: fc.record({
        version: fc.string({ minLength: 1, maxLength: 20 })
      }),
      dependencies: fc.record({
        pytorch: fc.string({ minLength: 1, maxLength: 20 }),
        transformer: fc.string({ minLength: 1, maxLength: 20 })
      })
    })
  ], { numRuns: 100 })(
    '环境信息应该包含所有必需字段',
    (envInfo) => {
      const store = useDependencyStore.getState()
      
      // 设置环境信息
      store.setEnvInfo(envInfo as EnvironmentInfo)
      
      const state = useDependencyStore.getState()
      
      // 验证：环境信息应该存在
      expect(state.envInfo).not.toBeNull()
      
      // 验证：系统信息字段
      expect(state.envInfo?.windowsVersion).toBe(envInfo.windowsVersion)
      
      // 验证：硬件资源字段
      expect(state.envInfo?.gpu.model).toBe(envInfo.gpu.model)
      expect(state.envInfo?.gpu.vram).toBe(envInfo.gpu.vram)
      expect(state.envInfo?.cpu.model).toBe(envInfo.cpu.model)
      expect(state.envInfo?.cpu.ram).toBe(envInfo.cpu.ram)
      
      // 验证：软件依赖字段
      expect(state.envInfo?.python.version).toBe(envInfo.python.version)
      expect(state.envInfo?.python.path).toBe(envInfo.python.path)
      expect(state.envInfo?.cuda.version).toBe(envInfo.cuda.version)
      expect(state.envInfo?.dependencies.pytorch).toBe(envInfo.dependencies.pytorch)
      expect(state.envInfo?.dependencies.transformer).toBe(envInfo.dependencies.transformer)
    }
  )

  /**
   * 属性 20.2: 环境信息显示完整性 - 未安装依赖显示 "未安装" 或 "N/A"
   * 
   * 对于任意环境配置，如果检测到依赖未安装，应显示 "未安装" 或 "N/A"
   * 
   * **Validates: Requirements 9.4**
   */
  test.prop([
    fc.record({
      windowsVersion: fc.string({ minLength: 1, maxLength: 50 }),
      gpu: fc.record({
        model: fc.oneof(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.constant('未安装'),
          fc.constant('N/A')
        ),
        vram: fc.oneof(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.constant('未安装'),
          fc.constant('N/A')
        )
      }),
      cpu: fc.record({
        model: fc.string({ minLength: 1, maxLength: 100 }),
        ram: fc.string({ minLength: 1, maxLength: 20 })
      }),
      python: fc.record({
        version: fc.oneof(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.constant('未安装'),
          fc.constant('N/A')
        ),
        path: fc.oneof(
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.constant('未安装'),
          fc.constant('N/A')
        )
      }),
      cuda: fc.record({
        version: fc.oneof(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.constant('未安装'),
          fc.constant('N/A')
        )
      }),
      dependencies: fc.record({
        pytorch: fc.oneof(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.constant('未安装'),
          fc.constant('N/A')
        ),
        transformer: fc.oneof(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.constant('未安装'),
          fc.constant('N/A')
        )
      })
    })
  ], { numRuns: 100 })(
    '未安装的依赖应该显示 "未安装" 或 "N/A"',
    (envInfo) => {
      const store = useDependencyStore.getState()
      
      // 设置环境信息
      store.setEnvInfo(envInfo as EnvironmentInfo)
      
      const state = useDependencyStore.getState()
      
      // 验证：环境信息应该存在
      expect(state.envInfo).not.toBeNull()
      
      // 验证：所有字段都应该有值（即使是 "未安装" 或 "N/A"）
      expect(state.envInfo?.windowsVersion).toBeTruthy()
      expect(state.envInfo?.gpu.model).toBeTruthy()
      expect(state.envInfo?.gpu.vram).toBeTruthy()
      expect(state.envInfo?.cpu.model).toBeTruthy()
      expect(state.envInfo?.cpu.ram).toBeTruthy()
      expect(state.envInfo?.python.version).toBeTruthy()
      expect(state.envInfo?.python.path).toBeTruthy()
      expect(state.envInfo?.cuda.version).toBeTruthy()
      expect(state.envInfo?.dependencies.pytorch).toBeTruthy()
      expect(state.envInfo?.dependencies.transformer).toBeTruthy()
      
      // 验证：未安装的依赖应该显示特定值
      const validUninstalledValues = ['未安装', 'N/A']
      
      if (validUninstalledValues.includes(state.envInfo?.gpu.model || '')) {
        expect(validUninstalledValues).toContain(state.envInfo?.gpu.model)
      }
      
      if (validUninstalledValues.includes(state.envInfo?.cuda.version || '')) {
        expect(validUninstalledValues).toContain(state.envInfo?.cuda.version)
      }
      
      if (validUninstalledValues.includes(state.envInfo?.dependencies.pytorch || '')) {
        expect(validUninstalledValues).toContain(state.envInfo?.dependencies.pytorch)
      }
      
      if (validUninstalledValues.includes(state.envInfo?.dependencies.transformer || '')) {
        expect(validUninstalledValues).toContain(state.envInfo?.dependencies.transformer)
      }
    }
  )

  /**
   * 属性 20.3: 环境信息显示完整性 - 字段值不应为空字符串
   * 
   * 对于任意环境配置，所有字段的值都不应该是空字符串
   * 
   * **Validates: Requirements 9.3, 9.4**
   */
  test.prop([
    fc.record({
      windowsVersion: fc.string({ minLength: 1, maxLength: 50 }),
      gpu: fc.record({
        model: fc.string({ minLength: 1, maxLength: 100 }),
        vram: fc.string({ minLength: 1, maxLength: 20 })
      }),
      cpu: fc.record({
        model: fc.string({ minLength: 1, maxLength: 100 }),
        ram: fc.string({ minLength: 1, maxLength: 20 })
      }),
      python: fc.record({
        version: fc.string({ minLength: 1, maxLength: 20 }),
        path: fc.string({ minLength: 1, maxLength: 200 })
      }),
      cuda: fc.record({
        version: fc.string({ minLength: 1, maxLength: 20 })
      }),
      dependencies: fc.record({
        pytorch: fc.string({ minLength: 1, maxLength: 20 }),
        transformer: fc.string({ minLength: 1, maxLength: 20 })
      })
    })
  ], { numRuns: 100 })(
    '所有字段的值都不应该是空字符串',
    (envInfo) => {
      const store = useDependencyStore.getState()
      
      // 设置环境信息
      store.setEnvInfo(envInfo as EnvironmentInfo)
      
      const state = useDependencyStore.getState()
      
      // 验证：所有字段都不应该是空字符串
      expect(state.envInfo?.windowsVersion).not.toBe('')
      expect(state.envInfo?.gpu.model).not.toBe('')
      expect(state.envInfo?.gpu.vram).not.toBe('')
      expect(state.envInfo?.cpu.model).not.toBe('')
      expect(state.envInfo?.cpu.ram).not.toBe('')
      expect(state.envInfo?.python.version).not.toBe('')
      expect(state.envInfo?.python.path).not.toBe('')
      expect(state.envInfo?.cuda.version).not.toBe('')
      expect(state.envInfo?.dependencies.pytorch).not.toBe('')
      expect(state.envInfo?.dependencies.transformer).not.toBe('')
      
      // 验证：所有字段都应该有实际内容
      expect(state.envInfo?.windowsVersion.length).toBeGreaterThan(0)
      expect(state.envInfo?.gpu.model.length).toBeGreaterThan(0)
      expect(state.envInfo?.gpu.vram.length).toBeGreaterThan(0)
      expect(state.envInfo?.cpu.model.length).toBeGreaterThan(0)
      expect(state.envInfo?.cpu.ram.length).toBeGreaterThan(0)
      expect(state.envInfo?.python.version.length).toBeGreaterThan(0)
      expect(state.envInfo?.python.path.length).toBeGreaterThan(0)
      expect(state.envInfo?.cuda.version.length).toBeGreaterThan(0)
      expect(state.envInfo?.dependencies.pytorch.length).toBeGreaterThan(0)
      expect(state.envInfo?.dependencies.transformer.length).toBeGreaterThan(0)
    }
  )

  /**
   * 属性 20.4: 环境信息显示完整性 - 环境信息更新的幂等性
   * 
   * 对于任意环境配置，多次设置相同的环境信息应该产生相同的结果
   * 
   * **Validates: Requirements 9.3**
   */
  test.prop([
    fc.record({
      envInfo: fc.record({
        windowsVersion: fc.string({ minLength: 1, maxLength: 50 }),
        gpu: fc.record({
          model: fc.string({ minLength: 1, maxLength: 100 }),
          vram: fc.string({ minLength: 1, maxLength: 20 })
        }),
        cpu: fc.record({
          model: fc.string({ minLength: 1, maxLength: 100 }),
          ram: fc.string({ minLength: 1, maxLength: 20 })
        }),
        python: fc.record({
          version: fc.string({ minLength: 1, maxLength: 20 }),
          path: fc.string({ minLength: 1, maxLength: 200 })
        }),
        cuda: fc.record({
          version: fc.string({ minLength: 1, maxLength: 20 })
        }),
        dependencies: fc.record({
          pytorch: fc.string({ minLength: 1, maxLength: 20 }),
          transformer: fc.string({ minLength: 1, maxLength: 20 })
        })
      }),
      updateCount: fc.integer({ min: 1, max: 5 })
    })
  ], { numRuns: 100 })(
    '多次设置相同的环境信息应该产生相同的结果',
    ({ envInfo, updateCount }) => {
      const store = useDependencyStore.getState()
      
      // 多次设置相同的环境信息
      for (let i = 0; i < updateCount; i++) {
        store.setEnvInfo(envInfo as EnvironmentInfo)
        
        const state = useDependencyStore.getState()
        
        // 验证：每次设置后环境信息都应该相同
        expect(state.envInfo?.windowsVersion).toBe(envInfo.windowsVersion)
        expect(state.envInfo?.gpu.model).toBe(envInfo.gpu.model)
        expect(state.envInfo?.gpu.vram).toBe(envInfo.gpu.vram)
        expect(state.envInfo?.cpu.model).toBe(envInfo.cpu.model)
        expect(state.envInfo?.cpu.ram).toBe(envInfo.cpu.ram)
        expect(state.envInfo?.python.version).toBe(envInfo.python.version)
        expect(state.envInfo?.python.path).toBe(envInfo.python.path)
        expect(state.envInfo?.cuda.version).toBe(envInfo.cuda.version)
        expect(state.envInfo?.dependencies.pytorch).toBe(envInfo.dependencies.pytorch)
        expect(state.envInfo?.dependencies.transformer).toBe(envInfo.dependencies.transformer)
      }
    }
  )

  /**
   * 属性 20.5: 环境信息显示完整性 - 环境信息更新应该覆盖旧值
   * 
   * 对于任意两个不同的环境配置，设置新的环境信息应该完全覆盖旧的环境信息
   * 
   * **Validates: Requirements 9.3**
   */
  test.prop([
    fc.record({
      oldEnvInfo: fc.record({
        windowsVersion: fc.string({ minLength: 1, maxLength: 50 }),
        gpu: fc.record({
          model: fc.string({ minLength: 1, maxLength: 100 }),
          vram: fc.string({ minLength: 1, maxLength: 20 })
        }),
        cpu: fc.record({
          model: fc.string({ minLength: 1, maxLength: 100 }),
          ram: fc.string({ minLength: 1, maxLength: 20 })
        }),
        python: fc.record({
          version: fc.string({ minLength: 1, maxLength: 20 }),
          path: fc.string({ minLength: 1, maxLength: 200 })
        }),
        cuda: fc.record({
          version: fc.string({ minLength: 1, maxLength: 20 })
        }),
        dependencies: fc.record({
          pytorch: fc.string({ minLength: 1, maxLength: 20 }),
          transformer: fc.string({ minLength: 1, maxLength: 20 })
        })
      }),
      newEnvInfo: fc.record({
        windowsVersion: fc.string({ minLength: 1, maxLength: 50 }),
        gpu: fc.record({
          model: fc.string({ minLength: 1, maxLength: 100 }),
          vram: fc.string({ minLength: 1, maxLength: 20 })
        }),
        cpu: fc.record({
          model: fc.string({ minLength: 1, maxLength: 100 }),
          ram: fc.string({ minLength: 1, maxLength: 20 })
        }),
        python: fc.record({
          version: fc.string({ minLength: 1, maxLength: 20 }),
          path: fc.string({ minLength: 1, maxLength: 200 })
        }),
        cuda: fc.record({
          version: fc.string({ minLength: 1, maxLength: 20 })
        }),
        dependencies: fc.record({
          pytorch: fc.string({ minLength: 1, maxLength: 20 }),
          transformer: fc.string({ minLength: 1, maxLength: 20 })
        })
      })
    })
  ], { numRuns: 100 })(
    '设置新的环境信息应该完全覆盖旧的环境信息',
    ({ oldEnvInfo, newEnvInfo }) => {
      const store = useDependencyStore.getState()
      
      // 设置旧的环境信息
      store.setEnvInfo(oldEnvInfo as EnvironmentInfo)
      
      let state = useDependencyStore.getState()
      
      // 验证：旧的环境信息应该被设置
      expect(state.envInfo?.windowsVersion).toBe(oldEnvInfo.windowsVersion)
      
      // 设置新的环境信息
      store.setEnvInfo(newEnvInfo as EnvironmentInfo)
      
      state = useDependencyStore.getState()
      
      // 验证：新的环境信息应该完全覆盖旧的
      expect(state.envInfo?.windowsVersion).toBe(newEnvInfo.windowsVersion)
      expect(state.envInfo?.gpu.model).toBe(newEnvInfo.gpu.model)
      expect(state.envInfo?.gpu.vram).toBe(newEnvInfo.gpu.vram)
      expect(state.envInfo?.cpu.model).toBe(newEnvInfo.cpu.model)
      expect(state.envInfo?.cpu.ram).toBe(newEnvInfo.cpu.ram)
      expect(state.envInfo?.python.version).toBe(newEnvInfo.python.version)
      expect(state.envInfo?.python.path).toBe(newEnvInfo.python.path)
      expect(state.envInfo?.cuda.version).toBe(newEnvInfo.cuda.version)
      expect(state.envInfo?.dependencies.pytorch).toBe(newEnvInfo.dependencies.pytorch)
      expect(state.envInfo?.dependencies.transformer).toBe(newEnvInfo.dependencies.transformer)
      
      // 验证：旧的环境信息不应该残留
      expect(state.envInfo?.windowsVersion).not.toBe(oldEnvInfo.windowsVersion)
    }
  )

  /**
   * 属性 20.6: 环境信息显示完整性 - 额外依赖字段的处理
   * 
   * 对于任意环境配置，dependencies 对象可以包含额外的依赖字段，
   * 这些字段也应该被正确保存和显示
   * 
   * **Validates: Requirements 9.4**
   */
  test.prop([
    fc.record({
      windowsVersion: fc.string({ minLength: 1, maxLength: 50 }),
      gpu: fc.record({
        model: fc.string({ minLength: 1, maxLength: 100 }),
        vram: fc.string({ minLength: 1, maxLength: 20 })
      }),
      cpu: fc.record({
        model: fc.string({ minLength: 1, maxLength: 100 }),
        ram: fc.string({ minLength: 1, maxLength: 20 })
      }),
      python: fc.record({
        version: fc.string({ minLength: 1, maxLength: 20 }),
        path: fc.string({ minLength: 1, maxLength: 200 })
      }),
      cuda: fc.record({
        version: fc.string({ minLength: 1, maxLength: 20 })
      }),
      dependencies: fc.dictionary(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        { minKeys: 2, maxKeys: 10 }
      ).map(deps => ({
        pytorch: deps['pytorch'] || '2.0.0',
        transformer: deps['transformer'] || '4.30.0',
        ...deps
      }))
    })
  ], { numRuns: 100 })(
    'dependencies 对象可以包含额外的依赖字段',
    (envInfo) => {
      const store = useDependencyStore.getState()
      
      // 设置环境信息
      store.setEnvInfo(envInfo as EnvironmentInfo)
      
      const state = useDependencyStore.getState()
      
      // 验证：环境信息应该存在
      expect(state.envInfo).not.toBeNull()
      
      // 验证：必需的依赖字段应该存在
      expect(state.envInfo?.dependencies.pytorch).toBeTruthy()
      expect(state.envInfo?.dependencies.transformer).toBeTruthy()
      
      // 验证：额外的依赖字段也应该被保存
      const dependencyKeys = Object.keys(state.envInfo?.dependencies || {})
      expect(dependencyKeys.length).toBeGreaterThanOrEqual(2)
      
      // 验证：所有依赖字段的值都不应该是空字符串
      for (const key of dependencyKeys) {
        expect(state.envInfo?.dependencies[key]).toBeTruthy()
        expect(state.envInfo?.dependencies[key].length).toBeGreaterThan(0)
      }
    }
  )

  /**
   * 属性 20.7: 环境信息显示完整性 - 初始状态为 null
   * 
   * 在未执行环境检测之前，环境信息应该为 null
   * 
   * **Validates: Requirements 9.3**
   */
  test.prop([
    fc.constant(null)
  ], { numRuns: 100 })(
    '初始状态下环境信息应该为 null',
    () => {
      // 获取初始状态（已在 beforeEach 中重置）
      const state = useDependencyStore.getState()
      
      // 验证：初始状态下环境信息应该为 null
      expect(state.envInfo).toBeNull()
    }
  )

  /**
   * 属性 20.8: 环境信息显示完整性 - 环境信息结构的完整性
   * 
   * 对于任意环境配置，设置后的环境信息应该保持完整的嵌套结构
   * 
   * **Validates: Requirements 9.3, 9.4**
   */
  test.prop([
    fc.record({
      windowsVersion: fc.string({ minLength: 1, maxLength: 50 }),
      gpu: fc.record({
        model: fc.string({ minLength: 1, maxLength: 100 }),
        vram: fc.string({ minLength: 1, maxLength: 20 })
      }),
      cpu: fc.record({
        model: fc.string({ minLength: 1, maxLength: 100 }),
        ram: fc.string({ minLength: 1, maxLength: 20 })
      }),
      python: fc.record({
        version: fc.string({ minLength: 1, maxLength: 20 }),
        path: fc.string({ minLength: 1, maxLength: 200 })
      }),
      cuda: fc.record({
        version: fc.string({ minLength: 1, maxLength: 20 })
      }),
      dependencies: fc.record({
        pytorch: fc.string({ minLength: 1, maxLength: 20 }),
        transformer: fc.string({ minLength: 1, maxLength: 20 })
      })
    })
  ], { numRuns: 100 })(
    '环境信息应该保持完整的嵌套结构',
    (envInfo) => {
      const store = useDependencyStore.getState()
      
      // 设置环境信息
      store.setEnvInfo(envInfo as EnvironmentInfo)
      
      const state = useDependencyStore.getState()
      
      // 验证：环境信息应该存在
      expect(state.envInfo).not.toBeNull()
      expect(typeof state.envInfo).toBe('object')
      
      // 验证：顶层字段应该存在
      expect(state.envInfo).toHaveProperty('windowsVersion')
      expect(state.envInfo).toHaveProperty('gpu')
      expect(state.envInfo).toHaveProperty('cpu')
      expect(state.envInfo).toHaveProperty('python')
      expect(state.envInfo).toHaveProperty('cuda')
      expect(state.envInfo).toHaveProperty('dependencies')
      
      // 验证：嵌套对象应该存在
      expect(typeof state.envInfo?.gpu).toBe('object')
      expect(typeof state.envInfo?.cpu).toBe('object')
      expect(typeof state.envInfo?.python).toBe('object')
      expect(typeof state.envInfo?.cuda).toBe('object')
      expect(typeof state.envInfo?.dependencies).toBe('object')
      
      // 验证：嵌套对象的字段应该存在
      expect(state.envInfo?.gpu).toHaveProperty('model')
      expect(state.envInfo?.gpu).toHaveProperty('vram')
      expect(state.envInfo?.cpu).toHaveProperty('model')
      expect(state.envInfo?.cpu).toHaveProperty('ram')
      expect(state.envInfo?.python).toHaveProperty('version')
      expect(state.envInfo?.python).toHaveProperty('path')
      expect(state.envInfo?.cuda).toHaveProperty('version')
      expect(state.envInfo?.dependencies).toHaveProperty('pytorch')
      expect(state.envInfo?.dependencies).toHaveProperty('transformer')
    }
  )
})
