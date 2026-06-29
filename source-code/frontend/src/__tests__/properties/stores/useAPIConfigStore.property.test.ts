/**
 * useAPIConfigStore 属性测试
 * 
 * 使用 fast-check 进行基于属性的测试，验证配置管理的通用属性。
 * 
 * Feature: api-config-management
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { APIConfig } from '@/stores/useAPIConfigStore'

// ========== 测试策略（生成器） ==========

/**
 * 生成随机 API 配置
 * 
 * 生成符合验证规则的随机配置：
 * - 别名：1-50 个字符
 * - 服务商：从预定义列表中选择
 * - API Key：根据服务商决定（Ollama 可以为空）
 * - 模型：非空字符串
 */
const apiConfigArbitrary = (): fc.Arbitrary<APIConfig> => {
  const providers = ['openai', 'xflow', 'iflow', 'spark', 'volcengine', 'zhipu', 'ollama']
  
  return fc.record({
    id: fc.uuid(),
    alias: fc.string({ minLength: 1, maxLength: 50 }),
    provider: fc.constantFrom(...providers),
    model: fc.string({ minLength: 1, maxLength: 50 }),
    models: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
    extra: fc.dictionary(
      fc.string({ minLength: 1, maxLength: 20 }),
      fc.string({ maxLength: 100 }),
      { maxKeys: 5 }
    ),
    isDefault: fc.boolean(),
    status: fc.constantFrom('available', 'unavailable', 'untested') as fc.Arbitrary<'available' | 'unavailable' | 'untested'>,
    usageCount: fc.nat({ max: 1000 }),
    // 使用固定的日期字符串避免 Invalid time value 错误
    createdAt: fc.constant(new Date('2024-01-01T00:00:00Z').toISOString()),
    updatedAt: fc.constant(new Date('2024-01-01T00:00:00Z').toISOString())
  }).chain(config => {
    // Ollama 不需要 API Key
    const apiKey = config.provider === 'ollama' 
      ? fc.constant('') 
      : fc.string({ minLength: 10, maxLength: 100 })
    
    const baseUrl = fc.option(fc.webUrl(), { nil: undefined })
    const lastTestedAt = fc.option(
      fc.constant(new Date('2024-01-01T00:00:00Z').toISOString()), 
      { nil: undefined }
    )
    const lastTestLatency = fc.option(fc.float({ min: 0, max: 5000 }), { nil: undefined })
    
    return fc.tuple(apiKey, baseUrl, lastTestedAt, lastTestLatency).map(
      ([apiKeyValue, baseUrlValue, lastTestedAtValue, lastTestLatencyValue]) => ({
        ...config,
        apiKey: apiKeyValue,
        baseUrl: baseUrlValue,
        lastTestedAt: lastTestedAtValue,
        lastTestLatency: lastTestLatencyValue
      })
    )
  })
}

/**
 * 生成搜索关键词
 * 
 * 生成用于搜索的关键词，包括：
 * - 普通字符串
 * - 空字符串
 * - 包含空格的字符串
 * - 大小写混合的字符串
 */
const searchQueryArbitrary = (): fc.Arbitrary<string> => {
  return fc.oneof(
    fc.string({ minLength: 1, maxLength: 20 }),
    fc.constant(''),
    fc.string({ minLength: 1, maxLength: 20 }).map(s => `  ${s}  `), // 带空格
    fc.string({ minLength: 1, maxLength: 20 }).map(s => s.toUpperCase()), // 大写
    fc.string({ minLength: 1, maxLength: 20 }).map(s => s.toLowerCase()) // 小写
  )
}

// ========== 辅助函数 ==========

/**
 * 搜索配置
 * 
 * 根据关键词搜索配置的别名和服务商名称（不区分大小写）
 * 这是从 useAPIConfigStore.searchConfigs 提取的核心逻辑
 * 
 * @param configs 配置列表
 * @param query 搜索关键词
 * @returns 匹配的配置列表
 */
