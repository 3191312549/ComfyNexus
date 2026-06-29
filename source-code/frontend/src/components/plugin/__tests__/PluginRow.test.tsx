/* eslint-disable no-restricted-syntax */
/**
 * PluginRow 组件单元测试
 * 
 * 测试所有信息字段的渲染
 * 测试更新状态的高亮显示
 * 测试依赖更新提示的显示
 * 测试各种点击事件
 * 
 * 验证需求: 1.2, 1.3, 1.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PluginRow } from '../PluginRow';
import { pluginAPI } from '@/services/PluginAPIService';
import type { PluginInfo } from '@/types/plugin';

// Mock pluginAPI
vi.mock('@/services/PluginAPIService', () => ({
  pluginAPI: {
    openPluginFolder: vi.fn(),
    uninstallPlugin: vi.fn(),
  },
}));

// Mock useToast
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock 子组件
vi.mock('../DependencyBadge', () => ({
  DependencyBadge: ({ show }: { show: boolean }) => 
    show ? <div data-testid="dependency-badge">!</div> : null,
}));

vi.mock('../GitErrorPopover', () => ({
  GitErrorPopover: ({ errorMessage, causes, solutions }: any) => (
    <div data-testid="git-error-popover">
      <span>错误: {errorMessage}</span>
      {causes && <div data-testid="error-causes">{JSON.stringify(causes)}</div>}
      {solutions && <div data-testid="error-solutions">{JSON.stringify(solutions)}</div>}
    </div>
  ),
}));

vi.mock('../DependencyCard', () => ({
  DependencyCard: ({ pluginName, onClose, onDependencyViewed }: any) => (
    <div data-testid="dependency-card">
      <span>依赖卡片: {pluginName}</span>
      <button onClick={onClose}>关闭</button>
      <button onClick={onDependencyViewed}>已查看</button>
    </div>
  ),
}));

vi.mock('../UpdateCard', () => ({
  UpdateCard: ({ plugin, onClose, onUpdateComplete }: any) => (
    <div data-testid="update-card">
      <span>更新卡片: {plugin.name}</span>
      <button onClick={onClose}>关闭</button>
      <button onClick={onUpdateComplete}>完成</button>
    </div>
  ),
}));

vi.mock('../BranchSelector', () => ({
  BranchSelector: ({ pluginName, onClose, onBranchChanged }: any) => (
    <div data-testid="branch-selector">
      <span>分支选择器: {pluginName}</span>
      <button onClick={onClose}>关闭</button>
      <button onClick={onBranchChanged}>已切换</button>
    </div>
  ),
}));

// Mock AlertDialog 组件
vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: any) => open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: any) => <div data-testid="alert-dialog-content">{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div data-testid="alert-dialog-title">{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div data-testid="alert-dialog-description">{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick }: any) => <button onClick={onClick} data-testid="alert-dialog-action">{children}</button>,
  AlertDialogCancel: ({ children, onClick }: any) => <button onClick={onClick} data-testid="alert-dialog-cancel">{children}</button>,
}));

// 移除 window.confirm mock（不再需要）

describe('PluginRow 组件', () => {
  // 测试数据
  const mockPlugin: PluginInfo = {
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
  };

  const mockOnRefresh = vi.fn();
  const mockOnUpdate = vi.fn();
  const mockOnRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('信息字段渲染', () => {
    it('应该渲染插件名称', () => {
      render(<PluginRow plugin={mockPlugin} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      expect(screen.getByText('ComfyUI-Manager')).toBeInTheDocument();
    });

    it('应该渲染查询依赖按钮', () => {
      render(<PluginRow plugin={mockPlugin} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      expect(screen.getByText('查询依赖')).toBeInTheDocument();
    });

    it('应该渲染 GitHub 地址', () => {
      render(<PluginRow plugin={mockPlugin} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://github.com/ltdrdata/ComfyUI-Manager');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('应该在没有 GitHub 地址时显示禁用的图标', () => {
      const pluginWithoutUrl = { ...mockPlugin, git_url: null };
      const { container } = render(<PluginRow plugin={pluginWithoutUrl} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      // 应该显示禁用的 GitHub 图标（opacity-30 类）
      const disabledIcon = container.querySelector('.opacity-30');
      expect(disabledIcon).toBeInTheDocument();
    });

    it('应该渲染分支名称', () => {
      render(<PluginRow plugin={mockPlugin} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      // 分支名称应该是可点击的按钮
      const branchButtons = screen.getAllByRole('button');
      const branchButton = branchButtons.find(btn => btn.textContent === 'main');
      expect(branchButton).toBeInTheDocument();
    });

    it('应该在没有分支时显示 "-"', () => {
      const pluginWithoutBranch = { ...mockPlugin, branch: null };
      render(<PluginRow plugin={pluginWithoutBranch} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      const cells = screen.getAllByText('-');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('应该渲染版本（commit hash）', () => {
      render(<PluginRow plugin={mockPlugin} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      expect(screen.getByText('abc1234')).toBeInTheDocument();
    });

    it('应该格式化并渲染更新时间', () => {
      render(<PluginRow plugin={mockPlugin} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      // 日期应该被格式化为完整时间戳格式 YYYY-MM-DD HH:mm:ss
      // 2024-01-01T00:00:00Z 在本地时区（UTC+8）应该显示为 2024-01-01 08:00:00
      expect(screen.getByText('2024-01-01 08:00:00')).toBeInTheDocument();
    });

    it('应该在没有更新时间时显示 "-"', () => {
      const pluginWithoutDate = { ...mockPlugin, commit_date: null };
      render(<PluginRow plugin={pluginWithoutDate} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      const cells = screen.getAllByText('-');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('应该渲染卸载按钮', () => {
      render(<PluginRow plugin={mockPlugin} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      // 卸载按钮包含 Trash2 图标
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('更新状态显示', () => {
    it('应该在有更新时高亮显示行', () => {
      const pluginWithUpdate = {
        ...mockPlugin,
        has_update: true,
        behind_commits: 5,
      };
      
      const { container } = render(
        <PluginRow plugin={pluginWithUpdate} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />
      );
      
      // 检查是否有高亮样式类
      const row = container.querySelector('[class*="bg-orange"]');
      expect(row).toBeInTheDocument();
    });

    it('应该在有更新时显示更新按钮', () => {
      const pluginWithUpdate = {
        ...mockPlugin,
        has_update: true,
        behind_commits: 5,
      };
      
      render(<PluginRow plugin={pluginWithUpdate} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      expect(screen.getByText('更新')).toBeInTheDocument();
    });

    it('应该在没有更新时不显示更新按钮', () => {
      render(<PluginRow plugin={mockPlugin} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      expect(screen.queryByText('更新')).not.toBeInTheDocument();
    });

    it('应该显示落后的提交数', () => {
      const pluginWithUpdate = {
        ...mockPlugin,
        has_update: true,
        behind_commits: 5,
      };
      
      render(<PluginRow plugin={pluginWithUpdate} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      expect(screen.getByText(/落后 5 个提交/)).toBeInTheDocument();
    });
  });

  describe('依赖更新提示显示', () => {
    it('应该在依赖有更新且未查看时显示叹号图标', () => {
      const pluginWithDependencyUpdate = {
        ...mockPlugin,
        dependency_updated: true,
        dependency_viewed: false,
      };
      
      render(<PluginRow plugin={pluginWithDependencyUpdate} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      expect(screen.getByTestId('dependency-badge')).toBeInTheDocument();
    });

    it('应该在依赖已查看时不显示叹号图标', () => {
      const pluginWithViewedDependency = {
        ...mockPlugin,
        dependency_updated: true,
        dependency_viewed: true,
      };
      
      render(<PluginRow plugin={pluginWithViewedDependency} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      expect(screen.queryByTestId('dependency-badge')).not.toBeInTheDocument();
    });

    it('应该在依赖无更新时不显示叹号图标', () => {
      render(<PluginRow plugin={mockPlugin} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      expect(screen.queryByTestId('dependency-badge')).not.toBeInTheDocument();
    });
  });

  describe('点击事件', () => {
    it('应该在点击插件名称时打开文件夹', async () => {
      vi.mocked(pluginAPI.openPluginFolder).mockResolvedValue({
        success: true,
      });
      
      render(<PluginRow plugin={mockPlugin} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      const pluginNameButton = screen.getByText('ComfyUI-Manager');
      fireEvent.click(pluginNameButton);
      
      await waitFor(() => {
        expect(pluginAPI.openPluginFolder).toHaveBeenCalledWith('ComfyUI-Manager');
      });
    });

    it('应该在点击查询依赖按钮时显示依赖卡片', () => {
      render(<PluginRow plugin={mockPlugin} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      const dependencyButton = screen.getByText('查询依赖');
      fireEvent.click(dependencyButton);
      
      expect(screen.getByTestId('dependency-card')).toBeInTheDocument();
      expect(screen.getByText('依赖卡片: ComfyUI-Manager')).toBeInTheDocument();
    });

    it('应该在点击更新按钮时显示更新卡片', () => {
      const pluginWithUpdate = {
        ...mockPlugin,
        has_update: true,
        behind_commits: 5,
      };
      
      render(<PluginRow plugin={pluginWithUpdate} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      const updateButton = screen.getByText('更新');
      fireEvent.click(updateButton);
      
      expect(screen.getByTestId('update-card')).toBeInTheDocument();
      expect(screen.getByText('更新卡片: ComfyUI-Manager')).toBeInTheDocument();
    });

    it('应该在点击分支名称时显示分支选择器', () => {
      render(<PluginRow plugin={mockPlugin} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      const branchButtons = screen.getAllByRole('button');
      const branchButton = branchButtons.find(btn => btn.textContent === 'main');
      fireEvent.click(branchButton!);
      
      expect(screen.getByTestId('branch-selector')).toBeInTheDocument();
      expect(screen.getByText('分支选择器: ComfyUI-Manager')).toBeInTheDocument();
    });

    it('应该在点击卸载按钮时显示确认对话框', async () => {
      render(<PluginRow plugin={mockPlugin} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      // 找到卸载按钮（包含 Trash2 图标的按钮）
      const buttons = screen.getAllByRole('button');
      const uninstallButton = buttons[buttons.length - 1]; // 最后一个按钮是卸载按钮
      fireEvent.click(uninstallButton);
      
      // 应该显示 AlertDialog
      await waitFor(() => {
        expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
      });
      
      // 检查对话框内容
      expect(screen.getByTestId('alert-dialog-title')).toHaveTextContent('确认卸载插件');
      expect(screen.getByTestId('alert-dialog-description')).toHaveTextContent('ComfyUI-Manager');
      expect(screen.getByTestId('alert-dialog-description')).toHaveTextContent('此操作不可撤销');
    });

    it('应该在确认卸载后调用 API', async () => {
      vi.mocked(pluginAPI.uninstallPlugin).mockResolvedValue({
        success: true,
      });
      
      render(<PluginRow plugin={mockPlugin} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      // 点击卸载按钮
      const buttons = screen.getAllByRole('button');
      const uninstallButton = buttons[buttons.length - 1];
      fireEvent.click(uninstallButton);
      
      // 等待对话框出现
      await waitFor(() => {
        expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
      });
      
      // 点击确认按钮
      const confirmButton = screen.getByTestId('alert-dialog-action');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(pluginAPI.uninstallPlugin).toHaveBeenCalledWith('ComfyUI-Manager');
      });
    });

    it('应该在卸载成功后调用刷新回调', async () => {
      vi.mocked(pluginAPI.uninstallPlugin).mockResolvedValue({
        success: true,
      });
      
      render(<PluginRow plugin={mockPlugin} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      // 点击卸载按钮
      const buttons = screen.getAllByRole('button');
      const uninstallButton = buttons[buttons.length - 1];
      fireEvent.click(uninstallButton);
      
      // 等待对话框出现并点击确认
      await waitFor(() => {
        expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
      });
      
      const confirmButton = screen.getByTestId('alert-dialog-action');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockOnRemove).toHaveBeenCalledWith('ComfyUI-Manager');
      });
    });

    it('应该在取消卸载时不调用 API', async () => {
      render(<PluginRow plugin={mockPlugin} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      // 点击卸载按钮
      const buttons = screen.getAllByRole('button');
      const uninstallButton = buttons[buttons.length - 1];
      fireEvent.click(uninstallButton);
      
      // 等待对话框出现
      await waitFor(() => {
        expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
      });
      
      // 点击取消按钮
      const cancelButton = screen.getByTestId('alert-dialog-cancel');
      fireEvent.click(cancelButton);
      
      // 对话框应该关闭，API 不应该被调用
      await waitFor(() => {
        expect(screen.queryByTestId('alert-dialog')).not.toBeInTheDocument();
      });
      
      expect(pluginAPI.uninstallPlugin).not.toHaveBeenCalled();
    });
  });

  describe('子组件交互', () => {
    it('应该在关闭依赖卡片时隐藏它', () => {
      render(<PluginRow plugin={mockPlugin} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      // 打开依赖卡片
      const dependencyButton = screen.getByText('查询依赖');
      fireEvent.click(dependencyButton);
      
      expect(screen.getByTestId('dependency-card')).toBeInTheDocument();
      
      // 关闭依赖卡片
      const closeButton = screen.getByText('关闭');
      fireEvent.click(closeButton);
      
      expect(screen.queryByTestId('dependency-card')).not.toBeInTheDocument();
    });

    it('应该在依赖已查看后调用刷新回调', () => {
      render(<PluginRow plugin={mockPlugin} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      // 打开依赖卡片
      const dependencyButton = screen.getByText('查询依赖');
      fireEvent.click(dependencyButton);
      
      // 点击已查看
      const viewedButton = screen.getByText('已查看');
      fireEvent.click(viewedButton);
      
      expect(mockOnRefresh).toHaveBeenCalled();
    });

    it('应该在更新完成后关闭更新卡片并刷新', () => {
      const pluginWithUpdate = {
        ...mockPlugin,
        has_update: true,
        behind_commits: 5,
      };
      
      render(<PluginRow plugin={pluginWithUpdate} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      // 打开更新卡片
      const updateButton = screen.getByText('更新');
      fireEvent.click(updateButton);
      
      expect(screen.getByTestId('update-card')).toBeInTheDocument();
      
      // 完成更新
      const completeButton = screen.getByText('完成');
      fireEvent.click(completeButton);
      
      expect(screen.queryByTestId('update-card')).not.toBeInTheDocument();
      expect(mockOnRefresh).toHaveBeenCalled();
    });

    it('应该在分支切换后关闭分支选择器并刷新', () => {
      render(<PluginRow plugin={mockPlugin} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      // 打开分支选择器
      const branchButtons = screen.getAllByRole('button');
      const branchButton = branchButtons.find(btn => btn.textContent === 'main');
      fireEvent.click(branchButton!);
      
      expect(screen.getByTestId('branch-selector')).toBeInTheDocument();
      
      // 切换分支
      const changedButton = screen.getByText('已切换');
      fireEvent.click(changedButton);
      
      expect(screen.queryByTestId('branch-selector')).not.toBeInTheDocument();
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    it('应该处理打开文件夹失败', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(pluginAPI.openPluginFolder).mockResolvedValue({
        success: false,
        error: '文件夹不存在',
      });
      
      render(<PluginRow plugin={mockPlugin} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      const pluginNameButton = screen.getByText('ComfyUI-Manager');
      fireEvent.click(pluginNameButton);
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });
      
      consoleError.mockRestore();
    });

    it('应该处理卸载失败', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(pluginAPI.uninstallPlugin).mockResolvedValue({
        success: false,
        error: '权限不足',
      });
      
      render(<PluginRow plugin={mockPlugin} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      // 点击卸载按钮
      const buttons = screen.getAllByRole('button');
      const uninstallButton = buttons[buttons.length - 1];
      fireEvent.click(uninstallButton);
      
      // 等待对话框出现并点击确认
      await waitFor(() => {
        expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
      });
      
      const confirmButton = screen.getByTestId('alert-dialog-action');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });
      
      consoleError.mockRestore();
    });
  });

  describe('逐步填充显示', () => {
    it('应该在 Git 信息加载时显示加载动画', () => {
      const pluginLoading = {
        ...mockPlugin,
        commit_hash: null,
        branch: null,
        commit_date: null,
      };
      
      render(<PluginRow plugin={pluginLoading} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      // 应该显示加载中文本
      const loadingTexts = screen.getAllByText('加载中...');
      expect(loadingTexts.length).toBeGreaterThan(0);
    });

    it('应该在 Git 信息加载完成后显示数据', () => {
      render(<PluginRow plugin={mockPlugin} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      // 应该显示实际数据
      expect(screen.getByText('main')).toBeInTheDocument();
      expect(screen.getByText('abc1234')).toBeInTheDocument();
      expect(screen.getByText('2024-01-01 08:00:00')).toBeInTheDocument();
      
      // 不应该显示加载中
      expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
    });

    it('应该立即显示基础信息（插件名）', () => {
      const pluginLoading = {
        ...mockPlugin,
        commit_hash: null,
        branch: null,
        commit_date: null,
      };
      
      render(<PluginRow plugin={pluginLoading} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      // 基础信息应该立即显示
      expect(screen.getByText('ComfyUI-Manager')).toBeInTheDocument();
      expect(screen.getByText('查询依赖')).toBeInTheDocument();
    });

    it('应该在 commit_hash 为 "-" 时显示加载动画', () => {
      const pluginLoading = {
        ...mockPlugin,
        commit_hash: '-',
      };
      
      render(<PluginRow plugin={pluginLoading} onRefresh={mockOnRefresh} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />);
      
      // 应该显示加载中
      const loadingTexts = screen.getAllByText('加载中...');
      expect(loadingTexts.length).toBeGreaterThan(0);
    });
  });

  describe('错误信息传递 - JSON 解析', () => {
    it('应该正确解析 git_fetch_error_causes 和 git_fetch_error_solutions JSON 字符串', () => {
      const pluginWithError = {
        ...mockPlugin,
        git_fetch_error: '未配置远端地址',
        git_fetch_error_type: 'remote',
        git_fetch_error_detail: 'fatal: No such remote \'origin\'',
        git_fetch_error_causes: JSON.stringify(['仓库没有配置 origin 远端']),
        git_fetch_error_solutions: JSON.stringify(['检查是否为有效的 Git 仓库', '运行 git remote add origin <url> 添加远端']),
      };
      
      render(<PluginRow plugin={pluginWithError} onRefresh={mockOnRefresh} onUpdate={vi.fn()} onRemove={vi.fn()} />);
      
      // 验证 GitErrorPopover 被渲染
      expect(screen.getByTestId('git-error-popover')).toBeInTheDocument();
      
      // 验证错误信息被显示
      expect(screen.getByText('错误: 未配置远端地址')).toBeInTheDocument();
      
      // 验证 causes 被正确解析并传递
      const causesElement = screen.getByTestId('error-causes');
      expect(causesElement.textContent).toBe(JSON.stringify(['仓库没有配置 origin 远端']));
      
      // 验证 solutions 被正确解析并传递
      const solutionsElement = screen.getByTestId('error-solutions');
      expect(solutionsElement.textContent).toBe(JSON.stringify(['检查是否为有效的 Git 仓库', '运行 git remote add origin <url> 添加远端']));
    });

    it('应该在 causes 为 null 时传递 undefined', () => {
      const pluginWithError = {
        ...mockPlugin,
        git_fetch_error: '连接超时',
        git_fetch_error_type: 'timeout',
        git_fetch_error_detail: 'Connection timed out',
        git_fetch_error_causes: null,
        git_fetch_error_solutions: null,
      };
      
      render(<PluginRow plugin={pluginWithError} onRefresh={mockOnRefresh} onUpdate={vi.fn()} onRemove={vi.fn()} />);
      
      // 验证 GitErrorPopover 被渲染
      expect(screen.getByTestId('git-error-popover')).toBeInTheDocument();
      
      // 验证 causes 和 solutions 不被渲染（因为是 undefined）
      expect(screen.queryByTestId('error-causes')).not.toBeInTheDocument();
      expect(screen.queryByTestId('error-solutions')).not.toBeInTheDocument();
    });

    it('应该在 causes 为空字符串时传递 undefined', () => {
      const pluginWithError = {
        ...mockPlugin,
        git_fetch_error: '连接超时',
        git_fetch_error_type: 'timeout',
        git_fetch_error_detail: 'Connection timed out',
        git_fetch_error_causes: '',
        git_fetch_error_solutions: '',
      };
      
      render(<PluginRow plugin={pluginWithError} onRefresh={mockOnRefresh} onUpdate={vi.fn()} onRemove={vi.fn()} />);
      
      // 验证 GitErrorPopover 被渲染
      expect(screen.getByTestId('git-error-popover')).toBeInTheDocument();
      
      // 验证 causes 和 solutions 不被渲染（因为是 undefined）
      expect(screen.queryByTestId('error-causes')).not.toBeInTheDocument();
      expect(screen.queryByTestId('error-solutions')).not.toBeInTheDocument();
    });

    it('应该在 JSON 解析失败时记录错误并传递 undefined', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const pluginWithError = {
        ...mockPlugin,
        git_fetch_error: '未配置远端地址',
        git_fetch_error_type: 'remote',
        git_fetch_error_detail: 'fatal: No such remote \'origin\'',
        git_fetch_error_causes: 'invalid json',  // 无效的 JSON
        git_fetch_error_solutions: 'invalid json',  // 无效的 JSON
      };
      
      render(<PluginRow plugin={pluginWithError} onRefresh={mockOnRefresh} onUpdate={vi.fn()} onRemove={vi.fn()} />);
      
      // 验证 GitErrorPopover 被渲染
      expect(screen.getByTestId('git-error-popover')).toBeInTheDocument();
      
      // 验证错误被记录
      expect(consoleError).toHaveBeenCalledWith(
        '[PluginRow] 解析 git_fetch_error_causes 失败',
        expect.any(Error)
      );
      expect(consoleError).toHaveBeenCalledWith(
        '[PluginRow] 解析 git_fetch_error_solutions 失败',
        expect.any(Error)
      );
      
      // 验证 causes 和 solutions 不被渲染（因为解析失败返回 undefined）
      expect(screen.queryByTestId('error-causes')).not.toBeInTheDocument();
      expect(screen.queryByTestId('error-solutions')).not.toBeInTheDocument();
      
      consoleError.mockRestore();
    });

    it('应该正确处理包含中文的 JSON 字符串', () => {
      const pluginWithError = {
        ...mockPlugin,
        git_fetch_error: '分支不存在',
        git_fetch_error_type: 'branch',
        git_fetch_error_detail: 'fatal: unknown revision or path not in the working tree',
        git_fetch_error_causes: JSON.stringify(['指定的分支不存在', '分支名称拼写错误']),
        git_fetch_error_solutions: JSON.stringify(['运行 git branch -a 查看所有分支', '切换到正确的分支']),
      };
      
      render(<PluginRow plugin={pluginWithError} onRefresh={mockOnRefresh} onUpdate={vi.fn()} onRemove={vi.fn()} />);
      
      // 验证 GitErrorPopover 被渲染
      expect(screen.getByTestId('git-error-popover')).toBeInTheDocument();
      
      // 验证错误信息被显示
      expect(screen.getByText('错误: 分支不存在')).toBeInTheDocument();
      
      // 验证中文内容被正确解析
      const causesElement = screen.getByTestId('error-causes');
      expect(causesElement.textContent).toBe(JSON.stringify(['指定的分支不存在', '分支名称拼写错误']));
      
      const solutionsElement = screen.getByTestId('error-solutions');
      expect(solutionsElement.textContent).toBe(JSON.stringify(['运行 git branch -a 查看所有分支', '切换到正确的分支']));
    });

    it('应该正确处理包含特殊字符的 JSON 字符串', () => {
      const pluginWithError = {
        ...mockPlugin,
        git_fetch_error: '权限被拒绝',
        git_fetch_error_type: 'permission',
        git_fetch_error_detail: 'fatal: detected dubious ownership',
        git_fetch_error_causes: JSON.stringify(['Git 仓库所有权异常', '文件夹权限不足']),
        git_fetch_error_solutions: JSON.stringify([
          '点击右上角的 "Git 权限修复" 按钮',
          '或手动运行命令：git config --global --add safe.directory [插件路径]'
        ]),
      };
      
      render(<PluginRow plugin={pluginWithError} onRefresh={mockOnRefresh} onUpdate={vi.fn()} onRemove={vi.fn()} />);
      
      // 验证 GitErrorPopover 被渲染
      expect(screen.getByTestId('git-error-popover')).toBeInTheDocument();
      
      // 验证错误信息被显示
      expect(screen.getByText('错误: 权限被拒绝')).toBeInTheDocument();
      
      // 验证特殊字符被正确处理
      const causesElement = screen.getByTestId('error-causes');
      const solutionsElement = screen.getByTestId('error-solutions');
      
      expect(causesElement.textContent).toContain('Git 仓库所有权异常');
      expect(solutionsElement.textContent).toContain('Git 权限修复');
    });

    it('应该在有错误时渲染 GitErrorPopover 组件', () => {
      const pluginWithError = {
        ...mockPlugin,
        git_fetch_error: '未配置远端地址',
        git_fetch_error_type: 'remote',
        git_fetch_error_detail: 'fatal: No such remote \'origin\'',
        git_fetch_error_causes: JSON.stringify(['仓库没有配置 origin 远端']),
        git_fetch_error_solutions: JSON.stringify(['检查是否为有效的 Git 仓库']),
      };
      
      render(<PluginRow plugin={pluginWithError} onRefresh={mockOnRefresh} onUpdate={vi.fn()} onRemove={vi.fn()} />);
      
      // 验证 GitErrorPopover 被渲染
      expect(screen.getByTestId('git-error-popover')).toBeInTheDocument();
      expect(screen.getByText('错误: 未配置远端地址')).toBeInTheDocument();
    });

    it('应该在没有错误时不渲染 GitErrorPopover 组件', () => {
      render(<PluginRow plugin={mockPlugin} onRefresh={mockOnRefresh} onUpdate={vi.fn()} onRemove={vi.fn()} />);
      
      // 验证 GitErrorPopover 不被渲染
      expect(screen.queryByTestId('git-error-popover')).not.toBeInTheDocument();
    });
  });
});
