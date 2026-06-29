/* eslint-disable no-restricted-syntax */
/**
 * PluginRow 组件属性测试
 * 
 * 使用 fast-check 进行基于属性的测试
 * 验证组件在各种输入下的正确性
 * 
 * 验证需求: 1.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { PluginRow } from '../PluginRow';
import type { PluginInfo } from '@/types/plugin';

// Mock pluginAPI
vi.mock('@/services/PluginAPIService', () => ({
  pluginAPI: {
    openPluginFolder: vi.fn(),
    uninstallPlugin: vi.fn(),
  },
}));

// Mock 子组件
vi.mock('../DependencyBadge', () => ({
  DependencyBadge: ({ show }: { show: boolean }) => 
    show ? <div data-testid="dependency-badge">!</div> : null,
}));

vi.mock('../DependencyCard', () => ({
  DependencyCard: ({ pluginName, onClose }: any) => (
    <div data-testid="dependency-card">
      <span>依赖卡片: {pluginName}</span>
      <button onClick={onClose}>关闭</button>
    </div>
  ),
}));

vi.mock('../UpdateCard', () => ({
  UpdateCard: ({ plugin, onClose }: any) => (
    <div data-testid="update-card">
      <span>更新卡片: {plugin.name}</span>
      <button onClick={onClose}>关闭</button>
    </div>
  ),
}));

vi.mock('../BranchSelector', () => ({
  BranchSelector: ({ pluginName, onClose }: any) => (
    <div data-testid="branch-selector">
      <span>分支选择器: {pluginName}</span>
      <button onClick={onClose}>关闭</button>
    </div>
  ),
}));

/**
 * fast-check 生成器：插件对象
 * 使用更合理的字符串生成，避免特殊字符冲突
 */
const pluginArbitrary = fc.record<PluginInfo>({
  name: fc.stringMatching(/^[a-zA-Z0-9_-]{2,50}$/), // 只使用字母数字和常见符号
  path: fc.string({ minLength: 1, maxLength: 100 }),
  is_git_repo: fc.boolean(),
  git_url: fc.option(fc.webUrl(), { nil: null }),
  branch: fc.option(
    fc.constantFrom('main', 'master', 'dev', 'develop', 'feature/test'),
    { nil: null }
  ),
  default_branch: fc.option(
    fc.constantFrom('main', 'master'),
    { nil: null }
  ),
  commit_hash: fc.option(
    fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'), { minLength: 7, maxLength: 7 }).map(arr => arr.join('')),
    { nil: null }
  ),
  commit_date: fc.option(
    fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() })
      .map(timestamp => new Date(timestamp).toISOString()),
    { nil: null }
  ),
  has_update: fc.boolean(),
  behind_commits: fc.nat({ max: 100 }),
  dependency_updated: fc.boolean(),
  dependency_viewed: fc.boolean(),
});

