/**
 * GitErrorPopover 组件 - 单元测试
 * 
 * 测试 GitErrorPopover 组件的各种功能：
 * - 新错误类型的图标颜色
 * - causes 和 solutions 的解析和显示
 * - 向后兼容性（无 causes/solutions 时的回退）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GitErrorPopover } from './GitErrorPopover';
import type { ErrorType } from './GitErrorPopover';

// Mock useToast hook
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

describe('GitErrorPopover', () => {
  const defaultProps = {
    errorType: 'unknown' as ErrorType,
    errorMessage: '测试错误消息',
    errorDetail: '详细的错误日志信息',
    pluginName: '测试插件',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本渲染', () => {
    it('应该正确渲染错误消息按钮', () => {
      render(<GitErrorPopover {...defaultProps} />);
      expect(screen.getByText('测试错误消息')).toBeInTheDocument();
    });

    it('应该在点击按钮后显示对话框', async () => {
      render(<GitErrorPopover {...defaultProps} />);
      
      const button = screen.getByText('测试错误消息');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('plugin.gitError.gitInfoFetchFailed')).toBeInTheDocument();
        expect(screen.getByText(/测试插件/)).toBeInTheDocument();
      });
    });

    it('应该通过关闭按钮关闭对话框', async () => {
      render(<GitErrorPopover {...defaultProps} />);
      
      const button = screen.getByText('测试错误消息');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('plugin.gitError.gitInfoFetchFailed')).toBeInTheDocument();
      });
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(screen.queryByText('plugin.gitError.gitInfoFetchFailed')).not.toBeInTheDocument();
      });
    });
  });

  describe('错误类型图标颜色', () => {
    it('remote 类型应该显示 info 颜色', () => {
      const { container } = render(
        <GitErrorPopover {...defaultProps} errorType="remote" />
      );
      const button = container.querySelector('button');
      expect(button?.className).toContain('text-info');
    });

    it('branch 类型应该显示 primary 颜色', () => {
      const { container } = render(
        <GitErrorPopover {...defaultProps} errorType="branch" />
      );
      const button = container.querySelector('button');
      expect(button?.className).toContain('text-primary');
    });

    it('commit 类型应该显示 success 颜色', () => {
      const { container } = render(
        <GitErrorPopover {...defaultProps} errorType="commit" />
      );
      const button = container.querySelector('button');
      expect(button?.className).toContain('text-success');
    });

    it('authentication 类型应该显示 warning 颜色', () => {
      const { container } = render(
        <GitErrorPopover {...defaultProps} errorType="authentication" />
      );
      const button = container.querySelector('button');
      expect(button?.className).toContain('text-warning');
    });

    it('conflict 类型应该显示 warning 颜色', () => {
      const { container } = render(
        <GitErrorPopover {...defaultProps} errorType="conflict" />
      );
      const button = container.querySelector('button');
      expect(button?.className).toContain('text-warning');
    });

    it('timeout 类型应该显示 warning 颜色', () => {
      const { container } = render(
        <GitErrorPopover {...defaultProps} errorType="timeout" />
      );
      const button = container.querySelector('button');
      expect(button?.className).toContain('text-warning');
    });

    it('permission 类型应该显示 danger 颜色', () => {
      const { container } = render(
        <GitErrorPopover {...defaultProps} errorType="permission" />
      );
      const button = container.querySelector('button');
      expect(button?.className).toContain('text-danger');
    });

    it('network 类型应该显示 warning 颜色', () => {
      const { container } = render(
        <GitErrorPopover {...defaultProps} errorType="network" />
      );
      const button = container.querySelector('button');
      expect(button?.className).toContain('text-warning');
    });

    it('repository 类型应该显示 muted-foreground 颜色', () => {
      const { container } = render(
        <GitErrorPopover {...defaultProps} errorType="repository" />
      );
      const button = container.querySelector('button');
      expect(button?.className).toContain('text-muted-foreground');
    });

    it('unknown 类型应该显示 muted-foreground 颜色', () => {
      const { container } = render(
        <GitErrorPopover {...defaultProps} errorType="unknown" />
      );
      const button = container.querySelector('button');
      expect(button?.className).toContain('text-muted-foreground');
    });
  });

  describe('后端提供的 causes 和 solutions', () => {
    it('应该优先显示后端提供的 causes 和 solutions', async () => {
      const causes = ['原因1', '原因2', '原因3'];
      const solutions = ['解决方案1', '解决方案2', '解决方案3', '解决方案4'];
      
      render(
        <GitErrorPopover
          {...defaultProps}
          errorType="remote"
          causes={causes}
          solutions={solutions}
        />
      );
      
      const button = screen.getByText('测试错误消息');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/plugin.gitError.possibleCauses/)).toBeInTheDocument();
        expect(screen.getByText('原因1')).toBeInTheDocument();
        expect(screen.getByText('原因2')).toBeInTheDocument();
        expect(screen.getByText('原因3')).toBeInTheDocument();
        
        expect(screen.getByText(/plugin.gitError.suggestedAction/)).toBeInTheDocument();
        expect(screen.getByText('解决方案1')).toBeInTheDocument();
        expect(screen.getByText('解决方案2')).toBeInTheDocument();
        expect(screen.getByText('解决方案3')).toBeInTheDocument();
        expect(screen.getByText('解决方案4')).toBeInTheDocument();
      });
    });

    it('应该正确渲染包含中文的 causes 和 solutions', async () => {
      const causes = ['仓库没有配置 origin 远端', '远端配置损坏'];
      const solutions = ['检查是否为有效的 Git 仓库', '运行 git remote add origin <url> 添加远端'];
      
      render(
        <GitErrorPopover
          {...defaultProps}
          errorType="remote"
          causes={causes}
          solutions={solutions}
        />
      );
      
      const button = screen.getByText('测试错误消息');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('仓库没有配置 origin 远端')).toBeInTheDocument();
        expect(screen.getByText('远端配置损坏')).toBeInTheDocument();
        expect(screen.getByText('检查是否为有效的 Git 仓库')).toBeInTheDocument();
        expect(screen.getByText('运行 git remote add origin <url> 添加远端')).toBeInTheDocument();
      });
    });
  });

  describe('向后兼容性 - 硬编码的解决方案', () => {
    it('当没有提供 causes 和 solutions 时，timeout 类型应该显示默认解决方案', async () => {
      render(<GitErrorPopover {...defaultProps} errorType="timeout" />);
      
      const button = screen.getByText('测试错误消息');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('plugin.gitError.networkUnstable')).toBeInTheDocument();
        expect(screen.getByText('plugin.gitError.remoteSlow')).toBeInTheDocument();
        expect(screen.getByText('plugin.gitError.checkNetwork')).toBeInTheDocument();
      });
    });

    it('当没有提供 causes 和 solutions 时，permission 类型应该显示默认解决方案', async () => {
      render(<GitErrorPopover {...defaultProps} errorType="permission" />);
      
      const button = screen.getByText('测试错误消息');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('plugin.gitError.gitRepoCorrupted')).toBeInTheDocument();
        expect(screen.getByText('plugin.gitError.folderPermission')).toBeInTheDocument();
      });
    });

    it('当没有提供 causes 和 solutions 时，network 类型应该显示默认解决方案', async () => {
      render(<GitErrorPopover {...defaultProps} errorType="network" />);
      
      const button = screen.getByText('测试错误消息');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('plugin.gitError.cannotConnect')).toBeInTheDocument();
        expect(screen.getByText('plugin.gitError.dnsFailed')).toBeInTheDocument();
        expect(screen.getByText('plugin.gitError.sslCertIssue')).toBeInTheDocument();
      });
    });

    it('当没有提供 causes 和 solutions 时，repository 类型应该显示默认解决方案', async () => {
      render(<GitErrorPopover {...defaultProps} errorType="repository" />);
      
      const button = screen.getByText('测试错误消息');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('plugin.gitError.gitRepoCorrupted')).toBeInTheDocument();
        expect(screen.getByText('plugin.gitError.emptyRepo')).toBeInTheDocument();
      });
    });

    it('当没有提供 causes 和 solutions 时，remote 类型应该显示默认解决方案', async () => {
      render(<GitErrorPopover {...defaultProps} errorType="remote" />);
      
      const button = screen.getByText('测试错误消息');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('plugin.gitError.noRemote')).toBeInTheDocument();
        expect(screen.getByText('plugin.gitError.remoteCorrupted')).toBeInTheDocument();
      });
    });

    it('当没有提供 causes 和 solutions 时，branch 类型应该显示默认解决方案', async () => {
      render(<GitErrorPopover {...defaultProps} errorType="branch" />);
      
      const button = screen.getByText('测试错误消息');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('plugin.gitError.branchNotExist')).toBeInTheDocument();
        expect(screen.getByText('plugin.gitError.noUpstream')).toBeInTheDocument();
      });
    });

    it('当没有提供 causes 和 solutions 时，commit 类型应该显示默认解决方案', async () => {
      render(<GitErrorPopover {...defaultProps} errorType="commit" />);
      
      const button = screen.getByText('测试错误消息');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('plugin.gitError.noCommits')).toBeInTheDocument();
        expect(screen.getByText('plugin.gitError.commitCorrupted')).toBeInTheDocument();
      });
    });

    it('当没有提供 causes 和 solutions 时，authentication 类型应该显示默认解决方案', async () => {
      render(<GitErrorPopover {...defaultProps} errorType="authentication" />);
      
      const button = screen.getByText('测试错误消息');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('plugin.gitError.authFailed')).toBeInTheDocument();
        expect(screen.getByText('plugin.gitError.tokenExpired')).toBeInTheDocument();
      });
    });

    it('当没有提供 causes 和 solutions 时，conflict 类型应该显示默认解决方案', async () => {
      render(<GitErrorPopover {...defaultProps} errorType="conflict" />);
      
      const button = screen.getByText('测试错误消息');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('plugin.gitError.conflictChanges')).toBeInTheDocument();
        expect(screen.getByText('plugin.gitError.unstagedChanges')).toBeInTheDocument();
      });
    });

    it('当没有提供 causes 和 solutions 时，unknown 类型应该显示默认解决方案', async () => {
      render(<GitErrorPopover {...defaultProps} errorType="unknown" />);
      
      const button = screen.getByText('测试错误消息');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('plugin.gitError.viewDetailLog')).toBeInTheDocument();
        expect(screen.getByText('plugin.gitError.tryFetch')).toBeInTheDocument();
      });
    });
  });

  describe('详细日志功能', () => {
    it('应该能够展开和折叠详细日志', async () => {
      render(<GitErrorPopover {...defaultProps} />);
      
      const button = screen.getByText('测试错误消息');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('plugin.gitError.detailedLog')).toBeInTheDocument();
      });
      
      expect(screen.queryByText('详细的错误日志信息')).not.toBeInTheDocument();
      
      const detailButton = screen.getByText('plugin.gitError.detailedLog');
      fireEvent.click(detailButton);
      
      await waitFor(() => {
        expect(screen.getByText('详细的错误日志信息')).toBeInTheDocument();
      });
      
      fireEvent.click(detailButton);
      
      await waitFor(() => {
        expect(screen.queryByText('详细的错误日志信息')).not.toBeInTheDocument();
      });
    });
  });

  describe('重试功能', () => {
    it('当提供 onRetry 回调时应该显示重试按钮', async () => {
      const onRetry = vi.fn();
      render(<GitErrorPopover {...defaultProps} onRetry={onRetry} />);
      
      const button = screen.getByText('测试错误消息');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('plugin.gitError.retry')).toBeInTheDocument();
      });
    });

    it('点击重试按钮应该调用 onRetry 回调并关闭对话框', async () => {
      const onRetry = vi.fn();
      render(<GitErrorPopover {...defaultProps} onRetry={onRetry} />);
      
      const button = screen.getByText('测试错误消息');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('plugin.gitError.retry')).toBeInTheDocument();
      });
      
      const retryButton = screen.getByText('plugin.gitError.retry');
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(onRetry).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('plugin.gitError.gitInfoFetchFailed')).not.toBeInTheDocument();
      });
    });

    it('当没有提供 onRetry 回调时不应该显示重试按钮', async () => {
      render(<GitErrorPopover {...defaultProps} />);
      
      const button = screen.getByText('测试错误消息');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('plugin.gitError.gitInfoFetchFailed')).toBeInTheDocument();
      });
      
      expect(screen.queryByText('plugin.gitError.retry')).not.toBeInTheDocument();
    });
  });

  describe('复制日志功能', () => {
    it('应该显示复制日志按钮', async () => {
      render(<GitErrorPopover {...defaultProps} />);
      
      const button = screen.getByText('测试错误消息');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('plugin.gitError.copyLog')).toBeInTheDocument();
      });
    });
  });

  describe('边界情况', () => {
    it('应该处理空的 causes 数组', async () => {
      render(
        <GitErrorPopover
          {...defaultProps}
          errorType="remote"
          causes={[]}
          solutions={['解决方案1']}
        />
      );
      
      const button = screen.getByText('测试错误消息');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('plugin.gitError.noRemote')).toBeInTheDocument();
      });
    });

    it('应该处理空的 solutions 数组', async () => {
      render(
        <GitErrorPopover
          {...defaultProps}
          errorType="remote"
          causes={['原因1']}
          solutions={[]}
        />
      );
      
      const button = screen.getByText('测试错误消息');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('plugin.gitError.noRemote')).toBeInTheDocument();
      });
    });

    it('应该处理 undefined 的 causes 和 solutions', async () => {
      render(
        <GitErrorPopover
          {...defaultProps}
          errorType="remote"
          causes={undefined}
          solutions={undefined}
        />
      );
      
      const button = screen.getByText('测试错误消息');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('plugin.gitError.noRemote')).toBeInTheDocument();
      });
    });
  });
});
