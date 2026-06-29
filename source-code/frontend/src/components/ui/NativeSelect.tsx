/**
 * 原生 Select 组件封装
 * 用于简单的下拉选择场景
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  onValueChange?: (value: string) => void
  inputSize?: 'default' | 'sm'
}

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, onValueChange, onChange, inputSize = 'default', ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange?.(e)
      onValueChange?.(e.target.value)
    }

    return (
      <select
        ref={ref}
        className={cn(
          "flex w-full items-center justify-between rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          "[&>option]:bg-background [&>option]:text-foreground",
          "[&>optgroup]:bg-background [&>optgroup]:text-foreground",
          inputSize === 'default' && "h-10 px-3 py-2",
          inputSize === 'sm' && "h-7 px-2 py-1 text-xs",
          className
        )}
        onChange={handleChange}
        {...props}
      />
    )
  }
)

NativeSelect.displayName = "NativeSelect"

export { NativeSelect }
