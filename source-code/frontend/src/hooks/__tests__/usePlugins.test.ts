/**
 * usePlugins Hook 单元测试
 * 
 * 测试加载、刷新、搜索功能
 * 测试错误处理和状态管理
 * 
 * 验证需求: 1.1, 11.4
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePlugins } from '../usePlugins';
import { pluginAPI } from '../../services/PluginAPIService';
import type { PluginInfo, PluginsResponse } from '../../types/plugin';

// Mock pluginAPI
vi.mock('../../services/PluginAPIService', () => ({
  pluginAPI: {
    getPlugins: vi.fn(),
    refreshPlugins: vi.fn(),
    getRefreshProgress: vi.fn(),
  },
}));

describe('usePlugins Hook', () => {
  // 测试数据
  const mockPlugins: PluginInfo[] = [
    {
      name: 'ComfyUI-Manager',
      path: '/path/to/ComfyUI-Manager',
      is_git_repo: true,
      git_url: 'https://github.com/ltdrdata/ComfyUI-Manager',
      branch: 'main',
      default_branch: 'main',
      commit_hash: 'abc1234',
      commit_date: '2024-01-01T00:00:00Z',
      has_update: false,
      behind_commits: 0,
      dependency_updated: false,
      dependency_viewed: true,
    },
    {
      name: 'ComfyUI-Custom-Scripts',
      path: '/path/to/ComfyUI-Custom-Scripts',
      is_git_repo: true,
      git_url: 'https://github.com/pythongosssss/ComfyUI-Custom-Scripts',
      branch: 'main',
      default_branch: 'main',
      commit_hash: 'def5678',
      commit_date: '2024-01-02T00:00:00Z',
      has_update: true,
      behind_commits: 5,
      dependency_updated: true,
      dependency_viewed: false,
    },
    {
      name: 'ComfyUI-Impact-Pack',
      path: '/path/to/ComfyUI-Impact-Pack',
      is_git_repo: true,
      git_url: 'https://github.com/ltdrdata/ComfyUI-Impact-Pack',
      branch: 'main',
      default_branch: 'main',
      commit_hash: 'ghi9012',
      commit_date: '2024-01-03T00:00:00Z',
      has_update: false,
      behind_commits: 0,
      dependency_updated: false,
      dependency_viewed: true,
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
      const { result } = renderHook(() => usePlugins());
      
      expect(result.current.plugins).toEqual([]);
      expect(result.current.filteredPlugins).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.refreshing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.searchKeyword).toBe('');
    });
  });
  
  describe('loadPlugins', () => {
    it('应该成功加载插件列表（使用缓存）', async () => {
      // Mock API 响应
      const mockResponse: PluginsResponse = {
        success: true,
        plugins: mockPlugins,
        from_cache: true,
      };
      vi.mocked(pluginAPI.getPlugins).mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => usePlugins());
      
      // 加载插件
      await act(async () => {
        await result.current.loadPlugins(true);
      });
      
      // 验证状态
      expect(result.current.loading).toBe(false);
      expect(result.current.plugins).toEqual(mockPlugins);
      expect(result.current.error).toBeNull();
      
      // 验证 API 调用
      expect(pluginAPI.getPlugins).toHaveBeenCalledWith(true);
    });
    
    it('应该成功加载插件列表（不使用缓存）', async () => {
      // Mock API 响应
      const mockResponse: PluginsResponse = {
        success: true,
        plugins: mockPlugins,
        from_cache: false,
      };
      vi.mocked(pluginAPI.getPlugins).mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => usePlugins('env-1'));
      
      // 加载插件
      await act(async () => {
        await result.current.loadPlugins(false);
      });
      
      // 验证状态
      expect(result.current.plugins).toEqual(mockPlugins);
      
      // 验证 API 调用
      expect(pluginAPI.getPlugins).toHaveBeenCalledWith(false);
    });
    
    it('应该处理加载失败（API 返回 success: false）', async () => {
      // Mock API 响应
      const mockResponse: PluginsResponse = {
        success: false,
        error: '加载失败',
      };
      vi.mocked(pluginAPI.getPlugins).mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => usePlugins());
      
      // 加载插件
      await act(async () => {
        await result.current.loadPlugins();
      });
      
      // 验证状态
      expect(result.current.plugins).toEqual([]);
      expect(result.current.error).toBe('加载失败');
      expect(result.current.loading).toBe(false);
    });
    
    it('应该处理加载异常', async () => {
      // Mock API 抛出异常
      const mockError = new Error('网络错误');
      vi.mocked(pluginAPI.getPlugins).mockRejectedValue(mockError);
      
      const { result } = renderHook(() => usePlugins());
      
      // 加载插件
      await act(async () => {
        await result.current.loadPlugins();
      });
      
      // 验证状态
      expect(result.current.plugins).toEqual([]);
      expect(result.current.error).toBe('网络错误');
      expect(result.current.loading).toBe(false);
    });
    
    it('应该在加载过程中设置 loading 状态', async () => {
      // Mock API 响应（延迟）
      const mockResponse: PluginsResponse = {
        success: true,
        plugins: mockPlugins,
      };
      vi.mocked(pluginAPI.getPlugins).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockResponse), 100))
      );
      
      const { result } = renderHook(() => usePlugins());
      
      // 开始加载
      act(() => {
        result.current.loadPlugins();
      });
      
      // 验证 loading 状态
      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });
      
      // 等待加载完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.plugins).toEqual(mockPlugins);
    });
  });
  
  describe('refreshPlugins', () => {
    it('应该成功刷新插件列表', async () => {
      // Mock API 响应
      const mockResponse: PluginsResponse = {
        success: true,
        plugins: mockPlugins,
      };
      vi.mocked(pluginAPI.refreshPlugins).mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => usePlugins('env-1'));
      
      // 刷新插件
      await act(async () => {
        await result.current.refreshPlugins();
      });
      
      // 验证状态
      expect(result.current.plugins).toEqual(mockPlugins);
      expect(result.current.error).toBeNull();
      expect(result.current.refreshing).toBe(false);
      
      // 验证 API 调用
      expect(pluginAPI.refreshPlugins).toHaveBeenCalledTimes(1);
    });
    
    it('应该处理刷新失败', async () => {
      // Mock API 响应
      const mockResponse: PluginsResponse = {
        success: false,
        error: '刷新失败',
      };
      vi.mocked(pluginAPI.refreshPlugins).mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => usePlugins());
      
      // 刷新插件
      await act(async () => {
        await result.current.refreshPlugins();
      });
      
      // 验证状态
      expect(result.current.error).toBe('刷新失败');
      expect(result.current.refreshing).toBe(false);
    });
    
    it('应该处理刷新异常', async () => {
      // Mock API 抛出异常
      const mockError = new Error('网络超时');
      vi.mocked(pluginAPI.refreshPlugins).mockRejectedValue(mockError);
      
      const { result } = renderHook(() => usePlugins());
      
      // 刷新插件
      await act(async () => {
        await result.current.refreshPlugins();
      });
      
      // 验证状态
      expect(result.current.error).toBe('网络超时');
      expect(result.current.refreshing).toBe(false);
    });
    
    it('应该在刷新过程中设置 refreshing 状态', async () => {
      // Mock API 响应（延迟）
      const mockResponse: PluginsResponse = {
        success: true,
        plugins: mockPlugins,
      };
      vi.mocked(pluginAPI.refreshPlugins).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockResponse), 100))
      );
      
      const { result } = renderHook(() => usePlugins());
      
      // 开始刷新
      act(() => {
        result.current.refreshPlugins();
      });
      
      // 验证 refreshing 状态
      await waitFor(() => {
        expect(result.current.refreshing).toBe(true);
      });
      
      // 等待刷新完成
      await waitFor(() => {
        expect(result.current.refreshing).toBe(false);
      });
      
      expect(result.current.plugins).toEqual(mockPlugins);
    });
  });
  
  describe('searchPlugins', () => {
    beforeEach(async () => {
      // 先加载插件列表
      const mockResponse: PluginsResponse = {
        success: true,
        plugins: mockPlugins,
      };
      vi.mocked(pluginAPI.getPlugins).mockResolvedValue(mockResponse);
    });
    
    it('应该根据关键词过滤插件（不区分大小写）', async () => {
      const { result } = renderHook(() => usePlugins());
      
      // 加载插件
      await act(async () => {
        await result.current.loadPlugins();
      });
      
      // 搜索 "manager"
      act(() => {
        result.current.searchPlugins('manager');
      });
      
      // 验证过滤结果
      expect(result.current.filteredPlugins).toHaveLength(1);
      expect(result.current.filteredPlugins[0].name).toBe('ComfyUI-Manager');
      expect(result.current.searchKeyword).toBe('manager');
    });
    
    it('应该支持大写关键词搜索', async () => {
      const { result } = renderHook(() => usePlugins());
      
      // 加载插件
      await act(async () => {
        await result.current.loadPlugins();
      });
      
      // 搜索 "MANAGER"
      act(() => {
        result.current.searchPlugins('MANAGER');
      });
      
      // 验证过滤结果
      expect(result.current.filteredPlugins).toHaveLength(1);
      expect(result.current.filteredPlugins[0].name).toBe('ComfyUI-Manager');
    });
    
    it('应该支持部分匹配', async () => {
      const { result } = renderHook(() => usePlugins());
      
      // 加载插件
      await act(async () => {
        await result.current.loadPlugins();
      });
      
      // 搜索 "custom"
      act(() => {
        result.current.searchPlugins('custom');
      });
      
      // 验证过滤结果
      expect(result.current.filteredPlugins).toHaveLength(1);
      expect(result.current.filteredPlugins[0].name).toBe('ComfyUI-Custom-Scripts');
    });
    
    it('应该在没有匹配结果时返回空数组', async () => {
      const { result } = renderHook(() => usePlugins());
      
      // 加载插件
      await act(async () => {
        await result.current.loadPlugins();
      });
      
      // 搜索不存在的插件
      act(() => {
        result.current.searchPlugins('nonexistent');
      });
      
      // 验证过滤结果
      expect(result.current.filteredPlugins).toHaveLength(0);
    });
    
    it('应该在关键词为空时返回完整列表', async () => {
      const { result } = renderHook(() => usePlugins());
      
      // 加载插件
      await act(async () => {
        await result.current.loadPlugins();
      });
      
      // 搜索空字符串
      act(() => {
        result.current.searchPlugins('');
      });
      
      // 验证过滤结果
      expect(result.current.filteredPlugins).toEqual(mockPlugins);
    });
    
    it('应该忽略前后空格', async () => {
      const { result } = renderHook(() => usePlugins());
      
      // 加载插件
      await act(async () => {
        await result.current.loadPlugins();
      });
      
      // 搜索带空格的关键词
      act(() => {
        result.current.searchPlugins('  manager  ');
      });
      
      // 验证过滤结果
      expect(result.current.filteredPlugins).toHaveLength(1);
      expect(result.current.filteredPlugins[0].name).toBe('ComfyUI-Manager');
    });
    
    it('应该支持多个插件匹配同一关键词', async () => {
      const { result } = renderHook(() => usePlugins());
      
      // 加载插件
      await act(async () => {
        await result.current.loadPlugins();
      });
      
      // 搜索 "comfyui"（所有插件都包含）
      act(() => {
        result.current.searchPlugins('comfyui');
      });
      
      // 验证过滤结果
      expect(result.current.filteredPlugins).toHaveLength(3);
    });
  });
  
  describe('环境隔离', () => {
    it('应该为不同环境维护独立状态', async () => {
      // Mock API 响应
      const mockResponse1: PluginsResponse = {
        success: true,
        plugins: [mockPlugins[0]],
      };
      const mockResponse2: PluginsResponse = {
        success: true,
        plugins: [mockPlugins[1]],
      };
      
      vi.mocked(pluginAPI.getPlugins)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);
      
      // 创建两个不同环境的 Hook
      const { result: result1 } = renderHook(() => usePlugins());
      const { result: result2 } = renderHook(() => usePlugins());
      
      // 加载插件
      await act(async () => {
        await result1.current.loadPlugins();
      });
      
      await act(async () => {
        await result2.current.loadPlugins();
      });
      
      // 验证状态独立
      expect(result1.current.plugins).toEqual([mockPlugins[0]]);
      expect(result2.current.plugins).toEqual([mockPlugins[1]]);
    });
  });
  
  describe('性能优化', () => {
    it('应该使用 useMemo 优化过滤性能', async () => {
      const { result, rerender } = renderHook(() => usePlugins());
      
      // 加载插件
      const mockResponse: PluginsResponse = {
        success: true,
        plugins: mockPlugins,
      };
      vi.mocked(pluginAPI.getPlugins).mockResolvedValue(mockResponse);
      
      await act(async () => {
        await result.current.loadPlugins();
      });
      
      // 第一次搜索
      act(() => {
        result.current.searchPlugins('manager');
      });
      const firstResult = result.current.filteredPlugins;
      
      // 重新渲染（不改变搜索关键词）
      rerender();
      
      // 验证引用相同（useMemo 生效）
      expect(result.current.filteredPlugins).toBe(firstResult);
    });
  });
  
  describe('轮询机制', () => {
    beforeEach(() => {
      // 使用假定时器
      vi.useFakeTimers();
    });
    
    afterEach(() => {
      // 恢复真实定时器
      vi.useRealTimers();
    });
    
    it('应该在后台更新时启动轮询', async () => {
      // Mock refreshPlugins API 返回后台更新中
      const mockRefreshResponse: PluginsResponse = {
        success: true,
        plugins: mockPlugins,
        background_updating: true,
      };
      vi.mocked(pluginAPI.refreshPlugins).mockResolvedValue(mockRefreshResponse);
      
      // Mock getRefreshProgress API
      const mockProgressResponse = {
        success: true,
        is_updating: true,
        current: 5,
        total: 10,
      };
      vi.mocked(pluginAPI.getRefreshProgress).mockResolvedValue(mockProgressResponse);
      
      const { result } = renderHook(() => usePlugins());
      
      // 清除之前的调用记录
      vi.clearAllMocks();
      
      // 调用刷新
      await act(async () => {
        await result.current.refreshPlugins();
      });
      
      // 验证轮询已启动（立即执行一次）
      expect(pluginAPI.getRefreshProgress).toHaveBeenCalledTimes(1);
      
      // 快进 500ms
      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve(); // 等待异步操作
      });
      
      // 验证轮询继续执行
      expect(pluginAPI.getRefreshProgress).toHaveBeenCalledTimes(2);
      
      // 再快进 500ms
      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });
      
      // 验证轮询继续执行
      expect(pluginAPI.getRefreshProgress).toHaveBeenCalledTimes(3);
    });
    
    it('应该每 500ms 调用一次 get_update_progress', async () => {
      // Mock API
      const mockRefreshResponse: PluginsResponse = {
        success: true,
        plugins: mockPlugins,
        background_updating: true,
      };
      vi.mocked(pluginAPI.refreshPlugins).mockResolvedValue(mockRefreshResponse);
      
      const mockProgressResponse = {
        success: true,
        is_updating: true,
        current: 3,
        total: 10,
      };
      vi.mocked(pluginAPI.getRefreshProgress).mockResolvedValue(mockProgressResponse);
      
      const { result } = renderHook(() => usePlugins());
      
      // 清除之前的调用记录
      vi.clearAllMocks();
      
      // 启动刷新
      await act(async () => {
        await result.current.refreshPlugins();
      });
      
      // 验证初始调用
      expect(pluginAPI.getRefreshProgress).toHaveBeenCalledTimes(1);
      
      // 快进 1500ms（应该调用 3 次）
      await act(async () => {
        vi.advanceTimersByTime(1500);
        await Promise.resolve();
      });
      
      // 验证调用次数（初始 1 次 + 3 次轮询 = 4 次）
      expect(pluginAPI.getRefreshProgress).toHaveBeenCalledTimes(4);
    });
    
    it('应该在有新数据时更新显示', async () => {
      // Mock API
      const mockRefreshResponse: PluginsResponse = {
        success: true,
        plugins: mockPlugins,
        background_updating: true,
      };
      vi.mocked(pluginAPI.refreshPlugins).mockResolvedValue(mockRefreshResponse);
      
      const mockProgressResponse = {
        success: true,
        is_updating: true,
        current: 5,
        total: 10,
      };
      vi.mocked(pluginAPI.getRefreshProgress).mockResolvedValue(mockProgressResponse);
      
      const { result } = renderHook(() => usePlugins());
      
      // 启动刷新
      await act(async () => {
        await result.current.refreshPlugins();
      });
      
      // 验证进度已更新
      expect(result.current.refreshProgress.current).toBe(5);
      expect(result.current.refreshProgress.total).toBe(10);
      
      // 更新进度
      const mockProgressResponse2 = {
        success: true,
        is_updating: true,
        current: 8,
        total: 10,
      };
      vi.mocked(pluginAPI.getRefreshProgress).mockResolvedValue(mockProgressResponse2);
      
      // 快进 500ms
      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });
      
      // 验证进度已更新
      expect(result.current.refreshProgress.current).toBe(8);
      expect(result.current.refreshProgress.total).toBe(10);
    });
    
    it('应该在更新完成时停止轮询', async () => {
      // Mock API
      const mockRefreshResponse: PluginsResponse = {
        success: true,
        plugins: mockPlugins,
        background_updating: true,
      };
      vi.mocked(pluginAPI.refreshPlugins).mockResolvedValue(mockRefreshResponse);
      
      // 第一次返回更新中
      const mockProgressResponse1 = {
        success: true,
        is_updating: true,
        current: 8,
        total: 10,
      };
      
      // 第二次返回更新完成
      const updatedPlugins = [...mockPlugins];
      updatedPlugins[0] = { ...updatedPlugins[0], has_update: false };
      
      const mockProgressResponse2 = {
        success: true,
        is_updating: false,
        current: 10,
        total: 10,
        plugins: updatedPlugins,
      };
      
      vi.mocked(pluginAPI.getRefreshProgress)
        .mockResolvedValueOnce(mockProgressResponse1)
        .mockResolvedValueOnce(mockProgressResponse2);
      
      const { result } = renderHook(() => usePlugins());
      
      // 启动刷新
      await act(async () => {
        await result.current.refreshPlugins();
      });
      
      // 等待第一次轮询完成
      await act(async () => {
        await Promise.resolve();
      });
      
      // 验证 refreshing 状态
      expect(result.current.refreshing).toBe(true);
      
      // 快进 500ms（触发第二次轮询，返回更新完成）
      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });
      
      // 验证轮询已停止
      expect(result.current.refreshing).toBe(false);
      expect(result.current.refreshProgress.current).toBe(0);
      expect(result.current.refreshProgress.total).toBe(0);
      
      // 验证插件列表已更新
      expect(result.current.plugins).toEqual(updatedPlugins);
      
      // 再快进 1000ms，验证不再调用 API
      const callCountBefore = vi.mocked(pluginAPI.getRefreshProgress).mock.calls.length;
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve();
      });
      const callCountAfter = vi.mocked(pluginAPI.getRefreshProgress).mock.calls.length;
      
      // 验证没有新的调用
      expect(callCountAfter).toBe(callCountBefore);
    });
    
    it('应该在组件卸载时清除轮询定时器', async () => {
      // Mock API
      const mockRefreshResponse: PluginsResponse = {
        success: true,
        plugins: mockPlugins,
        background_updating: true,
      };
      vi.mocked(pluginAPI.refreshPlugins).mockResolvedValue(mockRefreshResponse);
      
      const mockProgressResponse = {
        success: true,
        is_updating: true,
        current: 5,
        total: 10,
      };
      vi.mocked(pluginAPI.getRefreshProgress).mockResolvedValue(mockProgressResponse);
      
      const { result, unmount } = renderHook(() => usePlugins());
      
      // 清除之前的调用记录
      vi.clearAllMocks();
      
      // 启动刷新
      await act(async () => {
        await result.current.refreshPlugins();
      });
      
      // 验证轮询已启动
      expect(pluginAPI.getRefreshProgress).toHaveBeenCalled();
      const callCountBefore = vi.mocked(pluginAPI.getRefreshProgress).mock.calls.length;
      
      // 卸载组件
      unmount();
      
      // 快进 1000ms
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve();
      });
      
      // 验证没有新的调用（定时器已清除）
      const callCountAfter = vi.mocked(pluginAPI.getRefreshProgress).mock.calls.length;
      expect(callCountAfter).toBe(callCountBefore);
    });
    
    it('应该处理轮询过程中的错误（不中断轮询）', async () => {
      // Mock API
      const mockRefreshResponse: PluginsResponse = {
        success: true,
        plugins: mockPlugins,
        background_updating: true,
      };
      vi.mocked(pluginAPI.refreshPlugins).mockResolvedValue(mockRefreshResponse);
      
      // 第一次调用失败
      const mockError = new Error('网络错误');
      vi.mocked(pluginAPI.getRefreshProgress)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValue({
          success: true,
          is_updating: true,
          current: 5,
          total: 10,
        });
      
      const { result } = renderHook(() => usePlugins());
      
      // 清除之前的调用记录
      vi.clearAllMocks();
      
      // 启动刷新
      await act(async () => {
        await result.current.refreshPlugins();
      });
      
      // 验证第一次调用（失败）
      expect(pluginAPI.getRefreshProgress).toHaveBeenCalledTimes(1);
      
      // 快进 500ms（第二次调用应该成功）
      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });
      
      // 验证轮询继续（没有被错误中断）
      expect(pluginAPI.getRefreshProgress).toHaveBeenCalledTimes(2);
      expect(result.current.refreshProgress.current).toBe(5);
      expect(result.current.refreshProgress.total).toBe(10);
    });
    
    it('应该在没有后台更新时不启动轮询', async () => {
      // Mock refreshPlugins API 返回没有后台更新
      const mockRefreshResponse: PluginsResponse = {
        success: true,
        plugins: mockPlugins,
        background_updating: false,
      };
      vi.mocked(pluginAPI.refreshPlugins).mockResolvedValue(mockRefreshResponse);
      
      const { result } = renderHook(() => usePlugins('env-1'));
      
      // 调用刷新
      await act(async () => {
        await result.current.refreshPlugins();
      });
      
      // 验证没有启动轮询
      expect(pluginAPI.getRefreshProgress).not.toHaveBeenCalled();
      expect(result.current.refreshing).toBe(false);
      
      // 快进 1000ms
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve();
      });
      
      // 验证仍然没有调用
      expect(pluginAPI.getRefreshProgress).not.toHaveBeenCalled();
    });
  });
});
