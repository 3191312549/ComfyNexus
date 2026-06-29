/**
 * Toast 组件
 */

import { HTMLAttributes, forwardRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { Button } from './Button'

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  open?: boolean
  onClose?: () => void
  title?: string
  description?: string
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

const Toast = forwardRef<HTMLDivElement, ToastProps>(
  ({ 
    className, 
    open, 
    onClose, 
    title, 
    description, 
    variant = 'default',
    duration = 3000,
    ...props 
  }, ref) => {
    const [visible, setVisible] = useState(open)

    useEffect(() => {
      setVisible(open)
      
      if (open && duration > 0) {
        const timer = setTimeout(() => {
          setVisible(false)
          onClose?.()
        }, duration)
        
        return () => clearTimeout(timer)
      }
    }, [open, duration, onClose])

    if (!visible) return null

    const icons = {
      default: null,
      success: <CheckCircle className="size-5 text-success" />,
      error: <AlertCircle className="size-5 text-danger" />,
      warning: <AlertTriangle className="size-5 text-warning" />,
      info: <Info className="size-5 text-info" />,
    }

    return (
      <div className="fixed left-1/2 top-4 z-[9999] -translate-x-1/2">
        <div
          ref={ref}
          className={cn(
            'flex items-start gap-3 rounded-lg border border-border bg-background p-4 shadow-lg',
            'animate-in slide-in-from-top-5',
            'min-w-[300px] max-w-[420px]',
            className
          )}
          {...props}
        >
          {icons[variant]}
          
          <div className="flex-1 space-y-1">
            {title && (
              <p className="text-sm font-semibold">{title}</p>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>

          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setVisible(false)
                onClose()
              }}
              className="size-6"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>
    )
  }
)

Toast.displayName = 'Toast'

export { Toast }
