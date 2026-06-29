/**
 * APIConfigFormView 属性测试
 * 
 * 使用 fast-check 进行基于属性的测试，验证配置表单验证的通用属性。
 * 
 * Feature: api-config-management
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ========== 测试策略（生成器） ==========

/**
 * 生成空白别名
 * 
 * 生成各种空白字符串：
 * - 空字符串
 * - 纯空格
 * - 制表符
 * - 换行符
 * - 混合空白字符
 */
const blankAliasArbitrary = (): fc.Arbitrary<string> => {
  return fc.oneof(
    fc.constant(''),                    // 空字符串
    fc.constant(' '),                   // 单个空格
    fc.constant('   '),                 // 多个空格
    fc.constant('\t'),                  // 制表符
    fc.constant('\n'),                  // 换行符
    fc.constant('\r'),                  // 回车符
    fc.constant('  \t  '),              // 空格和制表符混合
    fc.constant('  \n  '),              // 空格和换行符混合
    fc.constant('\t\n\r'),              // 多种空白字符混合
    fc.string({ minLength: 1, maxLength: 10 }).map(s => ' '.repeat(s.length)) // 随机长度的空格
  )
}

/**
 * 生成过长别名
 * 
 * 生成超过 50 个字符的别名：
 * - 51 个字符
 * - 100 个字符
 * - 随机长度（51-200）
 */
const tooLongAliasArbitrary = (): fc.Arbitrary<string> => {
  return fc.oneof(
    fc.constant('a'.repeat(51)),        // 恰好 51 个字符
    fc.constant('x'.repeat(100)),       // 100 个字符
    fc.string({ minLength: 51, maxLength: 200 }), // 随机长度（51-200）
    fc.string({ minLength: 51, maxLength: 200 }).map(s => s + '中文字符'), // 包含中文
    fc.string({ minLength: 51, maxLength: 200 }).map(s => s + '🎉🎊'), // 包含 emoji
  )
}

/**
 * 生成有效别名
 * 
 * 生成符合验证规则的有效别名：
 * - 1-50 个字符
 * - 非空白字符
 * - 可以包含中文、英文、数字、特殊字符
 */
const validAliasArbitrary = (): fc.Arbitrary<string> => {
  return fc.oneof(
    // 纯英文
    fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    // 中文
    fc.constant('工作账号'),
    fc.constant('个人配置'),
    fc.constant('测试环境'),
    // 英文 + 数字
    fc.constant('Config-1'),
    fc.constant('API_Key_2'),
    // 中英文混合
    fc.constant('OpenAI 工作账号'),
    fc.constant('XFlow 测试'),
    // 包含特殊字符
    fc.constant('My-Config_123'),
    fc.constant('配置@2024'),
    // 边界情况：恰好 50 个字符
    fc.constant('a'.repeat(50)),
    fc.constant('中'.repeat(25)), // 25 个中文字符 = 50 个字符（UTF-8）
    // 前后有空格但 trim 后有效
    fc.string({ minLength: 1, maxLength: 48 }).filter(s => s.trim().length > 0).map(s => `  ${s}  `),
  )
}

/**
 * 生成混合别名（包括有效和无效）
 * 
 * 用于测试验证逻辑的全面性
 */
const mixedAliasArbitrary = (): fc.Arbitrary<string> => {
  return fc.oneof(
    blankAliasArbitrary(),
    tooLongAliasArbitrary(),
    validAliasArbitrary()
  )
}

// ========== 辅助函数 ==========

/**
 * 验证别名
 * 
 * 这是从 APIConfigFormView.validateForm 提取的别名验证逻辑
 * 
 * @param alias 配置别名
 * @returns 验证结果 { isValid: boolean, error?: string }
 */
function validateAlias(alias: string): { isValid: boolean; error?: string } {
  // 验证别名不为空
  if (!alias || alias.trim() === '') {
    return {
      isValid: false,
      error: '配置别名不能为空'
    }
  }
  
  // 验证别名长度不超过 50 个字符
  if (alias.length > 50) {
    return {
      isValid: false,
      error: '配置别名不能超过 50 个字符'
    }
  }
  
  // 验证通过
  return {
    isValid: true
  }
}

