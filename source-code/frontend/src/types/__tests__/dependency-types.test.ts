/**
 * 依赖冲突分析类型定义测试
 * 
 * 验证 TypeScript 类型定义与后端数据模型的一致性
 */

import { describe, it, expect } from 'vitest';
import type { DependencyNode, ConflictInfo, AnalysisResult } from '../dependency';

describe('依赖冲突分析类型定义', () => {
  describe('DependencyNode 接口', () => {
    it('应该包含所有必需字段', () => {
      const node: DependencyNode = {
        id: 'test-1',
        packageName: 'numpy',
        installedVersion: '1.24.0',
        dependencies: [],
        hasConflict: false,
        depth: 0
      };

      expect(node.id).toBe('test-1');
      expect(node.packageName).toBe('numpy');
      expect(node.installedVersion).toBe('1.24.0');
      expect(node.dependencies).toEqual([]);
      expect(node.hasConflict).toBe(false);
      expect(node.depth).toBe(0);
    });

    it('应该支持可选字段', () => {
      const node: DependencyNode = {
        id: 'test-2',
        packageName: 'pandas',
        installedVersion: '2.0.0',
        requiredVersion: '>=1.5.0',
        dependencies: [],
        hasConflict: true,
        conflictType: 'version',
        depth: 1,
        parentId: 'test-1'
      };

      expect(node.requiredVersion).toBe('>=1.5.0');
      expect(node.conflictType).toBe('version');
      expect(node.parentId).toBe('test-1');
    });

    it('应该支持嵌套依赖', () => {
      const childNode: DependencyNode = {
        id: 'child-1',
        packageName: 'numpy',
        installedVersion: '1.24.0',
        dependencies: [],
        hasConflict: false,
        depth: 1
      };

      const parentNode: DependencyNode = {
        id: 'parent-1',
        packageName: 'pandas',
        installedVersion: '2.0.0',
        dependencies: [childNode],
        hasConflict: false,
        depth: 0
      };

      expect(parentNode.dependencies).toHaveLength(1);
      expect(parentNode.dependencies[0].packageName).toBe('numpy');
    });
  });

  describe('ConflictInfo 接口', () => {
    it('应该包含所有必需字段', () => {
      const conflict: ConflictInfo = {
        id: 'conflict-1',
        type: 'version_mismatch',
        severity: 'warning',
        packageName: 'numpy',
        installedVersion: '1.19.0',
        requiredVersion: '>=1.20.0',
        source: 'pandas',
        description: '版本不匹配',
        suggestion: '升级 numpy',
        relatedNodeIds: ['node-1', 'node-2']
      };

      expect(conflict.id).toBe('conflict-1');
      expect(conflict.type).toBe('version_mismatch');
      expect(conflict.severity).toBe('warning');
      expect(conflict.packageName).toBe('numpy');
      expect(conflict.relatedNodeIds).toHaveLength(2);
    });

    it('应该支持不同的冲突类型', () => {
      const versionConflict: ConflictInfo = {
        id: 'c1',
        type: 'version_mismatch',
        severity: 'warning',
        packageName: 'test',
        installedVersion: '1.0',
        requiredVersion: '2.0',
        source: 'source',
        description: 'desc',
        suggestion: 'sugg',
        relatedNodeIds: []
      };

      const circularConflict: ConflictInfo = {
        id: 'c2',
        type: 'circular_dependency',
        severity: 'critical',
        packageName: 'test',
        installedVersion: '1.0',
        requiredVersion: '1.0',
        source: 'source',
        description: 'desc',
        suggestion: 'sugg',
        relatedNodeIds: []
      };

      const missingConflict: ConflictInfo = {
        id: 'c3',
        type: 'missing_dependency',
        severity: 'critical',
        packageName: 'test',
        installedVersion: '',
        requiredVersion: '1.0',
        source: 'source',
        description: 'desc',
        suggestion: 'sugg',
        relatedNodeIds: []
      };

      expect(versionConflict.type).toBe('version_mismatch');
      expect(circularConflict.type).toBe('circular_dependency');
      expect(missingConflict.type).toBe('missing_dependency');
    });

    it('应该支持不同的严重程度', () => {
      const critical: ConflictInfo['severity'] = 'critical';
      const warning: ConflictInfo['severity'] = 'warning';
      const info: ConflictInfo['severity'] = 'info';

      expect(critical).toBe('critical');
      expect(warning).toBe('warning');
      expect(info).toBe('info');
    });
  });

  describe('AnalysisResult 接口', () => {
    it('应该包含所有必需字段', () => {
      const result: AnalysisResult = {
        tree: [],
        conflicts: [],
        stats: {
          totalPackages: 10,
          totalConflicts: 2,
          maxDepth: 3,
          versionConflicts: 1,
          circularDependencies: 1
        },
        timestamp: '2024-01-01T00:00:00Z'
      };

      expect(result.tree).toEqual([]);
      expect(result.conflicts).toEqual([]);
      expect(result.stats.totalPackages).toBe(10);
      expect(result.stats.totalConflicts).toBe(2);
      expect(result.timestamp).toBe('2024-01-01T00:00:00Z');
    });

    it('应该支持完整的分析结果', () => {
      const node: DependencyNode = {
        id: 'node-1',
        packageName: 'numpy',
        installedVersion: '1.24.0',
        dependencies: [],
        hasConflict: false,
        depth: 0
      };

      const conflict: ConflictInfo = {
        id: 'conflict-1',
        type: 'version_mismatch',
        severity: 'warning',
        packageName: 'numpy',
        installedVersion: '1.19.0',
        requiredVersion: '>=1.20.0',
        source: 'pandas',
        description: '版本不匹配',
        suggestion: '升级 numpy',
        relatedNodeIds: ['node-1']
      };

      const result: AnalysisResult = {
        tree: [node],
        conflicts: [conflict],
        stats: {
          totalPackages: 1,
          totalConflicts: 1,
          maxDepth: 1,
          versionConflicts: 1,
          circularDependencies: 0
        },
        timestamp: new Date().toISOString()
      };

      expect(result.tree).toHaveLength(1);
      expect(result.conflicts).toHaveLength(1);
      expect(result.stats.totalPackages).toBe(1);
    });
  });

  describe('字段命名一致性', () => {
    it('DependencyNode 字段应使用驼峰命名', () => {
      const node: DependencyNode = {
        id: 'test',
        packageName: 'test', // 驼峰命名，对应后端 package_name
        installedVersion: '1.0', // 驼峰命名，对应后端 installed_version
        requiredVersion: '1.0', // 驼峰命名，对应后端 required_version
        dependencies: [],
        hasConflict: false, // 驼峰命名，对应后端 has_conflict
        conflictType: 'version', // 驼峰命名，对应后端 conflict_type
        depth: 0,
        parentId: 'parent' // 驼峰命名，对应后端 parent_id
      };

      // 验证所有字段都存在
      expect(node).toHaveProperty('packageName');
      expect(node).toHaveProperty('installedVersion');
      expect(node).toHaveProperty('requiredVersion');
      expect(node).toHaveProperty('hasConflict');
      expect(node).toHaveProperty('conflictType');
      expect(node).toHaveProperty('parentId');
    });

    it('ConflictInfo 字段应使用驼峰命名', () => {
      const conflict: ConflictInfo = {
        id: 'test',
        type: 'version_mismatch',
        severity: 'warning',
        packageName: 'test', // 驼峰命名，对应后端 package_name
        installedVersion: '1.0', // 驼峰命名，对应后端 installed_version
        requiredVersion: '2.0', // 驼峰命名，对应后端 required_version
        source: 'source',
        description: 'desc',
        suggestion: 'sugg',
        relatedNodeIds: [] // 驼峰命名，对应后端 related_node_ids
      };

      // 验证所有字段都存在
      expect(conflict).toHaveProperty('packageName');
      expect(conflict).toHaveProperty('installedVersion');
      expect(conflict).toHaveProperty('requiredVersion');
      expect(conflict).toHaveProperty('relatedNodeIds');
    });
  });
});
