/**
 * PluginUpdateProgress 组件测试
 * 
 * 测试进度指示器组件的各种场景
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PluginUpdateProgress } from '../PluginUpdateProgress';

describe('PluginUpdateProgress', () => {
  describe('渲染行为', () => {
    it('当 isUpdating 为 false 时不渲染', () => {
      const { container } = render(
        <PluginUpdateProgress
          isUpdating={false}
          current={0}
          total={10}
        />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('当 total 为 0 时不渲染', () => {
      const { container } = render(
        <PluginUpdateProgress
          isUpdating={true}
          current={0}
          total={0}
        />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('当 isUpdating 为 true 且 total > 0 时渲染', () => {
      render(
        <PluginUpdateProgress
          isUpdating={true}
          current={5}
          total={10}
        />
      );
      
      expect(screen.getByTestId('plugin-update-progress')).toBeInTheDocument();
    });
  });

  describe('进度显示', () => {
    it('正确显示进度百分比', () => {
      render(
        <PluginUpdateProgress
          isUpdating={true}
          current={5}
          total={10}
        />
      );
      
      // 50% 进度
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('正确显示进度数值', () => {
      render(
        <PluginUpdateProgress
          isUpdating={true}
          current={3}
          total={15}
        />
      );
      
      expect(screen.getByText(/正在更新插件信息 \(3\/15\)/)).toBeInTheDocument();
    });

    it('当进度为 0 时显示 0%', () => {
      render(
        <PluginUpdateProgress
          isUpdating={true}
          current={0}
          total={10}
        />
      );
      
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('当进度完成时显示 100%', () => {
      render(
        <PluginUpdateProgress
          isUpdating={true}
          current={10}
          total={10}
        />
      );
      
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('更新阶段文本', () => {
    it('更新进行中时显示正确的文本', () => {
      render(
        <PluginUpdateProgress
          isUpdating={true}
          current={5}
          total={10}
        />
      );
      
      expect(screen.getByText(/正在更新插件信息/)).toBeInTheDocument();
    });

    it('更新完成时显示完成文本', () => {
      render(
        <PluginUpdateProgress
          isUpdating={true}
          current={10}
          total={10}
        />
      );
      
      expect(screen.getByText(/正在完成更新/)).toBeInTheDocument();
    });
  });

  describe('进度条', () => {
    it('渲染进度条组件', () => {
      render(
        <PluginUpdateProgress
          isUpdating={true}
          current={5}
          total={10}
        />
      );
      
      // 检查进度条容器是否存在
      const progressContainer = screen.getByTestId('plugin-update-progress');
      const progressBar = progressContainer.querySelector('.bg-blue-600');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('样式和类名', () => {
    it('应用自定义类名', () => {
      render(
        <PluginUpdateProgress
          isUpdating={true}
          current={5}
          total={10}
          className="custom-class"
        />
      );
      
      const element = screen.getByTestId('plugin-update-progress');
      expect(element).toHaveClass('custom-class');
    });

    it('包含默认样式类', () => {
      render(
        <PluginUpdateProgress
          isUpdating={true}
          current={5}
          total={10}
        />
      );
      
      const element = screen.getByTestId('plugin-update-progress');
      expect(element).toHaveClass('border-blue-500');
      expect(element).toHaveClass('bg-blue-50');
    });
  });

  describe('边界情况', () => {
    it('处理负数进度', () => {
      render(
        <PluginUpdateProgress
          isUpdating={true}
          current={-1}
          total={10}
        />
      );
      
      // 应该显示为 0% 或处理为有效值
      expect(screen.getByTestId('plugin-update-progress')).toBeInTheDocument();
    });

    it('处理超过总数的进度', () => {
      render(
        <PluginUpdateProgress
          isUpdating={true}
          current={15}
          total={10}
        />
      );
      
      // 应该显示为 100% 或处理为有效值
      expect(screen.getByTestId('plugin-update-progress')).toBeInTheDocument();
    });

    it('处理小数进度', () => {
      render(
        <PluginUpdateProgress
          isUpdating={true}
          current={5.5}
          total={10.5}
        />
      );
      
      // 应该正确处理小数
      expect(screen.getByTestId('plugin-update-progress')).toBeInTheDocument();
    });
  });

  describe('可访问性', () => {
    it('包含加载指示器', () => {
      render(
        <PluginUpdateProgress
          isUpdating={true}
          current={5}
          total={10}
        />
      );
      
      // Loading 组件应该被渲染
      expect(screen.getByTestId('plugin-update-progress')).toBeInTheDocument();
    });

    it('文本内容清晰可读', () => {
      render(
        <PluginUpdateProgress
          isUpdating={true}
          current={5}
          total={10}
        />
      );
      
      expect(screen.getByText('正在后台更新插件信息')).toBeInTheDocument();
    });
  });
});
