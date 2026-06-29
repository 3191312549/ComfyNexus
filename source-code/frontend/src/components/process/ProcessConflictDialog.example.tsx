/**
 * ProcessConflictDialog 组件使用示例
 * 
 * 此文件展示如何使用 ProcessConflictDialog 组件
 */

import React, { useState } from 'react'
import { ProcessConflictDialog } from './ProcessConflictDialog'
import { ConflictProcess } from '@/types/process'
import { Button } from '@/components/ui/Button'

/**
 * 示例组件
 */
export function ProcessConflictDialogExample() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // 模拟冲突进程数据
  const mockProcesses: ConflictProcess[] = [
    {
      pid: 12345,
      port: 8188,
      cmdline: 'python main.py --port 8188 --listen 0.0.0.0',
      cwd: '/home/user/ComfyUI',
      create_time: Date.now() / 1000 - 3600, // 1小时前
    },
    {
      pid: 67890,
      port: 8189,
      cmdline: 'python main.py --port 8189',
      cwd: '/home/user/ComfyUI-backup',
      create_time: Date.now() / 1000 - 7200, // 2小时前
    },
  ]

  /**
   * 处理结束进程操作
   */
  const handleKillProcesses = async () => {
    setLoading(true)
    try {
      // 模拟 API 调用
      await new Promise((resolve) => setTimeout(resolve, 2000))
      console.log('进程已结束')
      setOpen(false)
    } catch (error) {
      console.error('结束进程失败:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 处理继续启动操作
   */
  const handleContinue = () => {
    console.log('继续启动')
    setOpen(false)
  }

  /**
   * 处理取消操作
   */
  const handleCancel = () => {
    console.log('取消操作')
    setOpen(false)
  }

  return (
    <div className="space-y-4 p-8">
      <h2 className="text-2xl font-bold">ProcessConflictDialog 示例</h2>
      
      <div className="space-y-2">
        <Button onClick={() => setOpen(true)}>
          打开对话框（有端口冲突）
        </Button>
      </div>

      {/* 有端口冲突的场景 */}
      <ProcessConflictDialog
        open={open}
        processes={mockProcesses}
        hasPortConflict={true}
        targetPort={8188}
        onKillProcesses={handleKillProcesses}
        onContinue={handleContinue}
        onCancel={handleCancel}
        loading={loading}
      />
    </div>
  )
}

/**
 * 无端口冲突的示例
 */
export function ProcessConflictDialogNoPortConflictExample() {
  const [open, setOpen] = useState(false)

  const mockProcesses: ConflictProcess[] = [
    {
      pid: 11111,
      port: 8189,
      cmdline: 'python main.py --port 8189',
      cwd: '/home/user/ComfyUI-test',
      create_time: Date.now() / 1000 - 1800, // 30分钟前
    },
  ]

  return (
    <div className="space-y-4 p-8">
      <h2 className="text-2xl font-bold">ProcessConflictDialog 示例（无端口冲突）</h2>
      
      <Button onClick={() => setOpen(true)}>
        打开对话框（无端口冲突）
      </Button>

      <ProcessConflictDialog
        open={open}
        processes={mockProcesses}
        hasPortConflict={false}
        targetPort={8188}
        onKillProcesses={async () => {
          console.log('结束进程')
          setOpen(false)
        }}
        onContinue={() => {
          console.log('继续启动')
          setOpen(false)
        }}
        onCancel={() => {
          console.log('取消')
          setOpen(false)
        }}
      />
    </div>
  )
}
