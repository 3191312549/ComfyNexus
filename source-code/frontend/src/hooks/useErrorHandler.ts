/**
 * 错误处理 Hook
 * 
 * 根据错误类型显示不同的提示信息
 * 使用 Toast 组件显示错误
 */

import { useCallback } from 'react';
import type { ErrorInfo } from '../types/dependency';

/**
 * Toast 配置接口
 */
interface ToastConfig {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
  action?: React.ReactNode;
}

/**
 * 错误处理 Hook
 * 
 * @returns 错误处理函数
 */
export function useErrorHandler() {
  /**
   * 显示 Toast（简化版本，实际应该使用 Shadcn/ui Toast）
   * 这里使用 console 和 alert 作为临时实现
   */
  const showToast = useCallback((config: ToastConfig) => {
    console.error(`[${config.variant || 'default'}] ${config.title}:`, config.description);
    
    // 在实际项目中，这里应该使用 Shadcn/ui 的 Toast 组件
    // 例如：toast({ ...config })
    
    // 临时使用 alert 显示错误
    if (config.variant === 'destructive') {
      alert(`错误: ${config.title}\n\n${config.description}`);
    }
  }, []);

  /**
   * 处理错误
   * 
   * @param error - 错误信息
   */
  const handleError = useCallback((error: ErrorInfo) => {
    switch (error.type) {
      case 'network_error':
        showToast({
          title: '网络错误',
          description: '无法连接到 PyPI，请检查网络连接',
          variant: 'destructive'
        });
        break;
      
      case 'permission_error':
        showToast({
          title: '权限不足',
          description: '无法写入目标环境，请以管理员身份运行',
          variant: 'destructive'
        });
        break;
      
      case 'version_conflict':
        showToast({
          title: '版本冲突',
          description: error.message,
          variant: 'destructive'
        });
        break;
      
      case 'environment_error':
        showToast({
          title: '环境错误',
          description: 'Python 环境不可用或配置错误',
          variant: 'destructive'
        });
        break;
      
      case 'file_system_error':
        showToast({
          title: '文件系统错误',
          description: error.message,
          variant: 'destructive'
        });
        break;
      
      case 'pip_error':
        showToast({
          title: 'pip 命令错误',
          description: error.message,
          variant: 'destructive'
        });
        break;
      
      case 'parse_error':
        showToast({
          title: '解析错误',
          description: error.message,
          variant: 'destructive'
        });
        break;
      
      default:
        showToast({
          title: '操作失败',
          description: error.message || '发生未知错误',
          variant: 'destructive'
        });
    }
  }, [showToast]);

  /**
   * 获取错误建议
   * 
   * @param error - 错误信息
   * @returns 建议列表
   */
  const getErrorSuggestions = useCallback((error: ErrorInfo): string[] => {
    const suggestions: string[] = [];

    switch (error.type) {
      case 'network_error':
        suggestions.push('检查网络连接是否正常');
        suggestions.push('尝试使用国内镜像源');
        suggestions.push('检查防火墙设置');
        break;
      
      case 'permission_error':
        suggestions.push('以管理员身份运行应用');
        suggestions.push('检查目标目录的写入权限');
        break;
      
      case 'version_conflict':
        suggestions.push('尝试升级或降级相关依赖');
        suggestions.push('查看详细的冲突信息');
        break;
      
      case 'environment_error':
        suggestions.push('检查 Python 环境是否正确配置');
        suggestions.push('尝试重新创建虚拟环境');
        break;
      
      default:
        suggestions.push('查看详细日志获取更多信息');
        suggestions.push('尝试重新执行操作');
    }

    return suggestions;
  }, []);

  return {
    handleError,
    getErrorSuggestions
  };
}

export default useErrorHandler;
