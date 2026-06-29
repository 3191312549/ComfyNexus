/**
 * usePluginUpdate Hook 单元测试
 * 
 * 测试加载更新信息、更新流程和状态管理
 * 测试错误处理
 * 
 * 验证需求: 6.1, 6.3
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePluginUpdate } from '../usePluginUpdate';
import { pluginAPI } from '../../services/PluginAPIService';
import type { CommitInfo, UpdateInfoResponse, PluginUpdateResponse } from '../../types/plugin';

// Mock pluginAPI
vi.mock('../../services/PluginAPIService', () => ({
  pluginAPI: {
    getUpdateInfo: vi.fn(),
    updatePlugin: vi.fn(),
  },
}));

describe('usePluginUpdate Hook', () => {
  // 测试数据
  const mockCommits: CommitInfo[] = [
    {
      hash: 'abc1234',
      message: 'Fix: 修复依赖安装问题',
      date: '2024-01-15T10:30:00Z',
    },
    {
      hash: 'def5678',
      message: 'Feature: 添加批量更新功能',
      date: '2024-01-14T15:20:00Z',
    },
    {
      hash: 'ghi9012',
      message: 'Refactor: 重构 Git 操作逻辑',
      date: '2024-01-13T09:45:00Z',
    },
  ];
  
  beforeEach(() => {
    // 清除所有 mock
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('初始状态', () => {
    it('应该返回初始状态', () => {
      const { result } = renderHook(() => usePluginUpdate());
      
      expect(result.current.commits).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.updating).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
  
  describe('loadUpdateInfo', () => {
    it('应该成功加载更新信息（提交日志）', async () => {
      // Mock API 响应
      const mockResponse: UpdateInfoResponse = {
        success: true,
        commits: mockCommits,
      };
      vi.mocked(pluginAPI.getUpdateInfo).mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => usePluginUpdate());
      
      // 初始状态
      expect(result.current.loading).toBe(false);
      expect(result.current.commits).toEqual([]);
      
      // 加载更新信息
      await act(async () => {
        await result.current.loadUpdateInfo('ComfyUI-Manager');
      });
      
      // 验证状态
      expect(result.current.loading).toBe(false);
      expect(result.current.commits).toEqual(mockCommits);
      expect(result.current.error).toBeNull();
      
      // 验证 API 调用
      expect(pluginAPI.getUpdateInfo).toHaveBeenCalledWith('ComfyUI-Manager');
      expect(pluginAPI.getUpdateInfo).toHaveBeenCalledTimes(1);
    });
    
    it('应该处理加载失败（API 返回 success: false）', async () => {
      // Mock API 响应
      const mockResponse: UpdateInfoResponse = {
        success: false,
        error: '获取更新信息失败',
      };
      vi.mocked(pluginAPI.getUpdateInfo).mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => usePluginUpdate());
      
      // 加载更新信息
      await act(async () => {
        await result.current.loadUpdateInfo('ComfyUI-Manager');
      });
      
      // 验证状态
      expect(result.current.commits).toEqual([]);
      expect(result.current.error).toBe('获取更新信息失败');
      expect(result.current.loading).toBe(false);
    });
    
    it('应该处理加载异常', async () => {
      // Mock API 抛出异常
      const mockError = new Error('网络连接失败');
      vi.mocked(pluginAPI.getUpdateInfo).mockRejectedValue(mockError);
      
      const { result } = renderHook(() => usePluginUpdate());
      
      // 加载更新信息
      await act(async () => {
        await result.current.loadUpdateInfo('ComfyUI-Manager');
      });
      
      // 验证状态
      expect(result.current.commits).toEqual([]);
      expect(result.current.error).toBe('网络连接失败');
      expect(result.current.loading).toBe(false);
    });
    
    it('应该在加载过程中设置 loading 状态', async () => {
      // Mock API 响应（延迟）
      const mockResponse: UpdateInfoResponse = {
        success: true,
        commits: mockCommits,
      };
      vi.mocked(pluginAPI.getUpdateInfo).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockResponse), 100))
      );
      
      const { result } = renderHook(() => usePluginUpdate());
      
      // 开始加载
      act(() => {
        result.current.loadUpdateInfo('ComfyUI-Manager');
      });
      
      // 验证 loading 状态
      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });
      
      // 等待加载完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.commits).toEqual(mockCommits);
    });
    
    it('应该在加载失败时清空提交日志列表', async () => {
      // 先加载成功
      const mockResponse1: UpdateInfoResponse = {
        success: true,
        commits: mockCommits,
      };
      vi.mocked(pluginAPI.getUpdateInfo).mockResolvedValueOnce(mockResponse1);
      
      const { result } = renderHook(() => usePluginUpdate());
      
      await act(async () => {
        await result.current.loadUpdateInfo('ComfyUI-Manager');
      });
      
      expect(result.current.commits).toEqual(mockCommits);
      
      // 再加载失败
      const mockResponse2: UpdateInfoResponse = {
        success: false,
        error: '加载失败',
      };
      vi.mocked(pluginAPI.getUpdateInfo).mockResolvedValueOnce(mockResponse2);
      
      await act(async () => {
        await result.current.loadUpdateInfo('ComfyUI-Manager');
      });
      
      // 验证提交日志列表被清空
      expect(result.current.commits).toEqual([]);
      expect(result.current.error).toBe('加载失败');
    });
    
    it('应该处理空的提交日志列表', async () => {
      // Mock API 响应（空列表）
      const mockResponse: UpdateInfoResponse = {
        success: true,
        commits: [],
      };
      vi.mocked(pluginAPI.getUpdateInfo).mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => usePluginUpdate());
      
      // 加载更新信息
      await act(async () => {
        await result.current.loadUpdateInfo('ComfyUI-Manager');
      });
      
      // 验证状态
      expect(result.current.commits).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });
  
  describe('updatePlugin', () => {
    it('应该成功更新插件（无依赖变化）', async () => {
      // Mock API 响应
      const mockResponse: PluginUpdateResponse = {
        success: true,
        message: '更新成功',
        dependency_changed: false,
        new_dependencies: [],
      };
      vi.mocked(pluginAPI.updatePlugin).mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => usePluginUpdate());
      
      // 初始状态
      expect(result.current.updating).toBe(false);
      
      // 更新插件
      let updateResult: any = null;
      await act(async () => {
        updateResult = await result.current.updatePlugin('ComfyUI-Manager');
      });
      
      // 验证返回值
      expect(updateResult).not.toBeNull();
      expect(updateResult.success).toBe(true);
      expect(updateResult.plugin_name).toBe('ComfyUI-Manager');
      expect(updateResult.message).toBe('更新成功');
      expect(updateResult.dependency_changed).toBe(false);
      expect(updateResult.new_dependencies).toEqual([]);
      expect(updateResult.dependencies_installed).toBe(0);
      
      // 验证状态
      expect(result.current.updating).toBe(false);
      expect(result.current.error).toBeNull();
      
      // 验证 API 调用
      expect(pluginAPI.updatePlugin).toHaveBeenCalledWith('ComfyUI-Manager');
      expect(pluginAPI.updatePlugin).toHaveBeenCalledTimes(1);
    });
    
    it('应该成功更新插件（有依赖变化）', async () => {
      // Mock API 响应
      const mockResponse: PluginUpdateResponse = {
        success: true,
        message: '更新成功',
        dependency_changed: true,
        new_dependencies: [
          {
            package: 'torch',
            version: '>=2.0.0',
            installed: false,
            installed_version: null,
            version_match: false,
            message: '未安装',
          },
        ],
      };
      vi.mocked(pluginAPI.updatePlugin).mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => usePluginUpdate());
      
      // 更新插件
      let updateResult: any = null;
      await act(async () => {
        updateResult = await result.current.updatePlugin('ComfyUI-Manager');
      });
      
      // 验证返回值
      expect(updateResult).not.toBeNull();
      expect(updateResult.success).toBe(true);
      expect(updateResult.dependency_changed).toBe(true);
      expect(updateResult.new_dependencies).toHaveLength(1);
      expect(updateResult.new_dependencies[0].package).toBe('torch');
      
      // 验证状态
      expect(result.current.error).toBeNull();
    });
    
    it('应该处理更新失败（API 返回 success: false）', async () => {
      // Mock API 响应
      const mockResponse: PluginUpdateResponse = {
        success: false,
        error: '更新失败：Git pull 失败',
      };
      vi.mocked(pluginAPI.updatePlugin).mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => usePluginUpdate());
      
      // 更新插件
      let updateResult: any = null;
      await act(async () => {
        updateResult = await result.current.updatePlugin('ComfyUI-Manager');
      });
      
      // 验证返回值
      expect(updateResult).not.toBeNull();
      expect(updateResult.success).toBe(false);
      expect(updateResult.plugin_name).toBe('ComfyUI-Manager');
      expect(updateResult.error).toBe('更新失败：Git pull 失败');
      
      // 验证状态
      expect(result.current.error).toBe('更新失败：Git pull 失败');
      expect(result.current.updating).toBe(false);
    });
    
    it('应该处理更新异常', async () => {
      // Mock API 抛出异常
      const mockError = new Error('网络超时');
      vi.mocked(pluginAPI.updatePlugin).mockRejectedValue(mockError);
      
      const { result } = renderHook(() => usePluginUpdate());
      
      // 更新插件
      let updateResult: any = null;
      await act(async () => {
        updateResult = await result.current.updatePlugin('ComfyUI-Manager');
      });
      
      // 验证返回值
      expect(updateResult).not.toBeNull();
      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toBe('网络超时');
      
      // 验证状态
      expect(result.current.error).toBe('网络超时');
      expect(result.current.updating).toBe(false);
    });
    
    it('应该在更新过程中设置 updating 状态', async () => {
      // Mock API 响应（延迟）
      const mockResponse: PluginUpdateResponse = {
        success: true,
        message: '更新成功',
        dependency_changed: false,
        new_dependencies: [],
      };
      vi.mocked(pluginAPI.updatePlugin).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockResponse), 100))
      );
      
      const { result } = renderHook(() => usePluginUpdate());
      
      // 开始更新
      act(() => {
        result.current.updatePlugin('ComfyUI-Manager');
      });
      
      // 验证 updating 状态
      await waitFor(() => {
        expect(result.current.updating).toBe(true);
      });
      
      // 等待更新完成
      await waitFor(() => {
        expect(result.current.updating).toBe(false);
      });
    });
    
    it('应该处理 API 响应中缺少可选字段的情况', async () => {
      // Mock API 响应（缺少 message 和 new_dependencies）
      const mockResponse: PluginUpdateResponse = {
        success: true,
        dependency_changed: false,
      };
      vi.mocked(pluginAPI.updatePlugin).mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => usePluginUpdate());
      
      // 更新插件
      let updateResult: any = null;
      await act(async () => {
        updateResult = await result.current.updatePlugin('ComfyUI-Manager');
      });
      
      // 验证返回值使用默认值
      expect(updateResult).not.toBeNull();
      expect(updateResult.success).toBe(true);
      expect(updateResult.message).toBe('更新成功'); // 默认消息
      expect(updateResult.dependency_changed).toBe(false);
      expect(updateResult.new_dependencies).toEqual([]); // 默认空数组
    });
  });
  
  describe('clearUpdateInfo', () => {
    it('应该清除提交日志列表和错误信息', async () => {
      // Mock API 响应
      const mockResponse: UpdateInfoResponse = {
        success: true,
        commits: mockCommits,
      };
      vi.mocked(pluginAPI.getUpdateInfo).mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => usePluginUpdate());
      
      // 先加载更新信息
      await act(async () => {
        await result.current.loadUpdateInfo('ComfyUI-Manager');
      });
      
      expect(result.current.commits).toEqual(mockCommits);
      
      // 清除更新信息
      act(() => {
        result.current.clearUpdateInfo();
      });
      
      // 验证状态
      expect(result.current.commits).toEqual([]);
      expect(result.current.error).toBeNull();
    });
    
    it('应该在有错误时清除错误信息', async () => {
      // Mock API 响应（失败）
      const mockResponse: UpdateInfoResponse = {
        success: false,
        error: '加载失败',
      };
      vi.mocked(pluginAPI.getUpdateInfo).mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => usePluginUpdate());
      
      // 加载更新信息（失败）
      await act(async () => {
        await result.current.loadUpdateInfo('ComfyUI-Manager');
      });
      
      expect(result.current.error).toBe('加载失败');
      
      // 清除更新信息
      act(() => {
        result.current.clearUpdateInfo();
      });
      
      // 验证错误已清除
      expect(result.current.error).toBeNull();
    });
  });
  
  describe('错误处理', () => {
    it('应该在加载时清除之前的错误', async () => {
      // 第一次加载失败
      const mockResponse1: UpdateInfoResponse = {
        success: false,
        error: '第一次失败',
      };
      vi.mocked(pluginAPI.getUpdateInfo).mockResolvedValueOnce(mockResponse1);
      
      const { result } = renderHook(() => usePluginUpdate());
      
      await act(async () => {
        await result.current.loadUpdateInfo('ComfyUI-Manager');
      });
      
      expect(result.current.error).toBe('第一次失败');
      
      // 第二次加载成功
      const mockResponse2: UpdateInfoResponse = {
        success: true,
        commits: mockCommits,
      };
      vi.mocked(pluginAPI.getUpdateInfo).mockResolvedValueOnce(mockResponse2);
      
      await act(async () => {
        await result.current.loadUpdateInfo('ComfyUI-Manager');
      });
      
      // 验证错误已清除
      expect(result.current.error).toBeNull();
      expect(result.current.commits).toEqual(mockCommits);
    });
    
    it('应该在更新时清除之前的错误', async () => {
      // 第一次更新失败
      const mockResponse1: PluginUpdateResponse = {
        success: false,
        error: '第一次更新失败',
      };
      vi.mocked(pluginAPI.updatePlugin).mockResolvedValueOnce(mockResponse1);
      
      const { result } = renderHook(() => usePluginUpdate());
      
      await act(async () => {
        await result.current.updatePlugin('ComfyUI-Manager');
      });
      
      expect(result.current.error).toBe('第一次更新失败');
      
      // 第二次更新成功
      const mockResponse2: PluginUpdateResponse = {
        success: true,
        message: '更新成功',
        dependency_changed: false,
        new_dependencies: [],
      };
      vi.mocked(pluginAPI.updatePlugin).mockResolvedValueOnce(mockResponse2);
      
      await act(async () => {
        await result.current.updatePlugin('ComfyUI-Manager');
      });
      
      // 验证错误已清除
      expect(result.current.error).toBeNull();
    });
  });
  
  describe('状态独立性', () => {
    it('加载更新信息不应该影响 updating 状态', async () => {
      // Mock API 响应
      const mockResponse: UpdateInfoResponse = {
        success: true,
        commits: mockCommits,
      };
      vi.mocked(pluginAPI.getUpdateInfo).mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => usePluginUpdate());
      
      // 加载更新信息
      await act(async () => {
        await result.current.loadUpdateInfo('ComfyUI-Manager');
      });
      
      // 验证 updating 状态未改变
      expect(result.current.updating).toBe(false);
    });
    
    it('更新插件不应该影响 loading 状态', async () => {
      // Mock API 响应
      const mockResponse: PluginUpdateResponse = {
        success: true,
        message: '更新成功',
        dependency_changed: false,
        new_dependencies: [],
      };
      vi.mocked(pluginAPI.updatePlugin).mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => usePluginUpdate());
      
      // 更新插件
      await act(async () => {
        await result.current.updatePlugin('ComfyUI-Manager');
      });
      
      // 验证 loading 状态未改变
      expect(result.current.loading).toBe(false);
    });
    
    it('更新插件不应该清除提交日志列表', async () => {
      // 先加载更新信息
      const mockInfoResponse: UpdateInfoResponse = {
        success: true,
        commits: mockCommits,
      };
      vi.mocked(pluginAPI.getUpdateInfo).mockResolvedValue(mockInfoResponse);
      
      const { result } = renderHook(() => usePluginUpdate());
      
      await act(async () => {
        await result.current.loadUpdateInfo('ComfyUI-Manager');
      });
      
      expect(result.current.commits).toEqual(mockCommits);
      
      // 更新插件
      const mockUpdateResponse: PluginUpdateResponse = {
        success: true,
        message: '更新成功',
        dependency_changed: false,
        new_dependencies: [],
      };
      vi.mocked(pluginAPI.updatePlugin).mockResolvedValue(mockUpdateResponse);
      
      await act(async () => {
        await result.current.updatePlugin('ComfyUI-Manager');
      });
      
      // 验证提交日志列表未被清除
      expect(result.current.commits).toEqual(mockCommits);
    });
  });
  
  describe('并发操作', () => {
    it('应该允许在加载更新信息时进行更新操作', async () => {
      // Mock API 响应（延迟）
      const mockInfoResponse: UpdateInfoResponse = {
        success: true,
        commits: mockCommits,
      };
      vi.mocked(pluginAPI.getUpdateInfo).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockInfoResponse), 200))
      );
      
      const mockUpdateResponse: PluginUpdateResponse = {
        success: true,
        message: '更新成功',
        dependency_changed: false,
        new_dependencies: [],
      };
      vi.mocked(pluginAPI.updatePlugin).mockResolvedValue(mockUpdateResponse);
      
      const { result } = renderHook(() => usePluginUpdate());
      
      // 开始加载更新信息
      act(() => {
        result.current.loadUpdateInfo('ComfyUI-Manager');
      });
      
      // 在加载过程中进行更新
      let updateResult: any = null;
      await act(async () => {
        updateResult = await result.current.updatePlugin('ComfyUI-Manager');
      });
      
      // 验证更新成功
      expect(updateResult).not.toBeNull();
      expect(updateResult.success).toBe(true);
      
      // 等待加载完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      // 验证两个操作都完成
      expect(result.current.commits).toEqual(mockCommits);
    });
  });
});
