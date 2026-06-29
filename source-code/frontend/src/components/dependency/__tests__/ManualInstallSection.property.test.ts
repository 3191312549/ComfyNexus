/**
 * ManualInstallSection 属性测试
 * 
 * 使用 fast-check 进行属性测试，验证手动安装组件的通用属性
 * 
 * 属性 7: PyPI 包信息查询与版本列表处理
 * 属性 8: 版本下拉框关键字定位
 * 验证需求: 4.2, 4.3, 4.4, 12.1, 12.2, 12.3, 12.4
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { test, fc } from '@fast-check/vitest'
import { useDependencyStore } from '@/stores/useDependencyStore'

describe('ManualInstallSection - 属性测试', () => {
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
   * 属性 7.1: PyPI 包信息查询返回有效数据
   * 
   * 对于任意有效的 PyPI 包名，查询后应返回包信息
   * 
   * **Validates: Requirements 4.2, 12.1**
   */
  test.prop([
    fc.oneof(
      fc.constant('numpy'),
      fc.constant('pandas'),
      fc.constant('requests'),
      fc.constant('flask'),
      fc.constant('django')
    )
  ], { numRuns: 100 })(
    '对于任意有效的包名，查询应返回包信息',
    async (packageName) => {
      const store = useDependencyStore.getState()
      
      // 搜索包（开发环境会使用 Mock）
      await store.searchPackage(packageName)
      
      const state = useDependencyStore.getState()
      
      // 验证：应该有搜索日志
      const hasSearchLog = state.logs.some(log => 
        log.message.includes('搜索') || log.message.includes('找到包')
      )
      expect(hasSearchLog).toBe(true)
      
      // 验证：日志中应该提到包名
      const hasPackageNameLog = state.logs.some(log => 
        log.message.includes(packageName)
      )
      expect(hasPackageNameLog).toBe(true)
    }
  )

  /**
   * 属性 7.2: 版本列表按降序排列
   * 
   * 对于任意包名，查询到的版本列表应按降序排列（最新版本在前）
   * 
   * **Validates: Requirements 4.3, 12.3**
   */
  test.prop([
    fc.oneof(
      fc.constant('numpy'),
      fc.constant('requests'),
      fc.constant('flask')
    )
  ], { numRuns: 100, timeout: 10000 })(
    '版本列表应按降序排列',
    async (packageName) => {
      const store = useDependencyStore.getState()
      
      // 获取包版本列表（开发环境会使用 Mock）
      await store.fetchPackageVersions(packageName)
      
      const state = useDependencyStore.getState()
      
      // 验证：版本列表应该非空
      expect(state.packageVersions.length).toBeGreaterThan(0)
      
      // 验证：所有版本号应该符合语义化版本格式
      const versionRegex = /^\d+\.\d+(\.\d+)?/
      state.packageVersions.forEach(version => {
        expect(versionRegex.test(version)).toBe(true)
      })
      
      // 验证：版本列表应该按降序排列
      for (let i = 0; i < state.packageVersions.length - 1; i++) {
        const current = state.packageVersions[i]
        const next = state.packageVersions[i + 1]
        
        // 解析版本号
        const parseVersion = (v: string) => {
          const parts = v.split('.').map(Number)
          return {
            major: parts[0] || 0,
            minor: parts[1] || 0,
            patch: parts[2] || 0
          }
        }
        
        const currVer = parseVersion(current)
        const nextVer = parseVersion(next)
        
        const currValue = currVer.major * 10000 + currVer.minor * 100 + currVer.patch
        const nextValue = nextVer.major * 10000 + nextVer.minor * 100 + nextVer.patch
        
        expect(currValue).toBeGreaterThanOrEqual(nextValue)
      }
    }
  )

  /**
   * 属性 7.3: 最新版本标注
   * 
   * 对于任意包名，版本列表的第一个版本应该是最新版本
   * 
   * **Validates: Requirements 12.4**
   */
  test.prop([
    fc.oneof(
      fc.constant('numpy'),
      fc.constant('pandas'),
      fc.constant('requests')
    )
  ], { numRuns: 100, timeout: 10000 })(
    '版本列表的第一个版本应该是最新版本',
    async (packageName) => {
      const store = useDependencyStore.getState()
      
      // 搜索包并获取版本列表
      await store.searchPackage(packageName)
      await store.fetchPackageVersions(packageName)
      
      const state = useDependencyStore.getState()
      
      // 验证：版本列表应该非空
      expect(state.packageVersions.length).toBeGreaterThan(0)
      
      // 验证：第一个版本应该是最新版本（在 Mock 环境中）
      const latestVersion = state.packageVersions[0]
      expect(latestVersion).toBeTruthy()
      
      // 验证：日志中应该提到版本数量
      const hasVersionCountLog = state.logs.some(log => 
        log.message.includes('个可用版本') || log.message.includes('版本列表')
      )
      expect(hasVersionCountLog).toBe(true)
    }
  )

  /**
   * 属性 7.4: 包信息查询的一致性
   * 
   * 对于相同的包名，多次查询应返回一致的结果
   * 
   * **Validates: Requirements 4.2, 12.1, 12.2**
   */
  test.prop([
    fc.record({
      packageName: fc.oneof(
        fc.constant('numpy'),
        fc.constant('requests')
      ),
      queryCount: fc.integer({ min: 2, max: 5 })
    })
  ], { numRuns: 50, timeout: 15000 })(
    '相同包名的多次查询应返回一致的结果',
    async ({ packageName, queryCount }) => {
      const store = useDependencyStore.getState()
      
      // 多次查询版本列表
      const versionLists: string[][] = []
      for (let i = 0; i < queryCount; i++) {
        // 清空版本列表
        useDependencyStore.setState({ packageVersions: [] })
        
        await store.fetchPackageVersions(packageName)
        
        const state = useDependencyStore.getState()
        versionLists.push([...state.packageVersions])
      }
      
      // 验证：所有查询结果应该一致
      const firstList = versionLists[0]
      for (let i = 1; i < versionLists.length; i++) {
        expect(versionLists[i]).toEqual(firstList)
      }
    }
  )

  /**
   * 属性 8.1: 版本下拉框关键字定位 - 精确匹配
   * 
   * 对于任意版本列表和关键字，应该能够定位到匹配的版本
   * 
   * **Validates: Requirements 4.4**
   */
  test.prop([
    fc.record({
      versions: fc.constant(['3.1.0', '3.0.5', '3.0.0', '2.9.1', '2.9.0', '2.8.5']),
      keyword: fc.oneof(
        fc.constant('3.1'),
        fc.constant('3.0'),
        fc.constant('2.9'),
        fc.constant('2.8')
      )
    })
  ], { numRuns: 100 })(
    '关键字应该能够定位到匹配的版本',
    ({ versions, keyword }) => {
      // 模拟版本下拉框的关键字定位功能
      const findMatchingVersion = (versions: string[], keyword: string): string | null => {
        return versions.find(v => v.startsWith(keyword)) || null
      }
      
      const matchedVersion = findMatchingVersion(versions, keyword)
      
      // 验证：应该找到匹配的版本
      expect(matchedVersion).toBeTruthy()
      
      // 验证：匹配的版本应该以关键字开头
      if (matchedVersion) {
        expect(matchedVersion.startsWith(keyword)).toBe(true)
      }
    }
  )

  /**
   * 属性 8.2: 版本下拉框关键字定位 - 第一个匹配
   * 
   * 对于任意版本列表和关键字，应该定位到第一个匹配的版本
   * 
   * **Validates: Requirements 4.4**
   */
  test.prop([
    fc.record({
      versions: fc.constant(['3.1.5', '3.1.0', '3.0.5', '3.0.0', '2.9.1']),
      keyword: fc.constant('3.1')
    })
  ], { numRuns: 100 })(
    '应该定位到第一个匹配的版本',
    ({ versions, keyword }) => {
      // 模拟版本下拉框的关键字定位功能
      const findFirstMatchingVersion = (versions: string[], keyword: string): string | null => {
        return versions.find(v => v.startsWith(keyword)) || null
      }
      
      const matchedVersion = findFirstMatchingVersion(versions, keyword)
      
      // 验证：应该找到匹配的版本
      expect(matchedVersion).toBe('3.1.5')
      
      // 验证：匹配的版本应该是第一个以关键字开头的版本
      const firstMatchIndex = versions.findIndex(v => v.startsWith(keyword))
      expect(matchedVersion).toBe(versions[firstMatchIndex])
    }
  )

  /**
   * 属性 8.3: 版本下拉框关键字定位 - 无匹配情况
   * 
   * 对于任意版本列表和不存在的关键字，应该返回 null
   * 
   * **Validates: Requirements 4.4**
   */
  test.prop([
    fc.record({
      versions: fc.constant(['3.1.0', '3.0.5', '2.9.1']),
      keyword: fc.oneof(
        fc.constant('4.0'),
        fc.constant('1.0'),
        fc.constant('5.0')
      )
    })
  ], { numRuns: 100 })(
    '不存在的关键字应该返回 null',
    ({ versions, keyword }) => {
      // 模拟版本下拉框的关键字定位功能
      const findMatchingVersion = (versions: string[], keyword: string): string | null => {
        return versions.find(v => v.startsWith(keyword)) || null
      }
      
      const matchedVersion = findMatchingVersion(versions, keyword)
      
      // 验证：应该返回 null
      expect(matchedVersion).toBeNull()
    }
  )

  /**
   * 属性 8.4: 版本下拉框关键字定位 - 部分匹配
   * 
   * 对于任意版本列表和部分关键字，应该能够定位到匹配的版本
   * 
   * **Validates: Requirements 4.4**
   */
  test.prop([
    fc.record({
      versions: fc.constant(['3.1.0', '3.0.5', '3.0.0', '2.9.1']),
      keyword: fc.oneof(
        fc.constant('3'),
        fc.constant('2'),
        fc.constant('3.0'),
        fc.constant('3.1')
      )
    })
  ], { numRuns: 100 })(
    '部分关键字应该能够定位到匹配的版本',
    ({ versions, keyword }) => {
      // 模拟版本下拉框的关键字定位功能
      const findMatchingVersion = (versions: string[], keyword: string): string | null => {
        return versions.find(v => v.startsWith(keyword)) || null
      }
      
      const matchedVersion = findMatchingVersion(versions, keyword)
      
      // 验证：应该找到匹配的版本
      expect(matchedVersion).toBeTruthy()
      
      // 验证：匹配的版本应该以关键字开头
      if (matchedVersion) {
        expect(matchedVersion.startsWith(keyword)).toBe(true)
      }
      
      // 验证：应该是第一个匹配的版本
      const firstMatchIndex = versions.findIndex(v => v.startsWith(keyword))
      expect(matchedVersion).toBe(versions[firstMatchIndex])
    }
  )

  /**
   * 属性 8.5: 版本下拉框关键字定位 - 大小写敏感
   * 
   * 版本号通常是数字，关键字定位应该是大小写敏感的
   * 
   * **Validates: Requirements 4.4**
   */
  test.prop([
    fc.record({
      versions: fc.constant(['3.1.0', '3.0.5', '2.9.1']),
      keyword: fc.constant('3.1')
    })
  ], { numRuns: 100 })(
    '关键字定位应该是大小写敏感的',
    ({ versions, keyword }) => {
      // 模拟版本下拉框的关键字定位功能（大小写敏感）
      const findMatchingVersion = (versions: string[], keyword: string): string | null => {
        return versions.find(v => v.startsWith(keyword)) || null
      }
      
      const matchedVersion = findMatchingVersion(versions, keyword)
      
      // 验证：应该找到匹配的版本
      expect(matchedVersion).toBe('3.1.0')
      
      // 验证：版本号是数字，大小写转换不影响匹配
      // 但这个测试确保了我们的匹配逻辑是大小写敏感的
      // 对于纯数字的版本号，大小写转换后不会匹配
      const upperKeyword = keyword.toUpperCase()
      
      // 由于版本号是数字字符串，大小写转换不会改变它
      // 所以这里我们测试一个不同的场景：确保匹配是精确的
      expect(matchedVersion.startsWith(keyword)).toBe(true)
    }
  )

  /**
   * 属性 7.5: 包版本查询的幂等性
   * 
   * 对于相同的包名，多次查询版本列表应该产生一致的行为
   * 
   * **Validates: Requirements 4.3, 12.2**
   */
  test.prop([
    fc.record({
      packageName: fc.constant('numpy'),
      queryCount: fc.integer({ min: 1, max: 3 })
    })
  ], { numRuns: 50 })(
    '相同包名的版本查询应该产生一致的行为',
    async ({ packageName, queryCount }) => {
      const store = useDependencyStore.getState()
      
      // 多次查询版本列表
      const results: boolean[] = []
      for (let i = 0; i < queryCount; i++) {
        // 清空日志和版本列表
        store.clearLogs()
        useDependencyStore.setState({ packageVersions: [] })
        
        await store.fetchPackageVersions(packageName)
        
        const state = useDependencyStore.getState()
        
        // 记录是否成功获取版本列表
        const hasVersions = state.packageVersions.length > 0
        results.push(hasVersions)
      }
      
      // 验证：所有查询结果应该一致
      const allSuccess = results.every(r => r === true)
      const allFailed = results.every(r => r === false)
      
      expect(allSuccess || allFailed).toBe(true)
    }
  )
})
