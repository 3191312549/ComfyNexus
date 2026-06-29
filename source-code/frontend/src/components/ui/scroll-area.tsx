/**
 * ScrollArea 组件
 * 滚动区域组件
 */

import React from 'react';

export interface ScrollAreaProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
}

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ children, className, style, onScroll }, ref) => {
    return (
      <div 
        ref={ref}
        className={`overflow-auto ${className || ''}`}
        style={style}
        onScroll={onScroll}
      >
        {children}
      </div>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';