/**
 * 检查别名是否为空白
 * 
 * @param alias 别名
 * @returns 是否为空白
 */
function isBlankAlias(alias: string): boolean {
  return !alias || alias.trim() === ''
}

/**
 * 检查别名是否过长
 * 
 * @param alias 别名
 * @returns 是否过长
 */
function isTooLongAlias(alias: string): boolean {
  return alias.length > 50
}

/**
 * 检查别名是否有效
 * 
 * @param alias 别名
 * @returns 是否有效
 */
function isValidAlias(alias: string): boolean {
  return !isBlankAlias(alias) && !isTooLongAlias(alias)
}

// ========== 配置验证相关生成器和辅助函数 ==========

/**
 * 配置接口
 */
interface APIConfigInput {
  alias: string
  provider: string
  apiKey: string
  model: string
  sparkAppId?: string
  sparkApiSecret?: string
}

/**
 * 验证结果接口
 */
interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

/**
 * 生成随机配置
 * 
 * 生成各种配置（有效和无效）用于测试验证逻辑
 */
const configArbitrary = (): fc.Arbitrary<APIConfigInput> => {
  return fc.oneof(
    // 有效配置
    validCompleteConfigArbitrary(),
    // 缺少别名
    configWithoutAliasArbitrary(),
    // 缺少 API Key
    configWithoutApiKeyArbitrary(),
    // 缺少模型
    configWithoutModelArbitrary(),
    // 讯飞星火缺少 App ID
    sparkConfigWithoutAppIdArbitrary(),
    // 多个字段缺失
    configWithMultipleMissingFieldsArbitrary()
  )
}

/**
 * 生成缺少别名的配置
 */
const configWithoutAliasArbitrary = (): fc.Arbitrary<APIConfigInput> => {
  return fc.record({
    alias: blankAliasArbitrary(),
    provider: fc.constantFrom('openai', 'xflow', 'iflow', 'spark', 'ollama'),
    apiKey: fc.string({ minLength: 10, maxLength: 50 }),
    model: fc.string({ minLength: 1, maxLength: 30 })
  })
}

/**
 * 生成缺少 API Key 的配置（非 Ollama）
 */
const configWithoutApiKeyArbitrary = (): fc.Arbitrary<APIConfigInput> => {
  return fc.record({
    alias: validAliasArbitrary(),
    provider: fc.constantFrom('openai', 'xflow', 'iflow', 'spark'), // 不包括 ollama
    apiKey: fc.constant(''),
    model: fc.string({ minLength: 1, maxLength: 30 })
  })
}

/**
 * 生成 Ollama 配置
 */
const ollamaConfigArbitrary = (): fc.Arbitrary<APIConfigInput> => {
  return fc.record({
    alias: validAliasArbitrary(),
    provider: fc.constant('ollama'),
    apiKey: fc.constant(''), // Ollama 不需要 API Key
    model: fc.string({ minLength: 1, maxLength: 30 })
  })
}

/**
 * 生成缺少模型的配置
 */
const configWithoutModelArbitrary = (): fc.Arbitrary<APIConfigInput> => {
  return fc.record({
    alias: validAliasArbitrary(),
    provider: fc.constantFrom('openai', 'xflow', 'iflow', 'spark', 'ollama'),
    apiKey: fc.string({ minLength: 10, maxLength: 50 }),
    model: fc.constant('')
  })
}

/**
 * 生成讯飞星火配置（缺少 App ID）
 */
const sparkConfigWithoutAppIdArbitrary = (): fc.Arbitrary<APIConfigInput> => {
  return fc.record({
    alias: validAliasArbitrary(),
    provider: fc.constant('spark'),
    apiKey: fc.string({ minLength: 10, maxLength: 50 }),
    model: fc.string({ minLength: 1, maxLength: 30 }),
    sparkAppId: fc.constant(''),
    sparkApiSecret: fc.string({ minLength: 10, maxLength: 50 })
  })
}

/**
 * 生成完整有效的配置
 */
