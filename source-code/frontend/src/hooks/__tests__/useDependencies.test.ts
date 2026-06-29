/**
 * useDependencies Hook 单元测试
 * 
 * 测试加载和安装功能
 * 测试状态管理和错误处理
 * 
 * 验证需求: 3.1, 3.5
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDependencies } from '../useDependencies';
import { pluginAPI } from '../../services/PluginAPIService';
import type { Dependency, DependenciesResponse, DependencyInstallResponse } from '../../types/plugin';

// Mock pluginAPI
vi.mock('../../services/PluginAPIService', () => ({
  pluginAPI: {
    getPluginDependencies: vi.fn(),
    installDependency: vi.fn(),
  },
}));

describe('useDependencies Hook', () => {
  // 测试数据
  const mockDependencies: Dependency[] = [
    {
      package: 'numpy',
      version: '>=1.20.0',
      installed: true,
      installed_version: '1.24.0',
      version_match: true,
      message: '已安装',
    },
    {
      package: 'pillow',
      version: '>=9.0.0',
      installed: true,
      installed_version: '10.0.0',
      version_match: true,
      message: '已安装',
    },
    {
      package: 'opencv-python',
      version: '>=4.5.0',
      installed: false,
      installed_version: null,
      version_match: false,
      message: '未安装',
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
      const { result } = renderHook(() => useDependencies());
      
      expect(result.current.dependencies).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.installing).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });
  
  describe('loadDependencies', () => {
    it('应该成功加载依赖列表', async () => {
      // Mock API 响应
      const mockResponse: DependenciesResponse = {
        success: true,
        dependencies: mockDependencies,
      };
      vi.mocked(pluginAPI.getPluginDependencies).mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => useDependencies());
      
      // 初始状态
      expect(result.current.loading).toBe(false);
      expect(result.current.dependencies).toEqual([]);
      
      // 加载依赖
      await act(async () => {
        await result.current.loadDependencies('ComfyUI-Manager');
      });
      
      // 验证状态
      expect(result.current.loading).toBe(false);
      expect(result.current.dependencies).toEqual(mockDependencies);
      expect(result.current.error).toBeNull();
      
      // 验证 API 调用
      expect(pluginAPI.getPluginDependencies).toHaveBeenCalledWith('ComfyUI-Manager');
      expect(pluginAPI.getPluginDependencies).toHaveBeenCalledTimes(1);
    });
    
    it('应该处理加载失败（API 返回 success: false）', async () => {
      // Mock API 响应
      const mockResponse: DependenciesResponse = {
        success: false,
        error: '加载依赖失败',
      };
      vi.mocked(pluginAPI.getPluginDependencies).mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => useDependencies());
      
      // 加载依赖
      await act(async () => {
        await result.current.loadDependencies('ComfyUI-Manager');
      });
      
      // 验证状态
      expect(result.current.dependencies).toEqual([]);
      expect(result.current.error).toBe('加载依赖失败');
      expect(result.current.loading).toBe(false);
    });
    
    it('应该处理加载异常', async () => {
      // Mock API 抛出异常
      const mockError = new Error('网络错误');
      vi.mocked(pluginAPI.getPluginDependencies).mockRejectedValue(mockError);
      
      const { result } = renderHook(() => useDependencies());
      
      // 加载依赖
      await act(async () => {
        await result.current.loadDependencies('ComfyUI-Manager');
      });
      
      // 验证状态
      expect(result.current.dependencies).toEqual([]);
      expect(result.current.error).toBe('网络错误');
      expect(result.current.loading).toBe(false);
    });
    
    it('应该在加载过程中设置 loading 状态', async () => {
      // Mock API 响应（延迟）
      const mockResponse: DependenciesResponse = {
        success: true,
        dependencies: mockDependencies,
      };
      vi.mocked(pluginAPI.getPluginDependencies).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockResponse), 100))
      );
      
      const { result } = renderHook(() => useDependencies());
      
      // 开始加载
      act(() => {
        result.current.loadDependencies('ComfyUI-Manager');
      });
      
      // 验证 loading 状态
      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });
      
      // 等待加载完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.dependencies).toEqual(mockDependencies);
    });
    
    it('应该在加载失败时清空依赖列表', async () => {
      // 先加载成功
      const mockResponse1: DependenciesResponse = {
        success: true,
        dependencies: mockDependencies,
      };
      vi.mocked(pluginAPI.getPluginDependencies).mockResolvedValueOnce(mockResponse1);
      
      const { result } = renderHook(() => useDependencies());
      
      await act(async () => {
        await result.current.loadDependencies('ComfyUI-Manager');
      });
      
      expect(result.current.dependencies).toEqual(mockDependencies);
      
      // 再加载失败
      const mockResponse2: DependenciesResponse = {
        success: false,
        error: '加载失败',
      };
      vi.mocked(pluginAPI.getPluginDependencies).mockResolvedValueOnce(mockResponse2);
      
      await act(async () => {
        await result.current.loadDependencies('ComfyUI-Manager');
      });
      
      // 验证依赖列表被清空
      expect(result.current.dependencies).toEqual([]);
      expect(result.current.error).toBe('加载失败');
    });
  });
  
  describe('installDependency', () => {
    beforeEach(async () => {
      // 先加载依赖列表
      const mockResponse: DependenciesResponse = {
        success: true,
        dependencies: mockDependencies,
      };
      vi.mocked(pluginAPI.getPluginDependencies).mockResolvedValue(mockResponse);
    });
    
    it('应该成功安装依赖', async () => {
      // Mock API 响应
      const mockResponse: DependencyInstallResponse = {
        success: true,
        installed: true,
        installed_version: '4.8.0',
      };
      vi.mocked(pluginAPI.installDependency).mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => useDependencies());
      
      // 先加载依赖列表
      await act(async () => {
        await result.current.loadDependencies('ComfyUI-Manager');
      });
      
      // 安装依赖
      let installResult: boolean = false;
      await act(async () => {
        installResult = await result.current.installDependency(
          'ComfyUI-Manager',
          'opencv-python',
          '>=4.5.0'
        );
      });
      
      // 验证返回值
      expect(installResult).toBe(true);
      
      // 验证状态更新
      const installedDep = result.current.dependencies.find(
        dep => dep.package === 'opencv-python'
      );
      expect(installedDep).toBeDefined();
      expect(installedDep?.installed).toBe(true);
      expect(installedDep?.installed_version).toBe('4.8.0');
      expect(installedDep?.version_match).toBe(true);
      expect(installedDep?.message).toBe('已安装');
      
      // 验证 installing 状态已清除
      expect(result.current.installing).toBeNull();
      expect(result.current.error).toBeNull();
      
      // 验证 API 调用
      expect(pluginAPI.installDependency).toHaveBeenCalledWith(
        'ComfyUI-Manager',
        'opencv-python',
        '>=4.5.0'
      );
      expect(pluginAPI.installDependency).toHaveBeenCalledTimes(1);
    });
    
    it('应该处理安装失败（API 返回 success: false）', async () => {
      // Mock API 响应
      const mockResponse: DependencyInstallResponse = {
        success: false,
        error: '安装失败',
      };
      vi.mocked(pluginAPI.installDependency).mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => useDependencies());
      
      // 先加载依赖列表
      await act(async () => {
        await result.current.loadDependencies('ComfyUI-Manager');
      });
      
      // 安装依赖
      let installResult: boolean = false;
      await act(async () => {
        installResult = await result.current.installDependency(
          'ComfyUI-Manager',
          'opencv-python',
          '>=4.5.0'
        );
      });
      
      // 验证返回值
      expect(installResult).toBe(false);
      
      // 验证状态
      expect(result.current.error).toBe('安装失败');
      expect(result.current.installing).toBeNull();
      
      // 验证依赖状态未改变
      const dep = result.current.dependencies.find(
        dep => dep.package === 'opencv-python'
      );
      expect(dep?.installed).toBe(false);
    });
    
    it('应该处理安装异常', async () => {
      // Mock API 抛出异常
      const mockError = new Error('网络超时');
      vi.mocked(pluginAPI.installDependency).mockRejectedValue(mockError);
      
      const { result } = renderHook(() => useDependencies());
      
      // 先加载依赖列表
      await act(async () => {
        await result.current.loadDependencies('ComfyUI-Manager');
      });
      
      // 安装依赖
      let installResult: boolean = false;
      await act(async () => {
        installResult = await result.current.installDependency(
          'ComfyUI-Manager',
          'opencv-python',
          '>=4.5.0'
        );
      });
      
      // 验证返回值
      expect(installResult).toBe(false);
      
      // 验证状态
      expect(result.current.error).toBe('网络超时');
      expect(result.current.installing).toBeNull();
    });
    
    it('应该在安装过程中设置 installing 状态', async () => {
      // Mock API 响应（延迟）
      const mockResponse: DependencyInstallResponse = {
        success: true,
        installed: true,
        installed_version: '4.8.0',
      };
      vi.mocked(pluginAPI.installDependency).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockResponse), 100))
      );
      
      const { result } = renderHook(() => useDependencies());
      
      // 先加载依赖列表
      await act(async () => {
        await result.current.loadDependencies('ComfyUI-Manager');
      });
      
      // 开始安装
      act(() => {
        result.current.installDependency('ComfyUI-Manager', 'opencv-python', '>=4.5.0');
      });
      
      // 验证 installing 状态
      await waitFor(() => {
        expect(result.current.installing).toBe('opencv-python');
      });
      
      // 等待安装完成
      await waitFor(() => {
        expect(result.current.installing).toBeNull();
      });
      
      // 验证依赖已安装
      const dep = result.current.dependencies.find(
        dep => dep.package === 'opencv-python'
      );
      expect(dep?.installed).toBe(true);
    });
    
    it('应该只更新对应包的状态，不影响其他依赖', async () => {
      // Mock API 响应
      const mockResponse: DependencyInstallResponse = {
        success: true,
        installed: true,
        installed_version: '4.8.0',
      };
      vi.mocked(pluginAPI.installDependency).mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => useDependencies());
      
      // 先加载依赖列表
      await act(async () => {
        await result.current.loadDependencies('ComfyUI-Manager');
      });
      
      // 记录安装前的其他依赖状态
      const numpyBefore = result.current.dependencies.find(
        dep => dep.package === 'numpy'
      );
      const pillowBefore = result.current.dependencies.find(
        dep => dep.package === 'pillow'
      );
      
      // 安装 opencv-python
      await act(async () => {
        await result.current.installDependency(
          'ComfyUI-Manager',
          'opencv-python',
          '>=4.5.0'
        );
      });
      
      // 验证其他依赖状态未改变
      const numpyAfter = result.current.dependencies.find(
        dep => dep.package === 'numpy'
      );
      const pillowAfter = result.current.dependencies.find(
        dep => dep.package === 'pillow'
      );
      
      expect(numpyAfter).toEqual(numpyBefore);
      expect(pillowAfter).toEqual(pillowBefore);
      
      // 验证 opencv-python 已安装
      const opencvAfter = result.current.dependencies.find(
        dep => dep.package === 'opencv-python'
      );
      expect(opencvAfter?.installed).toBe(true);
    });
  });
  
  describe('clearDependencies', () => {
    it('应该清除依赖列表和错误信息', async () => {
      // Mock API 响应
      const mockResponse: DependenciesResponse = {
        success: true,
        dependencies: mockDependencies,
      };
      vi.mocked(pluginAPI.getPluginDependencies).mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => useDependencies());
      
      // 先加载依赖列表
      await act(async () => {
        await result.current.loadDependencies('ComfyUI-Manager');
      });
      
      expect(result.current.dependencies).toEqual(mockDependencies);
      
      // 清除依赖列表
      act(() => {
        result.current.clearDependencies();
      });
      
      // 验证状态
      expect(result.current.dependencies).toEqual([]);
      expect(result.current.error).toBeNull();
    });
    
    it('应该在有错误时清除错误信息', async () => {
      // Mock API 响应（失败）
      const mockResponse: DependenciesResponse = {
        success: false,
        error: '加载失败',
      };
      vi.mocked(pluginAPI.getPluginDependencies).mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => useDependencies());
      
      // 加载依赖（失败）
      await act(async () => {
        await result.current.loadDependencies('ComfyUI-Manager');
      });
      
      expect(result.current.error).toBe('加载失败');
      
      // 清除依赖列表
      act(() => {
        result.current.clearDependencies();
      });
      
      // 验证错误已清除
      expect(result.current.error).toBeNull();
    });
  });
  
  describe('错误处理', () => {
    it('应该在加载时清除之前的错误', async () => {
      // 第一次加载失败
      const mockResponse1: DependenciesResponse = {
        success: false,
        error: '第一次失败',
      };
      vi.mocked(pluginAPI.getPluginDependencies).mockResolvedValueOnce(mockResponse1);
      
      const { result } = renderHook(() => useDependencies());
      
      await act(async () => {
        await result.current.loadDependencies('ComfyUI-Manager');
      });
      
      expect(result.current.error).toBe('第一次失败');
      
      // 第二次加载成功
      const mockResponse2: DependenciesResponse = {
        success: true,
        dependencies: mockDependencies,
      };
      vi.mocked(pluginAPI.getPluginDependencies).mockResolvedValueOnce(mockResponse2);
      
      await act(async () => {
        await result.current.loadDependencies('ComfyUI-Manager');
      });
      
      // 验证错误已清除
      expect(result.current.error).toBeNull();
      expect(result.current.dependencies).toEqual(mockDependencies);
    });
    
    it('应该在安装时清除之前的错误', async () => {
      // 先加载依赖列表
      const mockResponse: DependenciesResponse = {
        success: true,
        dependencies: mockDependencies,
      };
      vi.mocked(pluginAPI.getPluginDependencies).mockResolvedValue(mockResponse);
      
      const { result } = renderHook(() => useDependencies());
      
      await act(async () => {
        await result.current.loadDependencies('ComfyUI-Manager');
      });
      
      // 第一次安装失败
      const mockInstallResponse1: DependencyInstallResponse = {
        success: false,
        error: '第一次安装失败',
      };
      vi.mocked(pluginAPI.installDependency).mockResolvedValueOnce(mockInstallResponse1);
      
      await act(async () => {
        await result.current.installDependency('ComfyUI-Manager', 'opencv-python', '>=4.5.0');
      });
      
      expect(result.current.error).toBe('第一次安装失败');
      
      // 第二次安装成功
      const mockInstallResponse2: DependencyInstallResponse = {
        success: true,
        installed: true,
        installed_version: '4.8.0',
      };
      vi.mocked(pluginAPI.installDependency).mockResolvedValueOnce(mockInstallResponse2);
      
      await act(async () => {
        await result.current.installDependency('ComfyUI-Manager', 'opencv-python', '>=4.5.0');
      });
      
      // 验证错误已清除
      expect(result.current.error).toBeNull();
    });
  });
  
  describe('并发安装', () => {
    it('应该防止同时安装多个依赖', async () => {
      // Mock API 响应（延迟）
      const mockResponse: DependencyInstallResponse = {
        success: true,
        installed: true,
        installed_version: '4.8.0',
      };
      vi.mocked(pluginAPI.installDependency).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockResponse), 100))
      );
      
      // 先加载依赖列表
      const mockDepsResponse: DependenciesResponse = {
        success: true,
        dependencies: mockDependencies,
      };
      vi.mocked(pluginAPI.getPluginDependencies).mockResolvedValue(mockDepsResponse);
      
      const { result } = renderHook(() => useDependencies());
      
      await act(async () => {
        await result.current.loadDependencies('ComfyUI-Manager');
      });
      
      // 同时开始安装两个依赖
      act(() => {
        result.current.installDependency('ComfyUI-Manager', 'opencv-python', '>=4.5.0');
        result.current.installDependency('ComfyUI-Manager', 'numpy', '>=1.20.0');
      });
      
      // 验证只有一个在安装（最后一个）
      await waitFor(() => {
        expect(result.current.installing).toBe('numpy');
      });
    });
  });
});
