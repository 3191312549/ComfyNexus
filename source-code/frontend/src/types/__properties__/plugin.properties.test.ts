/**
 * Plugin 类型属性测试 - 数据序列化 Round-trip
 * 
 * 使用 fast-check 进行基于属性的测试
 * 验证插件对象序列化和反序列化的正确性
 * 
 * 验证需求: 17.4
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { PluginInfo, Dependency, Commit, BranchInfo } from '../plugin';

describe('Plugin 类型属性测试 - 数据序列化 Round-trip', () => {
  /**
   * 属性 17: 数据序列化 Round-trip
   * 
   * 对于任意有效的插件对象，序列化为 JSON 后再反序列化，应该产生等价的对象
   * 
   * **Validates: Requirements 17.4**
   */
  describe('属性 17: 数据序列化 Round-trip', () => {
    it('对于任意插件对象，序列化后反序列化应该得到等价对象', () => {
      fc.assert(
        fc.property(
          fc.record<PluginInfo>({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            path: fc.string({ minLength: 1, maxLength: 200 }),
            is_git_repo: fc.boolean(),
            git_url: fc.option(fc.webUrl(), { nil: null }),
            branch: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
            default_branch: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
            commit_hash: fc.option(
              fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'), { minLength: 7, maxLength: 7 }),
              { nil: null }
            ),
            commit_date: fc.option(
              fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
                .map(d => d.toISOString()),
              { nil: null }
            ),
            has_update: fc.boolean(),
            behind_commits: fc.nat({ max: 1000 }),
            dependency_updated: fc.boolean(),
            dependency_viewed: fc.boolean(),
          }),
          (plugin) => {
            // 序列化
            const serialized = JSON.stringify(plugin);
            
            // 反序列化
            const deserialized: PluginInfo = JSON.parse(serialized);
            
            // 验证所有字段相等
            expect(deserialized.name).toBe(plugin.name);
            expect(deserialized.path).toBe(plugin.path);
            expect(deserialized.is_git_repo).toBe(plugin.is_git_repo);
            expect(deserialized.git_url).toBe(plugin.git_url);
            expect(deserialized.branch).toBe(plugin.branch);
            expect(deserialized.default_branch).toBe(plugin.default_branch);
            expect(deserialized.commit_hash).toBe(plugin.commit_hash);
            expect(deserialized.commit_date).toBe(plugin.commit_date);
            expect(deserialized.has_update).toBe(plugin.has_update);
            expect(deserialized.behind_commits).toBe(plugin.behind_commits);
            expect(deserialized.dependency_updated).toBe(plugin.dependency_updated);
            expect(deserialized.dependency_viewed).toBe(plugin.dependency_viewed);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('对于任意依赖对象，序列化后反序列化应该得到等价对象', () => {
      fc.assert(
        fc.property(
          fc.record<Dependency>({
            package: fc.string({ minLength: 1, maxLength: 100 }),
            version: fc.string({ minLength: 1, maxLength: 50 }),
            installed: fc.boolean(),
            installed_version: fc.string({ minLength: 1, maxLength: 50 }),
            message: fc.string({ minLength: 0, maxLength: 200 }),
          }),
          (dependency) => {
            const serialized = JSON.stringify(dependency);
            const deserialized: Dependency = JSON.parse(serialized);
            
            expect(deserialized).toEqual(dependency);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('对于任意提交对象，序列化后反序列化应该得到等价对象', () => {
      fc.assert(
        fc.property(
          fc.record<Commit>({
            hash: fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'), { minLength: 7, maxLength: 7 }),
            message: fc.string({ minLength: 1, maxLength: 200 }),
            date: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
              .map(d => d.toISOString()),
          }),
          (commit) => {
            const serialized = JSON.stringify(commit);
            const deserialized: Commit = JSON.parse(serialized);
            
            expect(deserialized).toEqual(commit);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('对于任意分支对象，序列化后反序列化应该得到等价对象', () => {
      fc.assert(
        fc.property(
          fc.record<BranchInfo>({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            is_current: fc.boolean(),
            is_default: fc.boolean(),
          }),
          (branch) => {
            const serialized = JSON.stringify(branch);
            const deserialized: BranchInfo = JSON.parse(serialized);
            
            expect(deserialized).toEqual(branch);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
