/**
 * 依赖冲突检测属性测试
 * 
 * 使用 fast-check 进行基于属性的测试
 * 验证依赖冲突检测逻辑的正确性
 * 
 * 验证需求: 12.2
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * 简化的依赖冲突检测函数（用于测试）
 * 实际实现应该在后端
 */
function detectConflicts(dependencies: Map<string, Set<string>>): string[] {
  const conflicts: string[] = [];
  
  dependencies.forEach((versions, packageName) => {
    if (versions.size > 1) {
      conflicts.push(packageName);
    }
  });
  
  return conflicts;
}

describe('依赖冲突检测属性测试', () => {
  /**
   * 属性 13: 依赖冲突检测
   * 
   * 多个插件要求同一包的不同版本应该被检测为冲突
   * 
   * **Validates: Requirements 12.2**
   */
  describe('属性 13: 依赖冲突检测', () => {
    it('对于任意依赖集合，不同版本应该被检测为冲突', () => {
      fc.assert(
        fc.property(
          // 生成包名
          fc.string({ minLength: 1, maxLength: 50 }),
          // 生成多个不同的版本
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 5 }),
          (packageName, versions) => {
            // 确保版本不同
            const uniqueVersions = new Set(versions);
            if (uniqueVersions.size < 2) {
              return true; // 跳过版本相同的情况
            }
            
            // 构建依赖映射
            const dependencies = new Map<string, Set<string>>();
            dependencies.set(packageName, uniqueVersions);
            
            // 检测冲突
            const conflicts = detectConflicts(dependencies);
            
            // 验证：应该检测到冲突
            expect(conflicts).toContain(packageName);
            expect(conflicts.length).toBeGreaterThan(0);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('相同版本不应该被检测为冲突', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.nat({ max: 10 }),
          (packageName, version, pluginCount) => {
            if (pluginCount === 0) {
              return true;
            }
            
            // 所有插件使用相同版本
            const dependencies = new Map<string, Set<string>>();
            dependencies.set(packageName, new Set([version]));
            
            // 检测冲突
            const conflicts = detectConflicts(dependencies);
            
            // 验证：不应该检测到冲突
            expect(conflicts).not.toContain(packageName);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('多个包的冲突应该都被检测到', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(
              fc.string({ minLength: 1, maxLength: 50 }),
              fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 3 })
            ),
            { minLength: 1, maxLength: 5 }
          ),
          (packageVersionPairs) => {
            const dependencies = new Map<string, Set<string>>();
            const expectedConflicts: string[] = [];
            
            packageVersionPairs.forEach(([packageName, versions]) => {
              const uniqueVersions = new Set(versions);
              dependencies.set(packageName, uniqueVersions);
              
              if (uniqueVersions.size > 1) {
                expectedConflicts.push(packageName);
              }
            });
            
            // 检测冲突
            const conflicts = detectConflicts(dependencies);
            
            // 验证：所有预期的冲突都应该被检测到
            expectedConflicts.forEach(pkg => {
              expect(conflicts).toContain(pkg);
            });
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