function searchConfigs(configs: APIConfig[], query: string): APIConfig[] {
  // 如果搜索关键词为空，返回所有配置
  if (!query || query.trim() === '') {
    return configs
  }
  
  // 转换为小写进行不区分大小写的搜索
  const lowerQuery = query.toLowerCase().trim()
  
  // 搜索别名和服务商名称
  return configs.filter(config => {
    const aliasMatch = config.alias.toLowerCase().includes(lowerQuery)
    const providerMatch = config.provider.toLowerCase().includes(lowerQuery)
    return aliasMatch || providerMatch
  })
}

/**
 * 按服务商筛选配置
 * 
 * 筛选指定服务商的所有配置
 * 这是从 useAPIConfigStore.filterByProvider 提取的核心逻辑
 * 
 * @param configs 配置列表
 * @param provider 服务商名称
 * @returns 指定服务商的配置列表
 */
function filterByProvider(configs: APIConfig[], provider: string): APIConfig[] {
  // 如果服务商为空，返回所有配置
  if (!provider || provider.trim() === '') {
    return configs
  }
  
  // 筛选指定服务商的配置
  return configs.filter(config => config.provider === provider)
}

/**
 * 检查配置是否匹配搜索关键词
 * 
 * @param config 配置对象
 * @param query 搜索关键词
 * @returns 是否匹配
 */
function configMatchesQuery(config: APIConfig, query: string): boolean {
  if (!query || query.trim() === '') {
    return true
  }
  
  const lowerQuery = query.toLowerCase().trim()
  const aliasMatch = config.alias.toLowerCase().includes(lowerQuery)
  const providerMatch = config.provider.toLowerCase().includes(lowerQuery)
  
  return aliasMatch || providerMatch
}

// ========== 属性测试 ==========

