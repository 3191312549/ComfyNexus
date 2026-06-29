/**
 * Popover 组件
 * 提供点击触发的弹出层功能
 * PopoverContent 通过 Portal 渲染到 document.body，避免被 overflow-hidden 裁剪
 */

import { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

const PopoverContext = createContext<PopoverContextValue | undefined>(undefined);

export interface PopoverProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({ children, open: controlledOpen, onOpenChange }: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block">
        {children}
      </div>
    </PopoverContext.Provider>
  );
}

export interface PopoverTriggerProps {
  children: ReactNode;
  asChild?: boolean;
  className?: string;
}

export function PopoverTrigger({ children, asChild, className }: PopoverTriggerProps) {
  const context = useContext(PopoverContext);

  if (!context) {
    throw new Error('PopoverTrigger must be used within a Popover');
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    context.setOpen(!context.open);
  };

  if (asChild) {
    const child = children as React.ReactElement;
    return (
      <div ref={context.triggerRef} onClick={handleClick} className={className}>
        {child}
      </div>
    );
  }

  return (
    <div
      ref={context.triggerRef}
      onClick={handleClick}
      className={className}
    >
      <button type="button" className="contents">
        {children}
      </button>
    </div>
  );
}

export interface PopoverContentProps {
  children: ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function PopoverContent({
  children,
  className,
  align = 'center',
  side = 'bottom'
}: PopoverContentProps) {
  const context = useContext(PopoverContext);
  const contentRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<React.CSSProperties>({});

  if (!context) {
    throw new Error('PopoverContent must be used within a Popover');
  }

  const updatePosition = useCallback(() => {
    const triggerEl = context.triggerRef.current;
    if (!triggerEl) return;

    const rect = triggerEl.getBoundingClientRect();
    const GAP = 8;
    const styles: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9999,
    };

    switch (side) {
      case 'top':
        styles.bottom = window.innerHeight - rect.top + GAP;
        break;
      case 'bottom':
        styles.top = rect.bottom + GAP;
        break;
      case 'left':
        styles.right = window.innerWidth - rect.left + GAP;
        break;
      case 'right':
        styles.left = rect.right + GAP;
        break;
    }

    if (side === 'top' || side === 'bottom') {
      switch (align) {
        case 'start':
          styles.left = rect.left;
          break;
        case 'center':
          styles.left = rect.left + rect.width / 2;
          styles.transform = 'translateX(-50%)';
          break;
        case 'end':
          styles.left = rect.right;
          styles.transform = 'translateX(-100%)';
          break;
      }
    } else {
      switch (align) {
        case 'start':
          styles.top = rect.top;
          break;
        case 'center':
          styles.top = rect.top + rect.height / 2;
          styles.transform = 'translateY(-50%)';
          break;
        case 'end':
          styles.top = rect.bottom;
          styles.transform = 'translateY(-100%)';
          break;
      }
    }

    setPosition(styles);
  }, [context.triggerRef, side, align]);

  useEffect(() => {
    if (!context.open) return;

    updatePosition();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInsideContent = contentRef.current?.contains(target);
      const isInsideTrigger = context.triggerRef.current?.contains(target);
      if (!isInsideContent && !isInsideTrigger) {
        context.setOpen(false);
      }
    };

    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [context.open, context, updatePosition]);

  if (!context.open) return null;

  return createPortal(
    <div
      ref={contentRef}
      className={cn(
        'border border-border bg-background rounded-lg shadow-lg',
        'animate-in fade-in-0 zoom-in-95 duration-150',
        className
      )}
      style={position}
    >
      {children}
    </div>,
    document.body
  );
}