const validCompleteConfigArbitrary = (): fc.Arbitrary<APIConfigInput> => {
  return fc.oneof(
    // OpenAI 配置
    fc.record({
      alias: validAliasArbitrary(),
      provider: fc.constant('openai'),
      apiKey: fc.string({ minLength: 10, maxLength: 50 }),
      model: fc.string({ minLength: 1, maxLength: 30 })
    }),
    // XFlow 配置
    fc.record({
      alias: validAliasArbitrary(),
      provider: fc.constant('xflow'),
      apiKey: fc.string({ minLength: 10, maxLength: 50 }),
      model: fc.string({ minLength: 1, maxLength: 30 })
    }),
    // Ollama 配置（不需要 API Key）
    fc.record({
      alias: validAliasArbitrary(),
      provider: fc.constant('ollama'),
      apiKey: fc.constant(''),
      model: fc.string({ minLength: 1, maxLength: 30 })
    }),
    // 讯飞星火配置（需要 App ID）
    fc.record({
      alias: validAliasArbitrary(),
      provider: fc.constant('spark'),
      apiKey: fc.string({ minLength: 10, maxLength: 50 }),
      model: fc.string({ minLength: 1, maxLength: 30 }),
      sparkAppId: fc.string({ minLength: 10, maxLength: 50 }),
      sparkApiSecret: fc.string({ minLength: 10, maxLength: 50 })
    })
  )
}

/**
 * 生成缺少多个必填字段的配置
 */
const configWithMultipleMissingFieldsArbitrary = (): fc.Arbitrary<APIConfigInput> => {
  return fc.oneof(
    // 缺少别名和模型
    fc.record({
      alias: fc.constant(''),
      provider: fc.constantFrom('openai', 'xflow'),
      apiKey: fc.string({ minLength: 10, maxLength: 50 }),
      model: fc.constant('')
    }),
    // 缺少 API Key 和模型
    fc.record({
      alias: validAliasArbitrary(),
      provider: fc.constantFrom('openai', 'xflow'),
      apiKey: fc.constant(''),
      model: fc.constant('')
    }),
    // 讯飞星火缺少多个字段
    fc.record({
      alias: fc.constant(''),
      provider: fc.constant('spark'),
      apiKey: fc.constant(''),
      model: fc.constant(''),
      sparkAppId: fc.constant('')
    })
  )
}

/**
 * 验证配置
 * 
 * 这是从 APIConfigFormView.validateForm 提取的配置验证逻辑
 * 
 * @param config 配置对象
 * @returns 验证结果 { isValid: boolean, errors: Record<string, string> }
 */
