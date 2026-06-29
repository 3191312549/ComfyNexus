/**
 * 工具函数库
 * 
 * 提供常用的工具函数，如类名合并等
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并类名
 * 使用 clsx 和 tailwind-merge 合并类名，解决 Tailwind CSS 类名冲突
 * 
 * @param inputs - 类名输入
 * @returns 合并后的类名字符串
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
