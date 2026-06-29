/**
 * 依赖更新徽章组件
 * 
 * 显示闪烁的悬浮叹号,提示用户依赖有更新
 */

import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface DependencyBadgeProps {
  show: boolean;
}

export const DependencyBadge: React.FC<DependencyBadgeProps> = ({ show }) => {
  const [isHovered, setIsHovered] = useState(false);

  if (!show) return null;

  return (
    <>
      {/* 提示图标 - 绝对定位在右下角 */}
      <div 
        className="absolute -bottom-1 -right-1 z-10"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative">
          <AlertCircle className="text-orange-500 size-3.5 animate-pulse" />
          <span className="absolute inset-0 animate-ping">
            <AlertCircle className="text-orange-500 size-3.5 opacity-75" />
          </span>
        </div>
      </div>
      
      {/* 悬浮提示 */}
      {isHovered && (
        <div className="bg-gray-900 text-white absolute -bottom-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded px-2 py-1 text-xs shadow-lg">
          依赖有更新
          <div className="bg-gray-900 absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rotate-45" />
        </div>
      )}
    </>
  );
};

export default DependencyBadge;
