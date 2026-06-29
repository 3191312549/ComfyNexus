/**
 * GitConcurrencySetting 组件属性测试
 * 
 * 使用 fast-check 进行基于属性的测试
 * 验证 Git 并发数范围限制逻辑在各种输入下的正确性
 * 
 * 验证需求: 13.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { GitConcurrencySetting } from '../GitConcurrencySetting';

describe('GitConcurrencySetting 属性测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup(); // 清理 DOM
  });

  /**
   * 属性 14: Git 并发数范围限制
   * 
   * 对于任意输入值，应该被限制在 1-32 范围内
   * 
   * **Validates: Requirements 13.3**
   */
  describe('属性 14: Git 并发数范围限制', () => {
    it('对于任意输入值，应该在失焦后被限制在 1-32 范围内', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: 1000 }), // 生成任意整数
          (inputValue) => {
            const onChange = vi.fn();
            const { unmount } = render(
              <GitConcurrencySetting value={10} onChange={onChange} />
            );

            try {
              const input = screen.getByRole('spinbutton');

              // 输入值
              fireEvent.change(input, { target: { value: inputValue.toString() } });
              
              // 清空 onChange 调用记录
              onChange.mockClear();

              // 失焦触发范围限制
              fireEvent.blur(input);

              // 验证输入框显示的值在范围内（这是核心属性）
              const displayedValue = parseInt((input as HTMLInputElement).value, 10);
              expect(displayedValue).toBeGreaterThanOrEqual(1);
              expect(displayedValue).toBeLessThanOrEqual(32);

              // 如果 onChange 被调用，验证值也在范围内
              if (onChange.mock.calls.length > 0) {
                const actualValue = onChange.mock.calls[0][0];
                expect(actualValue).toBeGreaterThanOrEqual(1);
                expect(actualValue).toBeLessThanOrEqual(32);
              }

              return true;
            } finally {
              unmount();
            }
          }
        ),
        {
          numRuns: 100, // 最少 100 次迭代
          verbose: true, // 显示详细信息
        }
      );
    });

    it('对于小于 1 的任意值，应该被限制为 1', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: 0 }), // 生成小于 1 的整数
          (inputValue) => {
            const onChange = vi.fn();
            const { unmount } = render(
              <GitConcurrencySetting value={10} onChange={onChange} />
            );

            try {
              const input = screen.getByRole('spinbutton');

              // 输入值
              fireEvent.change(input, { target: { value: inputValue.toString() } });
              onChange.mockClear();

              // 失焦触发范围限制
              fireEvent.blur(input);

              // 验证：值应该被限制为 1
              expect(onChange).toHaveBeenCalledWith(1);
              expect((input as HTMLInputElement).value).toBe('1');

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

    it('对于大于 32 的任意值，应该被限制为 32', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 33, max: 1000 }), // 生成大于 32 的整数
          (inputValue) => {
            const onChange = vi.fn();
            const { unmount } = render(
              <GitConcurrencySetting value={10} onChange={onChange} />
            );

            try {
              const input = screen.getByRole('spinbutton');

              // 输入值
              fireEvent.change(input, { target: { value: inputValue.toString() } });
              onChange.mockClear();

              // 失焦触发范围限制
              fireEvent.blur(input);

              // 验证：值应该被限制为 32
              expect(onChange).toHaveBeenCalledWith(32);
              expect((input as HTMLInputElement).value).toBe('32');

              // 验证：应该显示警告
              expect(screen.getByText(/并发数过高可能导致网络拥堵和 Git 服务器限流风险/)).not.toBeNull();

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

    it('对于 1-32 范围内的任意值，应该保持不变', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 32 }), // 生成 1-32 范围内的整数
          (inputValue) => {
            const onChange = vi.fn();
            const { unmount } = render(
              <GitConcurrencySetting value={10} onChange={onChange} />
            );

            try {
              const input = screen.getByRole('spinbutton');

              // 输入值
              fireEvent.change(input, { target: { value: inputValue.toString() } });

              // 验证：如果值与初始值不同，onChange 应该被调用
              if (inputValue !== 10) {
                expect(onChange).toHaveBeenCalledWith(inputValue);
              }

              // 清空调用记录
              onChange.mockClear();

              // 失焦
              fireEvent.blur(input);

              // 验证输入框显示的值在范围内
              const displayedValue = parseInt((input as HTMLInputElement).value, 10);
              expect(displayedValue).toBe(inputValue);

              // 验证：不应该显示错误或警告
              expect(screen.queryByText(/并发数不能小于 1/)).toBeNull();
              expect(screen.queryByText(/并发数过高可能导致网络拥堵/)).toBeNull();

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

    it('对于边界值 1 和 32，应该正确处理', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(1, 32), // 只测试边界值
          (inputValue) => {
            const onChange = vi.fn();
            const { unmount } = render(
              <GitConcurrencySetting value={10} onChange={onChange} />
            );

            try {
              const input = screen.getByRole('spinbutton');

              // 输入值
              fireEvent.change(input, { target: { value: inputValue.toString() } });

              // 验证：onChange 应该被调用，且值正确
              expect(onChange).toHaveBeenCalledWith(inputValue);

              // 验证：不应该显示错误或警告
              expect(screen.queryByText(/并发数不能小于 1/)).toBeNull();
              expect(screen.queryByText(/并发数过高可能导致网络拥堵/)).toBeNull();

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

    it('对于刚好超出边界的值（0 和 33），应该正确处理', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(0, 33), // 刚好超出边界的值
          (inputValue) => {
            const onChange = vi.fn();
            const { unmount } = render(
              <GitConcurrencySetting value={10} onChange={onChange} />
            );

            try {
              const input = screen.getByRole('spinbutton');

              // 输入值
              fireEvent.change(input, { target: { value: inputValue.toString() } });

              if (inputValue === 0) {
                // 验证：应该显示错误
                expect(screen.getByText('并发数不能小于 1')).not.toBeNull();
                // 不应该调用 onChange
                expect(onChange).not.toHaveBeenCalled();
              } else if (inputValue === 33) {
                // 验证：应该显示警告
                expect(screen.getByText(/并发数过高可能导致网络拥堵/)).not.toBeNull();
                // 应该调用 onChange（允许设置，但显示警告）
                expect(onChange).toHaveBeenCalledWith(33);
              }

              // 清空调用记录
              onChange.mockClear();

              // 失焦触发范围限制
              fireEvent.blur(input);

              // 验证：失焦后值应该被限制在范围内
              expect(onChange).toHaveBeenCalled();
              const actualValue = onChange.mock.calls[0][0];
              expect(actualValue).toBeGreaterThanOrEqual(1);
              expect(actualValue).toBeLessThanOrEqual(32);

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

    it('对于极端值（非常大或非常小的数），应该正确限制', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ min: -1000000, max: -1000 }), // 非常小的负数
            fc.integer({ min: 1000, max: 1000000 })    // 非常大的正数
          ),
          (inputValue) => {
            const onChange = vi.fn();
            const { unmount } = render(
              <GitConcurrencySetting value={10} onChange={onChange} />
            );

            try {
              const input = screen.getByRole('spinbutton');

              // 输入值
              fireEvent.change(input, { target: { value: inputValue.toString() } });
              onChange.mockClear();

              // 失焦触发范围限制
              fireEvent.blur(input);

              // 验证：值应该被限制在 1-32 范围内
              expect(onChange).toHaveBeenCalled();
              const actualValue = onChange.mock.calls[0][0];
              expect(actualValue).toBeGreaterThanOrEqual(1);
              expect(actualValue).toBeLessThanOrEqual(32);

              // 验证：极端负数应该被限制为 1
              if (inputValue < 1) {
                expect(actualValue).toBe(1);
              }

              // 验证：极端正数应该被限制为 32
              if (inputValue > 32) {
                expect(actualValue).toBe(32);
                expect(screen.getByText(/并发数过高可能导致网络拥堵/)).not.toBeNull();
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

    it('范围限制应该是幂等的（多次失焦不改变结果）', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -100, max: 100 }),
          (inputValue) => {
            const onChange = vi.fn();
            const { unmount } = render(
              <GitConcurrencySetting value={10} onChange={onChange} />
            );

            try {
              const input = screen.getByRole('spinbutton');

              // 输入值
              fireEvent.change(input, { target: { value: inputValue.toString() } });
              onChange.mockClear();

              // 第一次失焦
              fireEvent.blur(input);
              
              // 获取第一次失焦后的显示值
              const firstDisplayedValue = parseInt((input as HTMLInputElement).value, 10);

              // 验证第一次失焦后的值在范围内
              expect(firstDisplayedValue).toBeGreaterThanOrEqual(1);
              expect(firstDisplayedValue).toBeLessThanOrEqual(32);

              // 清空调用记录
              onChange.mockClear();

              // 第二次失焦（不改变输入）
              fireEvent.blur(input);

              // 获取第二次失焦后的显示值
              const secondDisplayedValue = parseInt((input as HTMLInputElement).value, 10);

              // 验证：两次失焦后的显示值应该相同（幂等性）
              expect(secondDisplayedValue).toBe(firstDisplayedValue);

              // 验证：值始终在范围内
              expect(secondDisplayedValue).toBeGreaterThanOrEqual(1);
              expect(secondDisplayedValue).toBeLessThanOrEqual(32);

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

    it('对于空输入，失焦后应该恢复到默认值 10', () => {
      fc.assert(
        fc.property(
          fc.constant(''), // 空字符串
          (inputValue) => {
            const onChange = vi.fn();
            const { unmount } = render(
              <GitConcurrencySetting value={10} onChange={onChange} />
            );

            try {
              const input = screen.getByRole('spinbutton');

              // 输入空值
              fireEvent.change(input, { target: { value: inputValue } });
              
              // 验证：不应该调用 onChange（允许空值）
              expect(onChange).not.toHaveBeenCalled();

              // 失焦
              fireEvent.blur(input);

              // 验证：应该恢复到默认值 10
              expect(onChange).toHaveBeenCalledWith(10);
              expect((input as HTMLInputElement).value).toBe('10');

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

    it('范围限制应该与警告显示一致', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -100, max: 100 }),
          (inputValue) => {
            const onChange = vi.fn();
            const { unmount } = render(
              <GitConcurrencySetting value={10} onChange={onChange} />
            );

            try {
              const input = screen.getByRole('spinbutton');

              // 输入值
              fireEvent.change(input, { target: { value: inputValue.toString() } });

              // 检查警告显示
              const hasWarning = screen.queryByText(/并发数过高可能导致网络拥堵/) !== null;
              const hasError = screen.queryByText(/并发数不能小于 1/) !== null;

              // 验证：警告和错误的显示应该与输入值一致
              if (inputValue < 1) {
                expect(hasError).toBe(true);
                expect(hasWarning).toBe(false);
              } else if (inputValue > 32) {
                expect(hasWarning).toBe(true);
                expect(hasError).toBe(false);
              } else if (inputValue >= 1 && inputValue <= 32) {
                expect(hasError).toBe(false);
                expect(hasWarning).toBe(false);
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

    it('对于任意初始值，范围限制逻辑应该一致', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 32 }), // 初始值
          fc.integer({ min: -100, max: 100 }), // 输入值
          (initialValue, inputValue) => {
            const onChange = vi.fn();
            const { unmount } = render(
              <GitConcurrencySetting value={initialValue} onChange={onChange} />
            );

            try {
              const input = screen.getByRole('spinbutton');

              // 验证初始值正确显示
              expect((input as HTMLInputElement).value).toBe(initialValue.toString());

              // 输入新值
              fireEvent.change(input, { target: { value: inputValue.toString() } });
              onChange.mockClear();

              // 失焦触发范围限制
              fireEvent.blur(input);

              // 验证：无论初始值是什么，范围限制逻辑应该一致
              if (onChange.mock.calls.length > 0) {
                const actualValue = onChange.mock.calls[0][0];
                expect(actualValue).toBeGreaterThanOrEqual(1);
                expect(actualValue).toBeLessThanOrEqual(32);

                // 验证限制逻辑
                if (inputValue < 1) {
                  expect(actualValue).toBe(1);
                } else if (inputValue > 32) {
                  expect(actualValue).toBe(32);
                } else {
                  expect(actualValue).toBe(inputValue);
                }
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
});