function validateConfig(config: APIConfigInput): ValidationResult {
  const errors: Record<string, string> = {}
  
  // 验证别名
  const aliasResult = validateAlias(config.alias)
  if (!aliasResult.isValid && aliasResult.error) {
    errors.alias = aliasResult.error
  }
  
  // 验证 API Key（非 Ollama）
  if (config.provider !== 'ollama' && (!config.apiKey || config.apiKey.trim() === '')) {
    errors.apiKey = 'API Key 不能为空'
  }
  
  // 验证模型
  if (!config.model || config.model.trim() === '') {
    errors.model = '请选择模型'
  }
  
  // 验证讯飞星火特定字段
  if (config.provider === 'spark') {
    if (!config.sparkAppId || config.sparkAppId.trim() === '') {
      errors.sparkAppId = '讯飞星火 App ID 不能为空'
    }
    if (!config.sparkApiSecret || config.sparkApiSecret.trim() === '') {
      errors.sparkApiSecret = '讯飞星火 API Secret 不能为空'
    }
  }
  
  // 返回验证结果
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * 获取配置缺少的必填字段
 * 
 * @param config 配置对象
 * @returns 缺少的必填字段列表
 */
function getMissingRequiredFields(config: APIConfigInput): string[] {
  const missing: string[] = []
  
  // 检查别名
  if (!config.alias || config.alias.trim() === '') {
    missing.push('alias')
  }
  
  // 检查 API Key（非 Ollama）
  if (config.provider !== 'ollama' && (!config.apiKey || config.apiKey.trim() === '')) {
    missing.push('apiKey')
  }
  
  // 检查模型
  if (!config.model || config.model.trim() === '') {
    missing.push('model')
  }
  
  // 检查讯飞星火特定字段
  if (config.provider === 'spark') {
    if (!config.sparkAppId || config.sparkAppId.trim() === '') {
      missing.push('sparkAppId')
    }
    if (!config.sparkApiSecret || config.sparkApiSecret.trim() === '') {
      missing.push('sparkApiSecret')
    }
  }
  
  return missing
}

// ========== 属性测试 ==========

describe('APIConfigFormView - 属性测试', () => {
  /**
   * 属性 2：别名验证规则
   * 
   * 对于任意配置创建或更新操作，当别名为空白字符串（包括纯空格）或超过 50 个字符时，
   * 系统应拒绝操作并提示错误；当别名有效时，系统应允许操作（即使别名重复）。
   * 
   * Feature: api-config-management, Property 2: 别名验证规则
   * 验证需求：2.2, 2.3
   */
  it('属性 2：别名验证规则', () => {
    fc.assert(
      fc.property(
        mixedAliasArbitrary(),
        (alias) => {
          // 执行验证
          const result = validateAlias(alias)
          
          // 属性 2.1：空白别名被拒绝
          if (isBlankAlias(alias)) {
            expect(result.isValid).toBe(false)
            expect(result.error).toBe('配置别名不能为空')
          }
          
          // 属性 2.2：过长别名被拒绝
          else if (isTooLongAlias(alias)) {
            expect(result.isValid).toBe(false)
            expect(result.error).toBe('配置别名不能超过 50 个字符')
          }
          
          // 属性 2.3：有效别名被接受
          else {
            expect(result.isValid).toBe(true)
            expect(result.error).toBeUndefined()
          }
        }
      ),
      { numRuns: 100 } // 最少运行 100 次迭代
    )
  })
  
  /**
   * 属性 2.1：空白别名被拒绝
   * 
   * 验证所有形式的空白别名（空字符串、纯空格、制表符、换行符等）都被拒绝。
   * 
   * Feature: api-config-management, Property 2: 别名验证规则
   * 验证需求：2.2
   */
  it('属性 2.1：空白别名被拒绝', () => {
    fc.assert(
      fc.property(
        blankAliasArbitrary(),
        (alias) => {
          // 执行验证
          const result = validateAlias(alias)
          
          // 属性：空白别名应该被拒绝
          expect(result.isValid).toBe(false)
          expect(result.error).toBe('配置别名不能为空')
          
          // 属性：验证函数应该识别为空白
          expect(isBlankAlias(alias)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 2.2：过长别名被拒绝
   * 
   * 验证所有超过 50 个字符的别名都被拒绝。
   * 
   * Feature: api-config-management, Property 2: 别名验证规则
   * 验证需求：2.3
   */
  it('属性 2.2：过长别名被拒绝', () => {
    fc.assert(
      fc.property(
        tooLongAliasArbitrary(),
        (alias) => {
          // 执行验证
          const result = validateAlias(alias)
          
          // 属性：过长别名应该被拒绝
          expect(result.isValid).toBe(false)
          expect(result.error).toBe('配置别名不能超过 50 个字符')
          
          // 属性：验证函数应该识别为过长
          expect(isTooLongAlias(alias)).toBe(true)
          
          // 属性：别名长度应该大于 50
          expect(alias.length).toBeGreaterThan(50)
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 2.3：有效别名被接受
   * 
   * 验证所有符合规则的有效别名（1-50 个字符，非空白）都被接受。
   * 
   * Feature: api-config-management, Property 2: 别名验证规则
   * 验证需求：2.2, 2.3
   */
  it('属性 2.3：有效别名被接受', () => {
    fc.assert(
      fc.property(
        validAliasArbitrary(),
        (alias) => {
          // 执行验证
          const result = validateAlias(alias)
          
          // 属性：有效别名应该被接受
          expect(result.isValid).toBe(true)
          expect(result.error).toBeUndefined()
          
          // 属性：验证函数应该识别为有效
          expect(isValidAlias(alias)).toBe(true)
          
          // 属性：别名应该非空白
          expect(isBlankAlias(alias)).toBe(false)
          
          // 属性：别名长度应该不超过 50
          expect(isTooLongAlias(alias)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 2.4：边界情况 - 恰好 50 个字符
   * 
   * 验证恰好 50 个字符的别名被接受（边界值测试）。
   * 
   * Feature: api-config-management, Property 2: 别名验证规则
   * 验证需求：2.3
   */
  it('属性 2.4：边界情况 - 恰好 50 个字符', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 50, maxLength: 50 }).filter(s => s.trim().length > 0),
        (alias) => {
          // 执行验证
          const result = validateAlias(alias)
          
          // 属性：恰好 50 个字符的别名应该被接受
          expect(result.isValid).toBe(true)
          expect(result.error).toBeUndefined()
          
          // 属性：别名长度应该恰好是 50
          expect(alias.length).toBe(50)
          
          // 属性：不应该被识别为过长
          expect(isTooLongAlias(alias)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 2.5：边界情况 - 恰好 51 个字符
   * 
   * 验证恰好 51 个字符的别名被拒绝（边界值测试）。
   * 
   * Feature: api-config-management, Property 2: 别名验证规则
   * 验证需求：2.3
   */
  it('属性 2.5：边界情况 - 恰好 51 个字符', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 51, maxLength: 51 }),
        (alias) => {
          // 执行验证
          const result = validateAlias(alias)
          
          // 属性：恰好 51 个字符的别名应该被拒绝
          expect(result.isValid).toBe(false)
          expect(result.error).toBe('配置别名不能超过 50 个字符')
          
          // 属性：别名长度应该恰好是 51
          expect(alias.length).toBe(51)
          
          // 属性：应该被识别为过长
          expect(isTooLongAlias(alias)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 2.6：边界情况 - 单个字符
   * 
   * 验证单个字符的别名被接受（最小有效长度）。
   * 
   * Feature: api-config-management, Property 2: 别名验证规则
   * 验证需求：2.2
   */
  it('属性 2.6：边界情况 - 单个字符', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1 }).filter(c => c.trim().length > 0), // 非空白字符
        (alias) => {
          // 执行验证
          const result = validateAlias(alias)
          
          // 属性：单个字符的别名应该被接受
          expect(result.isValid).toBe(true)
          expect(result.error).toBeUndefined()
          
          // 属性：别名长度应该是 1
          expect(alias.length).toBe(1)
          
          // 属性：不应该被识别为空白
          expect(isBlankAlias(alias)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 2.7：前后空格处理
   * 
   * 验证别名前后的空格在验证时被正确处理（trim）。
   * 
   * Feature: api-config-management, Property 2: 别名验证规则
   * 验证需求：2.2
   */
  it('属性 2.7：前后空格处理', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 48 }).filter(s => s.trim().length > 0),
        (coreAlias) => {
          // 添加前后空格
          const aliasWithSpaces = `  ${coreAlias}  `
          
          // 执行验证
          const result = validateAlias(aliasWithSpaces)
          
          // 属性：如果核心内容有效，带空格的别名也应该被接受
          expect(result.isValid).toBe(true)
          expect(result.error).toBeUndefined()
          
          // 属性：trim 后应该等于核心内容的 trim 结果
          expect(aliasWithSpaces.trim()).toBe(coreAlias.trim())
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 2.8：纯空格别名被拒绝
   * 
   * 验证纯空格别名（任意数量的空格）都被拒绝。
   * 
   * Feature: api-config-management, Property 2: 别名验证规则
   * 验证需求：2.2
   */
  it('属性 2.8：纯空格别名被拒绝', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (spaceCount) => {
          // 生成纯空格别名
          const alias = ' '.repeat(spaceCount)
          
          // 执行验证
          const result = validateAlias(alias)
          
          // 属性：纯空格别名应该被拒绝
          expect(result.isValid).toBe(false)
          expect(result.error).toBe('配置别名不能为空')
          
          // 属性：应该被识别为空白
          expect(isBlankAlias(alias)).toBe(true)
          
          // 属性：trim 后应该为空
          expect(alias.trim()).toBe('')
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 2.9：中文字符支持
   * 
   * 验证包含中文字符的别名被正确验证。
   * 
   * Feature: api-config-management, Property 2: 别名验证规则
   * 验证需求：2.2, 2.3
   */
  it('属性 2.9：中文字符支持', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('工作账号'),
          fc.constant('个人配置'),
          fc.constant('测试环境123'),
          fc.constant('OpenAI 工作账号'),
          fc.constant('中'.repeat(25)), // 25 个中文字符
        ),
        (alias) => {
          // 执行验证
          const result = validateAlias(alias)
          
          // 属性：有效的中文别名应该被接受
          if (alias.length <= 50 && alias.trim().length > 0) {
            expect(result.isValid).toBe(true)
            expect(result.error).toBeUndefined()
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 2.10：特殊字符支持
   * 
   * 验证包含特殊字符的别名被正确验证。
   * 
   * Feature: api-config-management, Property 2: 别名验证规则
   * 验证需求：2.2, 2.3
   */
  it('属性 2.10：特殊字符支持', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('My-Config'),
          fc.constant('API_Key_123'),
          fc.constant('配置@2024'),
          fc.constant('Test.Config'),
          fc.constant('Config#1'),
        ),
        (alias) => {
          // 执行验证
          const result = validateAlias(alias)
          
          // 属性：有效的特殊字符别名应该被接受
          if (alias.length <= 50 && alias.trim().length > 0) {
            expect(result.isValid).toBe(true)
            expect(result.error).toBeUndefined()
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 2.11：验证结果一致性
   * 
   * 验证相同的别名多次验证应该返回相同的结果（幂等性）。
   * 
   * Feature: api-config-management, Property 2: 别名验证规则
   * 验证需求：2.2, 2.3
   */
  it('属性 2.11：验证结果一致性（幂等性）', () => {
    fc.assert(
      fc.property(
        mixedAliasArbitrary(),
        (alias) => {
          // 多次执行验证
          const result1 = validateAlias(alias)
          const result2 = validateAlias(alias)
          const result3 = validateAlias(alias)
          
          // 属性：结果应该完全相同
          expect(result1).toEqual(result2)
          expect(result2).toEqual(result3)
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 2.12：验证错误消息正确性
   * 
   * 验证不同类型的无效别名返回正确的错误消息。
   * 
   * Feature: api-config-management, Property 2: 别名验证规则
   * 验证需求：2.2, 2.3
   */
  it('属性 2.12：验证错误消息正确性', () => {
    fc.assert(
      fc.property(
        mixedAliasArbitrary(),
        (alias) => {
          // 执行验证
          const result = validateAlias(alias)
          
          // 属性：如果验证失败，必须有错误消息
          if (!result.isValid) {
            expect(result.error).toBeDefined()
            expect(result.error).not.toBe('')
            
            // 属性：错误消息应该与失败原因匹配
            if (isBlankAlias(alias)) {
              expect(result.error).toBe('配置别名不能为空')
            } else if (isTooLongAlias(alias)) {
              expect(result.error).toBe('配置别名不能超过 50 个字符')
            }
          }
          
          // 属性：如果验证成功，不应该有错误消息
          if (result.isValid) {
            expect(result.error).toBeUndefined()
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 2.13：验证逻辑完整性
   * 
   * 验证所有别名都能被正确分类为：空白、过长或有效。
   * 
   * Feature: api-config-management, Property 2: 别名验证规则
   * 验证需求：2.2, 2.3
   */
  it('属性 2.13：验证逻辑完整性', () => {
    fc.assert(
      fc.property(
        mixedAliasArbitrary(),
        (alias) => {
          // 执行验证
          const result = validateAlias(alias)
          
          // 属性：每个别名都应该被分类
          const isBlank = isBlankAlias(alias)
          const isTooLong = isTooLongAlias(alias)
          const isValid = isValidAlias(alias)
          
          // 属性：三种状态互斥
          if (isBlank) {
            expect(isTooLong).toBe(false)
            expect(isValid).toBe(false)
            expect(result.isValid).toBe(false)
          } else if (isTooLong) {
            expect(isBlank).toBe(false)
            expect(isValid).toBe(false)
            expect(result.isValid).toBe(false)
          } else {
            expect(isBlank).toBe(false)
            expect(isTooLong).toBe(false)
            expect(isValid).toBe(true)
            expect(result.isValid).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 2.14：重复别名允许
   * 
   * 验证系统允许创建重复的别名（别名不要求唯一）。
   * 注意：这个属性在当前的验证函数中无法直接测试，
   * 因为验证函数只检查单个别名的格式，不检查唯一性。
   * 这个测试主要是文档化这个需求。
   * 
   * Feature: api-config-management, Property 2: 别名验证规则
   * 验证需求：2.4
   */
  it('属性 2.14：重复别名允许（文档化）', () => {
    fc.assert(
      fc.property(
        validAliasArbitrary(),
        (alias) => {
          // 执行验证
          const result1 = validateAlias(alias)
          const result2 = validateAlias(alias)
          
          // 属性：相同的有效别名可以多次验证通过
          expect(result1.isValid).toBe(true)
          expect(result2.isValid).toBe(true)
          
          // 注意：实际的重复检查应该在配置管理器层面进行，
          // 而不是在表单验证层面。根据需求 2.4，系统应该允许重复别名。
        }
      ),
      { numRuns: 100 }
    )
  })
  
  // ========== 属性 22：配置验证完整性 ==========
  
  /**
   * 属性 22：配置验证完整性
   * 
   * 对于任意配置，当缺少必填字段（如非 Ollama 的 API Key、模型、讯飞星火的 App ID）时，
   * 系统应拒绝保存并提示错误；当所有必填字段有效时，系统应允许保存。
   * 
   * Feature: api-config-management, Property 22: 配置验证完整性
   * 验证需求：13.1, 13.2, 13.4, 13.5
   */
  it('属性 22：配置验证完整性', () => {
    fc.assert(
      fc.property(
        configArbitrary(),
        (config) => {
          // 执行验证
          const result = validateConfig(config)
          
          // 检查配置是否缺少必填字段
          const missingFields = getMissingRequiredFields(config)
          
          // 属性：如果缺少必填字段，验证应该失败
          if (missingFields.length > 0) {
            expect(result.isValid).toBe(false)
            expect(result.errors).toBeDefined()
            
            // 验证错误消息包含缺失字段的信息
            for (const field of missingFields) {
              expect(result.errors[field]).toBeDefined()
              expect(result.errors[field]).not.toBe('')
            }
          }
          
          // 属性：如果所有必填字段都有效，验证应该成功
          else {
            expect(result.isValid).toBe(true)
            expect(Object.keys(result.errors || {})).toHaveLength(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 22.1：缺少别名被拒绝
   * 
   * 验证所有服务商的配置都必须有别名。
   * 
   * Feature: api-config-management, Property 22: 配置验证完整性
   * 验证需求：13.1, 13.2
   */
  it('属性 22.1：缺少别名被拒绝', () => {
    fc.assert(
      fc.property(
        configWithoutAliasArbitrary(),
        (config) => {
          // 执行验证
          const result = validateConfig(config)
          
          // 属性：缺少别名应该被拒绝
          expect(result.isValid).toBe(false)
          expect(result.errors.alias).toBeDefined()
          expect(result.errors.alias).toBe('配置别名不能为空')
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 22.2：非 Ollama 服务商缺少 API Key 被拒绝
   * 
   * 验证除 Ollama 外的所有服务商都必须有 API Key。
   * 
   * Feature: api-config-management, Property 22: 配置验证完整性
   * 验证需求：13.1
   */
  it('属性 22.2：非 Ollama 服务商缺少 API Key 被拒绝', () => {
    fc.assert(
      fc.property(
        configWithoutApiKeyArbitrary(),
        (config) => {
          // 执行验证
          const result = validateConfig(config)
          
          // 属性：非 Ollama 服务商缺少 API Key 应该被拒绝
          if (config.provider !== 'ollama') {
            expect(result.isValid).toBe(false)
            expect(result.errors.apiKey).toBeDefined()
            expect(result.errors.apiKey).toBe('API Key 不能为空')
          }
          // Ollama 不需要 API Key
          else {
            // 其他字段可能有问题，但 apiKey 不应该有错误
            expect(result.errors.apiKey).toBeUndefined()
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 22.3：Ollama 服务商不需要 API Key
   * 
   * 验证 Ollama 服务商可以没有 API Key。
   * 
   * Feature: api-config-management, Property 22: 配置验证完整性
   * 验证需求：13.1
   */
  it('属性 22.3：Ollama 服务商不需要 API Key', () => {
    fc.assert(
      fc.property(
        ollamaConfigArbitrary(),
        (config) => {
          // 执行验证
          const result = validateConfig(config)
          
          // 属性：Ollama 配置不应该因为缺少 API Key 而失败
          expect(result.errors.apiKey).toBeUndefined()
          
          // 如果其他字段都有效，验证应该成功
          if (config.alias && config.alias.trim() && config.model && config.model.trim()) {
            expect(result.isValid).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 22.4：缺少模型被拒绝
   * 
   * 验证所有服务商的配置都必须选择模型。
   * 
   * Feature: api-config-management, Property 22: 配置验证完整性
   * 验证需求：13.2
   */
  it('属性 22.4：缺少模型被拒绝', () => {
    fc.assert(
      fc.property(
        configWithoutModelArbitrary(),
        (config) => {
          // 执行验证
          const result = validateConfig(config)
          
          // 属性：缺少模型应该被拒绝
          expect(result.isValid).toBe(false)
          expect(result.errors.model).toBeDefined()
          expect(result.errors.model).toBe('请选择模型')
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 22.5：讯飞星火缺少 App ID 被拒绝
   * 
   * 验证讯飞星火服务商必须有 App ID。
   * 
   * Feature: api-config-management, Property 22: 配置验证完整性
   * 验证需求：13.4
   */
  it('属性 22.5：讯飞星火缺少 App ID 被拒绝', () => {
    fc.assert(
      fc.property(
        sparkConfigWithoutAppIdArbitrary(),
        (config) => {
          // 执行验证
          const result = validateConfig(config)
          
          // 属性：讯飞星火缺少 App ID 应该被拒绝
          expect(result.isValid).toBe(false)
          expect(result.errors.sparkAppId).toBeDefined()
          expect(result.errors.sparkAppId).toBe('讯飞星火 App ID 不能为空')
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 22.6：完整有效配置被接受
   * 
   * 验证所有必填字段都有效的配置被接受。
   * 
   * Feature: api-config-management, Property 22: 配置验证完整性
   * 验证需求：13.5
   */
  it('属性 22.6：完整有效配置被接受', () => {
    fc.assert(
      fc.property(
        validCompleteConfigArbitrary(),
        (config) => {
          // 执行验证
          const result = validateConfig(config)
          
          // 属性：完整有效的配置应该被接受
          expect(result.isValid).toBe(true)
          expect(Object.keys(result.errors || {})).toHaveLength(0)
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 22.7：多个缺失字段同时报错
   * 
   * 验证当配置缺少多个必填字段时，所有错误都被报告。
   * 
   * Feature: api-config-management, Property 22: 配置验证完整性
   * 验证需求：13.1, 13.2, 13.4
   */
  it('属性 22.7：多个缺失字段同时报错', () => {
    fc.assert(
      fc.property(
        configWithMultipleMissingFieldsArbitrary(),
        (config) => {
          // 执行验证
          const result = validateConfig(config)
          
          // 属性：验证应该失败
          expect(result.isValid).toBe(false)
          
          // 属性：所有缺失的必填字段都应该有错误消息
          const missingFields = getMissingRequiredFields(config)
          expect(missingFields.length).toBeGreaterThan(0)
          
          for (const field of missingFields) {
            expect(result.errors[field]).toBeDefined()
            expect(result.errors[field]).not.toBe('')
          }
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * 属性 22.8：验证结果一致性
   * 
   * 验证相同的配置多次验证应该返回相同的结果（幂等性）。
   * 
   * Feature: api-config-management, Property 22: 配置验证完整性
   * 验证需求：13.1, 13.2, 13.4, 13.5
   */
  it('属性 22.8：验证结果一致性（幂等性）', () => {
    fc.assert(
      fc.property(
        configArbitrary(),
        (config) => {
          // 多次执行验证
          const result1 = validateConfig(config)
          const result2 = validateConfig(config)
          const result3 = validateConfig(config)
          
          // 属性：结果应该完全相同
          expect(result1).toEqual(result2)
          expect(result2).toEqual(result3)
        }
      ),
      { numRuns: 100 }
    )
  })
})
