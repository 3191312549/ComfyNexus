/**
 * 滚动条样式测试组件
 * 
 * 用于验证滚动条在不同场景下的显示效果
 */

import React from 'react';

export const ScrollbarTest: React.FC = () => {
  return (
    <div className="space-y-8 p-8">
      <h1 className="mb-4 text-2xl font-bold">滚动条样式测试</h1>
      
      {/* 标准滚动条 */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">标准滚动条 (12px)</h2>
        <div className="h-64 overflow-y-auto rounded-lg border bg-card p-4">
          <div className="space-y-2">
            {Array.from({ length: 50 }, (_, i) => (
              <div key={i} className="rounded bg-muted p-2">
                内容行 {i + 1} - 这是一段测试文本,用于展示滚动条效果
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 细滚动条 */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">细滚动条 (8px)</h2>
        <div className="scrollbar-thin h-64 overflow-y-auto rounded-lg border bg-card p-4">
          <div className="space-y-2">
            {Array.from({ length: 50 }, (_, i) => (
              <div key={i} className="rounded bg-muted p-2">
                内容行 {i + 1} - 使用细滚动条样式
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 水平滚动条 */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">水平滚动条</h2>
        <div className="overflow-x-auto rounded-lg border bg-card p-4">
          <div className="flex gap-4" style={{ width: '2000px' }}>
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i} className="flex h-32 w-48 shrink-0 items-center justify-center rounded bg-muted">
                卡片 {i + 1}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 隐藏滚动条 */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">隐藏滚动条 (但可滚动)</h2>
        <div className="scrollbar-hide h-64 overflow-y-auto rounded-lg border bg-card p-4">
          <div className="space-y-2">
            {Array.from({ length: 50 }, (_, i) => (
              <div key={i} className="rounded bg-muted p-2">
                内容行 {i + 1} - 滚动条已隐藏,但仍可滚动
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 双向滚动 */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">双向滚动</h2>
        <div className="h-64 overflow-auto rounded-lg border bg-card p-4">
          <div className="space-y-2" style={{ width: '1500px' }}>
            {Array.from({ length: 30 }, (_, i) => (
              <div key={i} className="rounded bg-muted p-2">
                内容行 {i + 1} - 这是一段很长的文本,用于测试水平和垂直滚动条的同时显示效果
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 嵌套滚动 */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">嵌套滚动</h2>
        <div className="h-96 overflow-y-auto rounded-lg border bg-card p-4">
          <div className="space-y-4">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="rounded-lg border bg-muted p-4">
                <h3 className="mb-2 font-semibold">嵌套区域 {i + 1}</h3>
                <div className="scrollbar-thin h-32 overflow-y-auto rounded bg-background p-2">
                  <div className="space-y-1">
                    {Array.from({ length: 20 }, (_, j) => (
                      <div key={j} className="text-sm">
                        嵌套内容 {j + 1}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ScrollbarTest;