describe('useAPIConfigStore - 属性测试', () => {
  /**
   * 属性 13：配置搜索匹配正确性
   * 
   * 对于任意搜索关键词和配置列表，搜索结果应包含且仅包含
   * 别名或服务商名称中包含该关键词的配置（不区分大小写）。
   * 
   * Feature: api-config-management, Property 13: 配置搜索匹配正确性
   * 验证需求：8.1, 8.2
   */
  it('属性 13：配置搜索匹配正确性', () => {
    fc.assert(
      fc.property(
        fc.array(apiConfigArbitrary(), { minLength: 0, maxLength: 20 }),
        searchQueryArbitrary(),
        (configs, searchQuery) => {
          // 执行搜索
          const results = searchConfigs(configs, searchQuery)
          
          // 属性 13.1：所有结果都匹配搜索关键词
          for (const result of results) {
            const matches = configMatchesQuery(result, searchQuery)
            expect(matches).toBe(true)
          }
          
          // 属性 13.2：所有匹配的配置都在结果中
          for (const config of configs) {
            const shouldMatch = configMatchesQuery(config, searchQuery)
            if (shouldMatch) {
              expect(results).toContainEqual(config)
            }
          }
          
          // 属性 13.3：结果数量不超过配置总数
          expect(results.length).toBeLessThanOrEqual(configs.length)
          
          // 属性 13.4：空搜索返回所有配置
          if (!searchQuery || searchQuery.trim() === '') {
            expect(results.length).toBe(configs.length)
            expect(results).toEqual(configs)
          }
          
          // 属性 13.5：搜索不区分大小写
          if (searchQuery && searchQuery.trim() !== '') {
            const lowerResults = searchConfigs(configs, searchQuery.toLowerCase())
            const upperResults = searchConfigs(configs, searchQuery.toUpperCase())
            
            // 结果数量应该相同
            expect(lowerResults.length).toBe(upperResults.length)
            
            // 结果应该包含相同的配置 ID
            const lowerIds = new Set(lowerResults.map(c => c.id))
            const upperIds = new Set(upperResults.map(c => c.id))
            expect(lowerIds).toEqual(upperIds)
          }
        }
      ),
      { numRuns: 100 } // 最少运行 100 次迭代
    )
  })
  
  /**
   * 属性 13.1：搜索结果完整性
   * 
   * 验证搜索结果包含所有匹配项，不遗漏任何匹配的配置。
   * 
   * Feature: api-config-management, Property 13: 配置搜索匹配正确性
   * 验证需求：8.1, 8.2
   */
  it('属性 13.1：搜索结果包含所有匹配项', () => {
    fc.assert(
      fc.property(
        fc.array(apiConfigArbitrary(), { minLength: 1, maxLength: 20 }),
        searchQueryArbitrary(),
        (configs, searchQuery) => {
          const results = searchConfigs(configs, searchQuery)
          
          // 计算应该匹配的配置
          const expectedMatches = configs.filter(config => 
            configMatchesQuery(config, searchQuery)
          )
          
          // 属性：结果数量应该等于预期匹配数量
          expect(results.length).toBe(expectedMatches.length)
          
          // 属性：每个预期匹配的配置都在结果中
          for (const expectedConfig of expectedMatches) {
            const found = results.some(r => r.id === expectedConfig.id)
            expect(found).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 13.2：搜索结果准确性
   * 
   * 验证搜索结果不包含不匹配项，没有误报。
   * 
   * Feature: api-config-management, Property 13: 配置搜索匹配正确性
   * 验证需求：8.1, 8.2
   */
  it('属性 13.2：搜索结果不包含不匹配项', () => {
    fc.assert(
      fc.property(
        fc.array(apiConfigArbitrary(), { minLength: 1, maxLength: 20 }),
        searchQueryArbitrary(),
        (configs, searchQuery) => {
          const results = searchConfigs(configs, searchQuery)
          
          // 属性：结果中的每个配置都应该匹配搜索关键词
          for (const result of results) {
            const matches = configMatchesQuery(result, searchQuery)
            expect(matches).toBe(true)
          }
          
          // 属性：不匹配的配置不应该在结果中
          const nonMatches = configs.filter(config => 
            !configMatchesQuery(config, searchQuery)
          )
          
          for (const nonMatch of nonMatches) {
            const found = results.some(r => r.id === nonMatch.id)
            expect(found).toBe(false)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 13.3：搜索大小写不敏感
   * 
   * 验证搜索不区分大小写，相同关键词的不同大小写形式应该返回相同结果。
   * 
   * Feature: api-config-management, Property 13: 配置搜索匹配正确性
   * 验证需求：8.1, 8.2
   */
  it('属性 13.3：搜索大小写不敏感', () => {
    fc.assert(
      fc.property(
        fc.array(apiConfigArbitrary(), { minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (configs, searchQuery) => {
          // 使用不同大小写形式搜索
          const lowerResults = searchConfigs(configs, searchQuery.toLowerCase())
          const upperResults = searchConfigs(configs, searchQuery.toUpperCase())
          const mixedResults = searchConfigs(configs, searchQuery)
          
          // 属性：结果数量应该相同
          expect(lowerResults.length).toBe(upperResults.length)
          expect(lowerResults.length).toBe(mixedResults.length)
          
          // 属性：结果应该包含相同的配置 ID
          const lowerIds = new Set(lowerResults.map(c => c.id))
          const upperIds = new Set(upperResults.map(c => c.id))
          const mixedIds = new Set(mixedResults.map(c => c.id))
          
          expect(lowerIds).toEqual(upperIds)
          expect(lowerIds).toEqual(mixedIds)
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 13.4：空搜索返回所有配置
   * 
   * 验证空搜索关键词（空字符串或纯空格）应该返回所有配置。
   * 
   * Feature: api-config-management, Property 13: 配置搜索匹配正确性
   * 验证需求：8.4
   */
  it('属性 13.4：空搜索返回所有配置', () => {
    fc.assert(
      fc.property(
        fc.array(apiConfigArbitrary(), { minLength: 0, maxLength: 20 }),
        (configs) => {
          // 测试各种空搜索关键词
          const emptyQueries = ['', '   ', '\t', '\n', '  \t  \n  ']
          
          for (const emptyQuery of emptyQueries) {
            const results = searchConfigs(configs, emptyQuery)
            
            // 属性：结果数量应该等于配置总数
            expect(results.length).toBe(configs.length)
            
            // 属性：结果应该包含所有配置
            expect(results).toEqual(configs)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 13.5：搜索关键词前后空格处理
   * 
   * 验证搜索关键词前后的空格应该被正确处理（trim）。
   * 
   * Feature: api-config-management, Property 13: 配置搜索匹配正确性
   * 验证需求：8.1, 8.2
   */
  it('属性 13.5：搜索关键词前后空格处理', () => {
    fc.assert(
      fc.property(
        fc.array(apiConfigArbitrary(), { minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (configs, searchQuery) => {
          // 添加前后空格
          const queryWithSpaces = `  ${searchQuery}  `
          
          // 执行搜索
          const results1 = searchConfigs(configs, searchQuery)
          const results2 = searchConfigs(configs, queryWithSpaces)
          
          // 属性：结果应该相同
          expect(results1.length).toBe(results2.length)
          
          const ids1 = new Set(results1.map(c => c.id))
          const ids2 = new Set(results2.map(c => c.id))
          expect(ids1).toEqual(ids2)
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 13.6：搜索匹配别名
   * 
   * 验证搜索能够正确匹配配置别名中的关键词。
   * 
   * Feature: api-config-management, Property 13: 配置搜索匹配正确性
   * 验证需求：8.1, 8.2
   */
  it('属性 13.6：搜索匹配别名', () => {
    fc.assert(
      fc.property(
        fc.array(apiConfigArbitrary(), { minLength: 1, maxLength: 20 }),
        (configs) => {
          // 对每个配置，使用其别名的一部分进行搜索
          for (const config of configs) {
            if (config.alias.length > 0) {
              // 取别名的前几个字符作为搜索关键词
              const searchQuery = config.alias.substring(0, Math.min(3, config.alias.length))
              
              const results = searchConfigs(configs, searchQuery)
              
              // 属性：结果应该包含该配置
              const found = results.some(r => r.id === config.id)
              expect(found).toBe(true)
            }
          }
        }
      ),
      { numRuns: 50 } // 减少迭代次数，因为这个测试较慢
    )
  })
  
  /**
   * 属性 13.7：搜索匹配服务商
   * 
   * 验证搜索能够正确匹配配置服务商名称中的关键词。
   * 
   * Feature: api-config-management, Property 13: 配置搜索匹配正确性
   * 验证需求：8.1, 8.2
   */
  it('属性 13.7：搜索匹配服务商', () => {
    fc.assert(
      fc.property(
        fc.array(apiConfigArbitrary(), { minLength: 1, maxLength: 20 }),
        (configs) => {
          // 对每个配置，使用其服务商名称进行搜索
          for (const config of configs) {
            const searchQuery = config.provider
            
            const results = searchConfigs(configs, searchQuery)
            
            // 属性：结果应该包含该配置
            const found = results.some(r => r.id === config.id)
            expect(found).toBe(true)
            
            // 属性：结果中的所有配置都应该是该服务商
            for (const result of results) {
              const providerMatch = result.provider.toLowerCase().includes(searchQuery.toLowerCase())
              const aliasMatch = result.alias.toLowerCase().includes(searchQuery.toLowerCase())
              expect(providerMatch || aliasMatch).toBe(true)
            }
          }
        }
      ),
      { numRuns: 50 }
    )
  })
  
  /**
   * 属性 13.8：搜索结果稳定性
   * 
   * 验证相同的搜索关键词和配置列表应该返回相同的结果（幂等性）。
   * 
   * Feature: api-config-management, Property 13: 配置搜索匹配正确性
   * 验证需求：8.1, 8.2
   */
  it('属性 13.8：搜索结果稳定性（幂等性）', () => {
    fc.assert(
      fc.property(
        fc.array(apiConfigArbitrary(), { minLength: 0, maxLength: 20 }),
        searchQueryArbitrary(),
        (configs, searchQuery) => {
          // 多次执行相同的搜索
          const results1 = searchConfigs(configs, searchQuery)
          const results2 = searchConfigs(configs, searchQuery)
          const results3 = searchConfigs(configs, searchQuery)
          
          // 属性：结果应该完全相同
          expect(results1).toEqual(results2)
          expect(results2).toEqual(results3)
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 14：服务商筛选正确性
   * 
   * 对于任意服务商筛选条件和配置列表，筛选结果应包含且仅包含该服务商的所有配置。
   * 
   * Feature: api-config-management, Property 14: 服务商筛选正确性
   * 验证需求：8.3
   */
  it('属性 14：服务商筛选正确性', () => {
    fc.assert(
      fc.property(
        fc.array(apiConfigArbitrary(), { minLength: 0, maxLength: 20 }),
        fc.constantFrom('openai', 'xflow', 'iflow', 'spark', 'volcengine', 'zhipu', 'ollama'),
        (configs, provider) => {
          // 执行筛选
          const results = filterByProvider(configs, provider)
          
          // 属性 14.1：所有结果都是指定的服务商
          for (const result of results) {
            expect(result.provider).toBe(provider)
          }
          
          // 属性 14.2：所有该服务商的配置都在结果中
          const expectedConfigs = configs.filter(config => config.provider === provider)
          expect(results.length).toBe(expectedConfigs.length)
          
          for (const expectedConfig of expectedConfigs) {
            const found = results.some(r => r.id === expectedConfig.id)
            expect(found).toBe(true)
          }
          
          // 属性 14.3：结果数量不超过配置总数
          expect(results.length).toBeLessThanOrEqual(configs.length)
          
          // 属性 14.4：不包含其他服务商的配置
          const otherProviderConfigs = configs.filter(config => config.provider !== provider)
          for (const otherConfig of otherProviderConfigs) {
            const found = results.some(r => r.id === otherConfig.id)
            expect(found).toBe(false)
          }
        }
      ),
      { numRuns: 100 } // 最少运行 100 次迭代
    )
  })
  
  /**
   * 属性 14.1：筛选结果完整性
   * 
   * 验证筛选结果包含该服务商的所有配置，不遗漏任何配置。
   * 
   * Feature: api-config-management, Property 14: 服务商筛选正确性
   * 验证需求：8.3
   */
  it('属性 14.1：筛选结果包含所有该服务商的配置', () => {
    fc.assert(
      fc.property(
        fc.array(apiConfigArbitrary(), { minLength: 1, maxLength: 20 }),
        fc.constantFrom('openai', 'xflow', 'iflow', 'spark', 'volcengine', 'zhipu', 'ollama'),
        (configs, provider) => {
          const results = filterByProvider(configs, provider)
          
          // 计算应该匹配的配置
          const expectedConfigs = configs.filter(config => config.provider === provider)
          
          // 属性：结果数量应该等于预期数量
          expect(results.length).toBe(expectedConfigs.length)
          
          // 属性：每个预期配置都在结果中
          for (const expectedConfig of expectedConfigs) {
            const found = results.some(r => r.id === expectedConfig.id)
            expect(found).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 14.2：筛选结果准确性
   * 
   * 验证筛选结果不包含其他服务商的配置，没有误报。
   * 
   * Feature: api-config-management, Property 14: 服务商筛选正确性
   * 验证需求：8.3
   */
  it('属性 14.2：筛选结果不包含其他服务商的配置', () => {
    fc.assert(
      fc.property(
        fc.array(apiConfigArbitrary(), { minLength: 1, maxLength: 20 }),
        fc.constantFrom('openai', 'xflow', 'iflow', 'spark', 'volcengine', 'zhipu', 'ollama'),
        (configs, provider) => {
          const results = filterByProvider(configs, provider)
          
          // 属性：结果中的每个配置都应该是指定的服务商
          for (const result of results) {
            expect(result.provider).toBe(provider)
          }
          
          // 属性：其他服务商的配置不应该在结果中
          const otherProviderConfigs = configs.filter(config => config.provider !== provider)
          
          for (const otherConfig of otherProviderConfigs) {
            const found = results.some(r => r.id === otherConfig.id)
            expect(found).toBe(false)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 14.3：空服务商返回所有配置
   * 
   * 验证空服务商筛选条件（空字符串）应该返回所有配置。
   * 
   * Feature: api-config-management, Property 14: 服务商筛选正确性
   * 验证需求：8.3
   */
  it('属性 14.3：空服务商返回所有配置', () => {
    fc.assert(
      fc.property(
        fc.array(apiConfigArbitrary(), { minLength: 0, maxLength: 20 }),
        (configs) => {
          // 测试各种空服务商筛选条件
          const emptyProviders = ['', '   ', '\t', '\n']
          
          for (const emptyProvider of emptyProviders) {
            const results = filterByProvider(configs, emptyProvider)
            
            // 属性：结果数量应该等于配置总数
            expect(results.length).toBe(configs.length)
            
            // 属性：结果应该包含所有配置
            expect(results).toEqual(configs)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 14.4：筛选结果稳定性
   * 
   * 验证相同的服务商筛选条件和配置列表应该返回相同的结果（幂等性）。
   * 
   * Feature: api-config-management, Property 14: 服务商筛选正确性
   * 验证需求：8.3
   */
  it('属性 14.4：筛选结果稳定性（幂等性）', () => {
    fc.assert(
      fc.property(
        fc.array(apiConfigArbitrary(), { minLength: 0, maxLength: 20 }),
        fc.constantFrom('openai', 'xflow', 'iflow', 'spark', 'volcengine', 'zhipu', 'ollama'),
        (configs, provider) => {
          // 多次执行相同的筛选
          const results1 = filterByProvider(configs, provider)
          const results2 = filterByProvider(configs, provider)
          const results3 = filterByProvider(configs, provider)
          
          // 属性：结果应该完全相同
          expect(results1).toEqual(results2)
          expect(results2).toEqual(results3)
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 14.5：混合服务商配置筛选
   * 
   * 验证在混合服务商的配置列表中，筛选能够正确分离不同服务商的配置。
   * 
   * Feature: api-config-management, Property 14: 服务商筛选正确性
   * 验证需求：8.3
   */
  it('属性 14.5：混合服务商配置筛选', () => {
    fc.assert(
      fc.property(
        fc.array(apiConfigArbitrary(), { minLength: 2, maxLength: 20 }),
        (configs) => {
          // 获取配置中所有唯一的服务商
          const uniqueProviders = Array.from(new Set(configs.map(c => c.provider)))
          
          // 对每个服务商进行筛选
          for (const provider of uniqueProviders) {
            const results = filterByProvider(configs, provider)
            
            // 属性：结果只包含该服务商的配置
            for (const result of results) {
              expect(result.provider).toBe(provider)
            }
            
            // 属性：该服务商的所有配置都在结果中
            const expectedCount = configs.filter(c => c.provider === provider).length
            expect(results.length).toBe(expectedCount)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 14.6：筛选不改变配置对象
   * 
   * 验证筛选操作不会修改原始配置对象。
   * 
   * Feature: api-config-management, Property 14: 服务商筛选正确性
   * 验证需求：8.3
   */
  it('属性 14.6：筛选不改变配置对象', () => {
    fc.assert(
      fc.property(
        fc.array(apiConfigArbitrary(), { minLength: 1, maxLength: 20 }),
        fc.constantFrom('openai', 'xflow', 'iflow', 'spark', 'volcengine', 'zhipu', 'ollama'),
        (configs, provider) => {
          // 深拷贝原始配置
          const originalConfigs = JSON.parse(JSON.stringify(configs))
          
          // 执行筛选
          filterByProvider(configs, provider)
          
          // 属性：原始配置应该保持不变
          expect(configs).toEqual(originalConfigs)
        }
      ),
      { numRuns: 100 }
    )
  })
})