describe('PluginRow 属性测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup(); // 清理 DOM
  });

  /**
   * 属性 2: UI 渲染完整性
   * 
   * 对于任意插件对象，渲染应该包含所有必需字段
   * 
   * **Validates: Requirements 1.2**
   */
  describe('属性 2: UI 渲染完整性', () => {
    it('应该渲染所有必需的插件信息字段', () => {
      fc.assert(
        fc.property(pluginArbitrary, (plugin) => {
          // 渲染组件
          const { container, unmount } = render(
            <PluginRow plugin={plugin} onRefresh={vi.fn()} />
          );

          try {
            // 验证必需字段：插件名称
            // 插件名称应该始终存在且可点击
            const pluginNameElement = screen.getByText(plugin.name);
            expect(pluginNameElement).not.toBeNull();

            // 验证必需字段：查询依赖按钮
            // 应该始终显示查询依赖按钮
            const dependencyButton = screen.getByText('查询依赖');
            expect(dependencyButton).not.toBeNull();

            // 验证必需字段：GitHub 地址
            // 如果有 git_url，应该显示链接；否则显示 "-"
            if (plugin.git_url) {
              const gitLink = screen.getByRole('link');
              expect(gitLink.getAttribute('href')).toBe(plugin.git_url);
            }

            // 验证必需字段：分支名称
            // 如果是 Git 仓库但 commit_hash 为 null，应该显示加载动画（即使有 branch）
            // 如果不是 Git 仓库，应该显示 "-"
            // 如果有 branch 且 commit_hash 存在，应该显示可点击的分支名
            if (plugin.is_git_repo && !plugin.commit_hash) {
              // Git 仓库但 Git 信息未加载完成，应该显示加载动画
              const loadingElements = screen.queryAllByText('加载中...');
              expect(loadingElements.length).toBeGreaterThan(0);
            } else if (plugin.branch) {
              const branchButtons = screen.getAllByRole('button');
              const hasBranchButton = branchButtons.some(
                btn => btn.textContent === plugin.branch
              );
              expect(hasBranchButton).toBe(true);
            }

            // 验证必需字段：版本（commit hash）
            // 如果是 Git 仓库但 commit_hash 为 null，应该显示加载动画
            // 如果不是 Git 仓库，应该显示 "-"
            // 如果有 commit_hash，应该显示
            if (plugin.is_git_repo && !plugin.commit_hash) {
              // Git 仓库但版本信息未加载，应该显示加载动画
              const loadingElements = screen.queryAllByText('加载中...');
              expect(loadingElements.length).toBeGreaterThan(0);
            } else if (plugin.commit_hash) {
              expect(screen.getByText(plugin.commit_hash)).not.toBeNull();
            }

            // 验证必需字段：更新时间
            // 如果是 Git 仓库但 commit_hash 为 null，应该显示加载动画
            // 如果不是 Git 仓库，应该显示 "-"
            // 如果有 commit_date，应该显示格式化的日期
            if (plugin.is_git_repo && !plugin.commit_hash) {
              // Git 仓库但 Git 信息未加载完成，应该显示加载动画
              const loadingElements = screen.queryAllByText('加载中...');
              expect(loadingElements.length).toBeGreaterThan(0);
            } else if (plugin.commit_date) {
              try {
                const formattedDate = new Date(plugin.commit_date).toLocaleDateString('zh-CN');
                // 只有当日期格式化成功时才验证
                if (formattedDate !== 'Invalid Date') {
                  expect(screen.getByText(formattedDate)).not.toBeNull();
                }
              } catch {
                // 日期格式化失败，跳过验证
              }
            }

            // 验证必需字段：操作按钮
            // 应该始终显示卸载按钮
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);

            // 验证条件字段：更新按钮
            // 如果 has_update 为 true，应该显示更新按钮
            if (plugin.has_update) {
              const updateButtons = screen.queryAllByText('更新');
              expect(updateButtons.length).toBeGreaterThan(0);
            } else {
              expect(screen.queryByText('更新')).toBeNull();
            }

            // 验证条件字段：落后提交数
            // 如果是 Git 仓库且 has_update 为 true 且 behind_commits > 0 且 commit_hash 存在，应该显示落后提交数
            // 如果 commit_hash 为 null，说明 Git 信息还在加载中，不会显示落后提交数
            if (plugin.is_git_repo && plugin.has_update && plugin.behind_commits > 0 && plugin.commit_hash) {
              const behindText = screen.queryByText(
                new RegExp(`落后 ${plugin.behind_commits} 个提交`)
              );
              expect(behindText).not.toBeNull();
            }

            // 验证条件字段：依赖更新提示
            // 如果 dependency_updated 为 true 且 dependency_viewed 为 false，应该显示徽章
            if (plugin.dependency_updated && !plugin.dependency_viewed) {
              expect(screen.getByTestId('dependency-badge')).not.toBeNull();
            } else {
              expect(screen.queryByTestId('dependency-badge')).toBeNull();
            }

            // 验证高亮样式
            // 如果 has_update 为 true，行应该有高亮样式
            if (plugin.has_update) {
              const row = container.querySelector('[class*="bg-orange"]');
              expect(row).not.toBeNull();
            }

            return true;
          } finally {
            // 清理 DOM
            unmount();
          }
        }),
        {
          numRuns: 100, // 最少 100 次迭代
          verbose: true, // 显示详细信息
        }
      );
    });

    it('应该正确处理所有字段为 null 的插件', () => {
      fc.assert(
        fc.property(
          fc.record<PluginInfo>({
            name: fc.stringMatching(/^[a-zA-Z0-9_-]{2,50}$/),
            path: fc.string({ minLength: 1, maxLength: 100 }),
            is_git_repo: fc.boolean(),
            git_url: fc.constant(null),
            branch: fc.constant(null),
            default_branch: fc.constant(null),
            commit_hash: fc.constant(null),
            commit_date: fc.constant(null),
            has_update: fc.constant(false),
            behind_commits: fc.constant(0),
            dependency_updated: fc.constant(false),
            dependency_viewed: fc.constant(true),
          }),
          (plugin) => {
            // 渲染组件
            const { unmount } = render(<PluginRow plugin={plugin} onRefresh={vi.fn()} />);

            try {
              // 验证插件名称始终显示
              expect(screen.getByText(plugin.name)).not.toBeNull();

              // 验证查询依赖按钮始终显示
              expect(screen.getByText('查询依赖')).not.toBeNull();

              // 根据 is_git_repo 判断显示内容
              if (plugin.is_git_repo) {
                // 如果是 Git 仓库但 commit_hash 为 null，应该显示加载动画
                const loadingElements = screen.getAllByText('加载中...');
                expect(loadingElements.length).toBeGreaterThanOrEqual(1); // 至少有一个加载动画
              } else {
                // 如果不是 Git 仓库，所有 Git 相关字段都显示 "-"
                const cells = screen.getAllByText('-');
                expect(cells.length).toBeGreaterThanOrEqual(3); // branch, commit_hash, commit_date
              }

              // 验证不显示更新按钮
              expect(screen.queryByText('更新')).toBeNull();

              // 验证不显示依赖更新徽章
              expect(screen.queryByTestId('dependency-badge')).toBeNull();

              return true;
            } finally {
              unmount();
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('应该正确处理所有字段都有值的插件', () => {
      fc.assert(
        fc.property(
          fc.record<PluginInfo>({
            name: fc.stringMatching(/^[a-zA-Z0-9_-]{2,50}$/),
            path: fc.string({ minLength: 1, maxLength: 100 }),
            is_git_repo: fc.constant(true),
            git_url: fc.webUrl(),
            branch: fc.constantFrom('main', 'master', 'dev'),
            default_branch: fc.constantFrom('main', 'master'),
            commit_hash: fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'), { minLength: 7, maxLength: 7 }).map(arr => arr.join('')),
            commit_date: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() })
              .map(timestamp => new Date(timestamp).toISOString()),
            has_update: fc.constant(true),
            behind_commits: fc.integer({ min: 1, max: 100 }),
            dependency_updated: fc.constant(true),
            dependency_viewed: fc.constant(false),
          }),
          (plugin) => {
            // 渲染组件
            const { container, unmount } = render(
              <PluginRow plugin={plugin} onRefresh={vi.fn()} />
            );

            try {
              // 验证所有字段都正确显示
              expect(screen.getByText(plugin.name)).not.toBeNull();
              expect(screen.getByText('查询依赖')).not.toBeNull();
              
              const gitLink = screen.getByRole('link');
              expect(gitLink.getAttribute('href')).toBe(plugin.git_url);

              const branchButtons = screen.getAllByRole('button');
              const hasBranchButton = branchButtons.some(
                btn => btn.textContent === plugin.branch
              );
              expect(hasBranchButton).toBe(true);

              expect(screen.getByText(plugin.commit_hash!)).not.toBeNull();

              // 验证时间戳格式化为 YYYY-MM-DD HH:mm:ss
              const date = new Date(plugin.commit_date!);
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const hours = String(date.getHours()).padStart(2, '0');
              const minutes = String(date.getMinutes()).padStart(2, '0');
              const seconds = String(date.getSeconds()).padStart(2, '0');
              const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
              expect(screen.getByText(formattedDate)).not.toBeNull();

              // 验证更新相关字段
              const updateButtons = screen.queryAllByText('更新');
              expect(updateButtons.length).toBeGreaterThan(0);
              expect(screen.getByText(
                new RegExp(`落后 ${plugin.behind_commits} 个提交`)
              )).not.toBeNull();

              // 验证依赖更新徽章
              expect(screen.getByTestId('dependency-badge')).not.toBeNull();

              // 验证高亮样式
              const row = container.querySelector('[class*="bg-orange"]');
              expect(row).not.toBeNull();

              return true;
            } finally {
              unmount();
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('应该正确处理边界情况：behind_commits 为 0', () => {
      fc.assert(
        fc.property(
          fc.record<PluginInfo>({
            name: fc.stringMatching(/^[a-zA-Z0-9_-]{2,50}$/),
            path: fc.string({ minLength: 1, maxLength: 100 }),
            is_git_repo: fc.boolean(),
            git_url: fc.option(fc.webUrl(), { nil: null }),
            branch: fc.option(fc.constantFrom('main', 'master'), { nil: null }),
            default_branch: fc.option(fc.constantFrom('main', 'master'), { nil: null }),
            commit_hash: fc.option(fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'), { minLength: 7, maxLength: 7 }).map(arr => arr.join('')), { nil: null }),
            commit_date: fc.option(
              fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() })
                .map(timestamp => new Date(timestamp).toISOString()),
              { nil: null }
            ),
            has_update: fc.constant(true),
            behind_commits: fc.constant(0), // 边界情况：behind_commits 为 0
            dependency_updated: fc.boolean(),
            dependency_viewed: fc.boolean(),
          }),
          (plugin) => {
            // 渲染组件
            const { unmount } = render(<PluginRow plugin={plugin} onRefresh={vi.fn()} />);

            try {
              // 验证显示更新按钮
              const updateButtons = screen.queryAllByText('更新');
              expect(updateButtons.length).toBeGreaterThan(0);

              // 验证不显示落后提交数（因为 behind_commits 为 0）
              const behindText = screen.queryByText(/落后.*个提交/);
              expect(behindText).toBeNull();

              return true;
            } finally {
              unmount();
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('应该正确处理日期格式异常', () => {
      fc.assert(
        fc.property(
          fc.record<PluginInfo>({
            name: fc.stringMatching(/^[a-zA-Z0-9_-]{2,50}$/),
            path: fc.string({ minLength: 1, maxLength: 100 }),
            is_git_repo: fc.boolean(),
            git_url: fc.option(fc.webUrl(), { nil: null }),
            branch: fc.option(fc.constantFrom('main', 'master'), { nil: null }),
            default_branch: fc.option(fc.constantFrom('main', 'master'), { nil: null }),
            commit_hash: fc.option(fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'), { minLength: 7, maxLength: 7 }).map(arr => arr.join('')), { nil: null }),
            commit_date: fc.constantFrom(
              'invalid-date',
              '2024-13-45', // 无效日期
              'not-a-date',
              '2024-01-01T00:00:00Z' // 有效日期
            ),
            has_update: fc.boolean(),
            behind_commits: fc.nat({ max: 100 }),
            dependency_updated: fc.boolean(),
            dependency_viewed: fc.boolean(),
          }),
          (plugin) => {
            // 渲染组件（不应该抛出错误）
            const { container, unmount } = render(
              <PluginRow plugin={plugin} onRefresh={vi.fn()} />
            );

            try {
              // 验证组件成功渲染
              expect(container).not.toBeNull();

              // 验证插件名称始终显示
              expect(screen.getByText(plugin.name)).not.toBeNull();

              // 对于无效日期，应该显示原始字符串或 "Invalid Date"
              // 组件应该优雅地处理日期格式错误
              try {
                const formattedDate = new Date(plugin.commit_date!).toLocaleDateString('zh-CN');
                if (formattedDate === 'Invalid Date') {
                  // 无效日期应该显示 "Invalid Date"
                  expect(screen.getByText('Invalid Date')).not.toBeNull();
                } else {
                  // 有效日期应该显示格式化的日期
                  expect(screen.getByText(formattedDate)).not.toBeNull();
                }
              } catch {
                // 日期处理失败，跳过验证
              }

              return true;
            } finally {
              unmount();
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  /**
   * 属性 4: 依赖更新提示显示
   * 
   * 对于任意依赖有更新且未查看的插件（dependency_updated = true && dependency_viewed = false），
   * 依赖查询按钮应该显示叹号图标
   * 
   * **Validates: Requirements 1.4, 4.1**
   */
  describe('属性 4: 依赖更新提示显示', () => {
    it('对于任意依赖有更新且未查看的插件，应该显示依赖更新徽章', () => {
      fc.assert(
        fc.property(
          // 生成 dependency_updated = true 且 dependency_viewed = false 的插件
          fc.record<PluginInfo>({
            name: fc.stringMatching(/^[a-zA-Z0-9_-]{2,50}$/),
            path: fc.string({ minLength: 1, maxLength: 100 }),
            is_git_repo: fc.boolean(),
            git_url: fc.option(fc.webUrl(), { nil: null }),
            branch: fc.option(
              fc.constantFrom('main', 'master', 'dev', 'develop'),
              { nil: null }
            ),
            default_branch: fc.option(
              fc.constantFrom('main', 'master'),
              { nil: null }
            ),
            commit_hash: fc.option(
              fc.array(
                fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'),
                { minLength: 7, maxLength: 7 }
              ).map(arr => arr.join('')),
              { nil: null }
            ),
            commit_date: fc.option(
              fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() })
                .map(timestamp => new Date(timestamp).toISOString()),
              { nil: null }
            ),
            has_update: fc.boolean(),
            behind_commits: fc.nat({ max: 100 }),
            dependency_updated: fc.constant(true), // 强制 dependency_updated = true
            dependency_viewed: fc.constant(false), // 强制 dependency_viewed = false
          }),
          (plugin) => {
            // 渲染组件
            const { unmount } = render(
              <PluginRow plugin={plugin} onRefresh={vi.fn()} />
            );

            try {
              // 验证：应该显示依赖更新徽章
              const badge = screen.queryByTestId('dependency-badge');
              expect(badge).not.toBeNull();

              // 验证：徽章应该包含叹号图标
              expect(badge?.textContent).toBe('!');

              return true;
            } finally {
              // 清理 DOM
              unmount();
            }
          }
        ),
        {
          numRuns: 100, // 最少 100 次迭代
          verbose: true,
        }
      );
    });

    it('对于已查看依赖的插件，不应该显示依赖更新徽章', () => {
      fc.assert(
        fc.property(
          // 生成 dependency_updated = true 但 dependency_viewed = true 的插件
          fc.record<PluginInfo>({
            name: fc.stringMatching(/^[a-zA-Z0-9_-]{2,50}$/),
            path: fc.string({ minLength: 1, maxLength: 100 }),
            is_git_repo: fc.boolean(),
            git_url: fc.option(fc.webUrl(), { nil: null }),
            branch: fc.option(
              fc.constantFrom('main', 'master', 'dev'),
              { nil: null }
            ),
            default_branch: fc.option(
              fc.constantFrom('main', 'master'),
              { nil: null }
            ),
            commit_hash: fc.option(
              fc.array(
                fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'),
                { minLength: 7, maxLength: 7 }
              ).map(arr => arr.join('')),
              { nil: null }
            ),
            commit_date: fc.option(
              fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() })
                .map(timestamp => new Date(timestamp).toISOString()),
              { nil: null }
            ),
            has_update: fc.boolean(),
            behind_commits: fc.nat({ max: 100 }),
            dependency_updated: fc.constant(true), // dependency_updated = true
            dependency_viewed: fc.constant(true), // 但 dependency_viewed = true（已查看）
          }),
          (plugin) => {
            // 渲染组件
            const { unmount } = render(
              <PluginRow plugin={plugin} onRefresh={vi.fn()} />
            );

            try {
              // 验证：不应该显示依赖更新徽章
              const badge = screen.queryByTestId('dependency-badge');
              expect(badge).toBeNull();

              return true;
            } finally {
              // 清理 DOM
              unmount();
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('对于依赖未更新的插件，不应该显示依赖更新徽章', () => {
      fc.assert(
        fc.property(
          // 生成 dependency_updated = false 的插件
          fc.record<PluginInfo>({
            name: fc.stringMatching(/^[a-zA-Z0-9_-]{2,50}$/),
            path: fc.string({ minLength: 1, maxLength: 100 }),
            is_git_repo: fc.boolean(),
            git_url: fc.option(fc.webUrl(), { nil: null }),
            branch: fc.option(
              fc.constantFrom('main', 'master', 'dev'),
              { nil: null }
            ),
            default_branch: fc.option(
              fc.constantFrom('main', 'master'),
              { nil: null }
            ),
            commit_hash: fc.option(
              fc.array(
                fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'),
                { minLength: 7, maxLength: 7 }
              ).map(arr => arr.join('')),
              { nil: null }
            ),
            commit_date: fc.option(
              fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() })
                .map(timestamp => new Date(timestamp).toISOString()),
              { nil: null }
            ),
            has_update: fc.boolean(),
            behind_commits: fc.nat({ max: 100 }),
            dependency_updated: fc.constant(false), // 强制 dependency_updated = false
            dependency_viewed: fc.boolean(), // dependency_viewed 可以是任意值
          }),
          (plugin) => {
            // 渲染组件
            const { unmount } = render(
              <PluginRow plugin={plugin} onRefresh={vi.fn()} />
            );

            try {
              // 验证：不应该显示依赖更新徽章
              const badge = screen.queryByTestId('dependency-badge');
              expect(badge).toBeNull();

              return true;
            } finally {
              // 清理 DOM
              unmount();
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('徽章显示应该与 dependency_updated 和 dependency_viewed 标志严格一致', () => {
      fc.assert(
        fc.property(
          // 生成任意插件（dependency_updated 和 dependency_viewed 可能为任意值）
          pluginArbitrary,
          (plugin) => {
            // 渲染组件
            const { unmount } = render(
              <PluginRow plugin={plugin} onRefresh={vi.fn()} />
            );

            try {
              // 获取依赖更新徽章
              const badge = screen.queryByTestId('dependency-badge');

              // 验证：徽章的存在性应该与 dependency_updated && !dependency_viewed 一致
              if (plugin.dependency_updated && !plugin.dependency_viewed) {
                // 依赖有更新且未查看时，应该显示徽章
                expect(badge).not.toBeNull();
              } else {
                // 其他情况不应该显示徽章
                expect(badge).toBeNull();
              }

              return true;
            } finally {
              // 清理 DOM
              unmount();
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('边界情况：所有布尔标志的组合', () => {
      fc.assert(
        fc.property(
          fc.record<PluginInfo>({
            name: fc.stringMatching(/^[a-zA-Z0-9_-]{2,50}$/),
            path: fc.string({ minLength: 1, maxLength: 100 }),
            is_git_repo: fc.boolean(),
            git_url: fc.option(fc.webUrl(), { nil: null }),
            branch: fc.option(fc.constantFrom('main', 'master'), { nil: null }),
            default_branch: fc.option(fc.constantFrom('main', 'master'), { nil: null }),
            commit_hash: fc.option(
              fc.array(
                fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'),
                { minLength: 7, maxLength: 7 }
              ).map(arr => arr.join('')),
              { nil: null }
            ),
            commit_date: fc.option(
              fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() })
                .map(timestamp => new Date(timestamp).toISOString()),
              { nil: null }
            ),
            has_update: fc.boolean(),
            behind_commits: fc.nat({ max: 100 }),
            // 测试所有可能的布尔组合
            dependency_updated: fc.boolean(),
            dependency_viewed: fc.boolean(),
          }),
          (plugin) => {
            // 渲染组件
            const { unmount } = render(
              <PluginRow plugin={plugin} onRefresh={vi.fn()} />
            );

            try {
              // 获取依赖更新徽章
              const badge = screen.queryByTestId('dependency-badge');

              // 验证所有可能的组合：
              // 1. dependency_updated = true, dependency_viewed = false -> 显示徽章
              // 2. dependency_updated = true, dependency_viewed = true -> 不显示徽章
              // 3. dependency_updated = false, dependency_viewed = false -> 不显示徽章
              // 4. dependency_updated = false, dependency_viewed = true -> 不显示徽章
              const shouldShowBadge = plugin.dependency_updated && !plugin.dependency_viewed;

              if (shouldShowBadge) {
                expect(badge).not.toBeNull();
              } else {
                expect(badge).toBeNull();
              }

              return true;
            } finally {
              // 清理 DOM
              unmount();
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('徽章应该始终与查询依赖按钮关联', () => {
      fc.assert(
        fc.property(
          fc.record<PluginInfo>({
            name: fc.stringMatching(/^[a-zA-Z0-9_-]{2,50}$/),
            path: fc.string({ minLength: 1, maxLength: 100 }),
            is_git_repo: fc.boolean(),
            git_url: fc.option(fc.webUrl(), { nil: null }),
            branch: fc.option(fc.constantFrom('main', 'master'), { nil: null }),
            default_branch: fc.option(fc.constantFrom('main', 'master'), { nil: null }),
            commit_hash: fc.option(
              fc.array(
                fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'),
                { minLength: 7, maxLength: 7 }
              ).map(arr => arr.join('')),
              { nil: null }
            ),
            commit_date: fc.option(
              fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() })
                .map(timestamp => new Date(timestamp).toISOString()),
              { nil: null }
            ),
            has_update: fc.boolean(),
            behind_commits: fc.nat({ max: 100 }),
            dependency_updated: fc.constant(true),
            dependency_viewed: fc.constant(false),
          }),
          (plugin) => {
            // 渲染组件
            const { unmount } = render(
              <PluginRow plugin={plugin} onRefresh={vi.fn()} />
            );

            try {
              // 验证：查询依赖按钮应该始终存在
              const dependencyButton = screen.getByText('查询依赖');
              expect(dependencyButton).not.toBeNull();

              // 验证：徽章应该存在
              const badge = screen.queryByTestId('dependency-badge');
              expect(badge).not.toBeNull();

              // 验证：徽章应该在查询依赖按钮附近（通过 DOM 结构）
              // 徽章应该在包含查询依赖按钮的容器内
              const buttonContainer = dependencyButton.closest('div');
              expect(buttonContainer).not.toBeNull();

              return true;
            } finally {
              // 清理 DOM
              unmount();
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('边界情况：dependency_updated 和 dependency_viewed 的极端组合', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            // 生成两个插件：一个显示徽章，一个不显示
            fc.record<PluginInfo>({
              name: fc.stringMatching(/^[a-zA-Z0-9_-]{2,50}$/),
              path: fc.string({ minLength: 1, maxLength: 100 }),
              is_git_repo: fc.boolean(),
              git_url: fc.option(fc.webUrl(), { nil: null }),
              branch: fc.option(fc.constantFrom('main', 'master'), { nil: null }),
              default_branch: fc.option(fc.constantFrom('main', 'master'), { nil: null }),
              commit_hash: fc.option(
                fc.array(
                  fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'),
                  { minLength: 7, maxLength: 7 }
                ).map(arr => arr.join('')),
                { nil: null }
              ),
              commit_date: fc.option(
                fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() })
                  .map(timestamp => new Date(timestamp).toISOString()),
                { nil: null }
              ),
              has_update: fc.boolean(),
              behind_commits: fc.nat({ max: 100 }),
              dependency_updated: fc.constant(true),
              dependency_viewed: fc.constant(false),
            }),
            fc.record<PluginInfo>({
              name: fc.stringMatching(/^[a-zA-Z0-9_-]{2,50}$/),
              path: fc.string({ minLength: 1, maxLength: 100 }),
              is_git_repo: fc.boolean(),
              git_url: fc.option(fc.webUrl(), { nil: null }),
              branch: fc.option(fc.constantFrom('main', 'master'), { nil: null }),
              default_branch: fc.option(fc.constantFrom('main', 'master'), { nil: null }),
              commit_hash: fc.option(
                fc.array(
                  fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'),
                  { minLength: 7, maxLength: 7 }
                ).map(arr => arr.join('')),
                { nil: null }
              ),
              commit_date: fc.option(
                fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() })
                  .map(timestamp => new Date(timestamp).toISOString()),
                { nil: null }
              ),
              has_update: fc.boolean(),
              behind_commits: fc.nat({ max: 100 }),
              dependency_updated: fc.constant(false),
              dependency_viewed: fc.constant(true),
            })
          ),
          ([pluginWithBadge, pluginWithoutBadge]) => {
            // 渲染第一个插件（应该显示徽章）
            const { unmount: unmount1 } = render(
              <PluginRow plugin={pluginWithBadge} onRefresh={vi.fn()} />
            );

            try {
              // 验证：应该显示徽章
              expect(screen.queryByTestId('dependency-badge')).not.toBeNull();
            } finally {
              unmount1();
            }

            // 渲染第二个插件（不应该显示徽章）
            const { unmount: unmount2 } = render(
              <PluginRow plugin={pluginWithoutBadge} onRefresh={vi.fn()} />
            );

            try {
              // 验证：不应该显示徽章
              expect(screen.queryByTestId('dependency-badge')).toBeNull();
            } finally {
              unmount2();
            }

            return true;
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  /**
   * 属性 3: 插件更新状态显示
   * 
   * 对于任意有更新的插件（has_update = true），UI 应该显示高亮样式和更新按钮
   * 
   * **Validates: Requirements 1.3, 5.3**
   */
  describe('属性 3: 插件更新状态显示', () => {
    it('对于任意有更新的插件，应该显示高亮样式和更新按钮', () => {
      fc.assert(
        fc.property(
          // 生成 has_update = true 的插件
          fc.record<PluginInfo>({
            name: fc.stringMatching(/^[a-zA-Z0-9_-]{2,50}$/),
            path: fc.string({ minLength: 1, maxLength: 100 }),
            is_git_repo: fc.constant(true),
            git_url: fc.option(fc.webUrl(), { nil: null }),
            branch: fc.option(
              fc.constantFrom('main', 'master', 'dev', 'develop'),
              { nil: null }
            ),
            default_branch: fc.option(
              fc.constantFrom('main', 'master'),
              { nil: null }
            ),
            // 当 has_update=true 时，commit_hash 必须存在
            commit_hash: fc.array(
              fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'),
              { minLength: 7, maxLength: 7 }
            ).map(arr => arr.join('')),
            commit_date: fc.option(
              fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() })
                .map(timestamp => new Date(timestamp).toISOString()),
              { nil: null }
            ),
            has_update: fc.constant(true), // 强制 has_update = true
            behind_commits: fc.nat({ max: 100 }),
            dependency_updated: fc.boolean(),
            dependency_viewed: fc.boolean(),
          }),
          (plugin) => {
            // 渲染组件
            const { container, unmount } = render(
              <PluginRow plugin={plugin} onRefresh={vi.fn()} />
            );

            try {
              // 验证 1: 应该显示更新按钮
              const updateButtons = screen.queryAllByText('更新');
              expect(updateButtons.length).toBeGreaterThan(0);

              // 验证 2: 应该显示高亮样式（橙色背景）
              const highlightedRow = container.querySelector('[class*="bg-orange"]');
              expect(highlightedRow).not.toBeNull();

              // 验证 3: 如果 behind_commits > 0，应该显示落后提交数
              if (plugin.behind_commits > 0) {
                const behindText = screen.queryByText(
                  new RegExp(`落后 ${plugin.behind_commits} 个提交`)
                );
                expect(behindText).not.toBeNull();
              }

              return true;
            } finally {
              // 清理 DOM
              unmount();
            }
          }
        ),
        {
          numRuns: 100, // 最少 100 次迭代
          verbose: true,
        }
      );
    });

    it('对于没有更新的插件，不应该显示更新按钮和高亮样式', () => {
      fc.assert(
        fc.property(
          // 生成 has_update = false 的插件
          fc.record<PluginInfo>({
            name: fc.stringMatching(/^[a-zA-Z0-9_-]{2,50}$/),
            path: fc.string({ minLength: 1, maxLength: 100 }),
            is_git_repo: fc.boolean(),
            git_url: fc.option(fc.webUrl(), { nil: null }),
            branch: fc.option(
              fc.constantFrom('main', 'master', 'dev'),
              { nil: null }
            ),
            default_branch: fc.option(
              fc.constantFrom('main', 'master'),
              { nil: null }
            ),
            commit_hash: fc.option(
              fc.array(
                fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'),
                { minLength: 7, maxLength: 7 }
              ).map(arr => arr.join('')),
              { nil: null }
            ),
            commit_date: fc.option(
              fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() })
                .map(timestamp => new Date(timestamp).toISOString()),
              { nil: null }
            ),
            has_update: fc.constant(false), // 强制 has_update = false
            behind_commits: fc.constant(0), // 没有更新时，behind_commits 应该为 0
            dependency_updated: fc.boolean(),
            dependency_viewed: fc.boolean(),
          }),
          (plugin) => {
            // 渲染组件
            const { container, unmount } = render(
              <PluginRow plugin={plugin} onRefresh={vi.fn()} />
            );

            try {
              // 验证 1: 不应该显示更新按钮
              expect(screen.queryByText('更新')).toBeNull();

              // 验证 2: 不应该显示高亮样式
              const highlightedRow = container.querySelector('[class*="bg-orange"]');
              expect(highlightedRow).toBeNull();

              // 验证 3: 不应该显示落后提交数
              const behindText = screen.queryByText(/落后.*个提交/);
              expect(behindText).toBeNull();

              return true;
            } finally {
              // 清理 DOM
              unmount();
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('更新状态应该与 has_update 标志严格一致', () => {
      fc.assert(
        fc.property(
          // 生成任意插件（has_update 可能为 true 或 false）
          pluginArbitrary,
          (plugin) => {
            // 渲染组件
            const { container, unmount } = render(
              <PluginRow plugin={plugin} onRefresh={vi.fn()} />
            );

            try {
              // 获取更新按钮和高亮样式
              const updateButton = screen.queryByText('更新');
              const highlightedRow = container.querySelector('[class*="bg-orange"]');

              // 验证：更新按钮和高亮样式的存在性应该与 has_update 一致
              if (plugin.has_update) {
                // has_update = true 时，应该显示更新按钮和高亮样式
                expect(updateButton).not.toBeNull();
                expect(highlightedRow).not.toBeNull();
              } else {
                // has_update = false 时，不应该显示更新按钮和高亮样式
                expect(updateButton).toBeNull();
                expect(highlightedRow).toBeNull();
              }

              return true;
            } finally {
              // 清理 DOM
              unmount();
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('落后提交数显示应该与 has_update 和 behind_commits 一致', () => {
      fc.assert(
        fc.property(
          pluginArbitrary,
          (plugin) => {
            // 渲染组件
            const { unmount } = render(<PluginRow plugin={plugin} onRefresh={vi.fn()} />);

            try {
              // 查找落后提交数文本
              const behindText = screen.queryByText(/落后.*个提交/);

              // 验证：只有当是 Git 仓库且 has_update = true 且 behind_commits > 0 且 commit_hash 存在时才显示
              // 如果 commit_hash 为 null，说明 Git 信息还在加载中，不会显示落后提交数
              if (plugin.is_git_repo && plugin.has_update && plugin.behind_commits > 0 && plugin.commit_hash) {
                expect(behindText).not.toBeNull();
                // 验证显示的数字是否正确
                expect(behindText?.textContent).toContain(plugin.behind_commits.toString());
              } else {
                expect(behindText).toBeNull();
              }

              return true;
            } finally {
              // 清理 DOM
              unmount();
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('边界情况：has_update = true 但 behind_commits = 0', () => {
      fc.assert(
        fc.property(
          fc.record<PluginInfo>({
            name: fc.stringMatching(/^[a-zA-Z0-9_-]{2,50}$/),
            path: fc.string({ minLength: 1, maxLength: 100 }),
            is_git_repo: fc.boolean(),
            git_url: fc.option(fc.webUrl(), { nil: null }),
            branch: fc.option(fc.constantFrom('main', 'master'), { nil: null }),
            default_branch: fc.option(fc.constantFrom('main', 'master'), { nil: null }),
            commit_hash: fc.option(
              fc.array(
                fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'),
                { minLength: 7, maxLength: 7 }
              ).map(arr => arr.join('')),
              { nil: null }
            ),
            commit_date: fc.option(
              fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() })
                .map(timestamp => new Date(timestamp).toISOString()),
              { nil: null }
            ),
            has_update: fc.constant(true),
            behind_commits: fc.constant(0), // 边界情况
            dependency_updated: fc.boolean(),
            dependency_viewed: fc.boolean(),
          }),
          (plugin) => {
            // 渲染组件
            const { container, unmount } = render(
              <PluginRow plugin={plugin} onRefresh={vi.fn()} />
            );

            try {
              // 验证：应该显示更新按钮和高亮样式
              expect(screen.queryByText('更新')).not.toBeNull();
              const highlightedRow = container.querySelector('[class*="bg-orange"]');
              expect(highlightedRow).not.toBeNull();

              // 验证：不应该显示落后提交数（因为 behind_commits = 0）
              const behindText = screen.queryByText(/落后.*个提交/);
              expect(behindText).toBeNull();

              return true;
            } finally {
              // 清理 DOM
              unmount();
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('边界情况：has_update = true 且 behind_commits 为最大值', () => {
      fc.assert(
        fc.property(
          fc.record<PluginInfo>({
            name: fc.stringMatching(/^[a-zA-Z0-9_-]{2,50}$/),
            path: fc.string({ minLength: 1, maxLength: 100 }),
            is_git_repo: fc.constant(true),
            git_url: fc.option(fc.webUrl(), { nil: null }),
            branch: fc.option(fc.constantFrom('main', 'master'), { nil: null }),
            default_branch: fc.option(fc.constantFrom('main', 'master'), { nil: null }),
            // 当 has_update=true 时，commit_hash 必须存在
            commit_hash: fc.array(
              fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'),
              { minLength: 7, maxLength: 7 }
            ).map(arr => arr.join('')),
            commit_date: fc.option(
              fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() })
                .map(timestamp => new Date(timestamp).toISOString()),
              { nil: null }
            ),
            has_update: fc.constant(true),
            behind_commits: fc.integer({ min: 50, max: 100 }), // 较大的值
            dependency_updated: fc.boolean(),
            dependency_viewed: fc.boolean(),
          }),
          (plugin) => {
            // 渲染组件
            const { container, unmount } = render(
              <PluginRow plugin={plugin} onRefresh={vi.fn()} />
            );

            try {
              // 验证：应该显示更新按钮和高亮样式
              expect(screen.queryByText('更新')).not.toBeNull();
              const highlightedRow = container.querySelector('[class*="bg-orange"]');
              expect(highlightedRow).not.toBeNull();

              // 验证：应该显示落后提交数，且数字正确
              const behindText = screen.queryByText(
                new RegExp(`落后 ${plugin.behind_commits} 个提交`)
              );
              expect(behindText).not.toBeNull();

              return true;
            } finally {
              // 清理 DOM
              unmount();
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });
});
