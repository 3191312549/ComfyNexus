/**
 * MonitorCard 组件使用示例
 * 
 * 此文件展示了 MonitorCard 组件的各种使用场景
 */

import { Cpu, MemoryStick, HardDrive, Zap, Thermometer } from 'lucide-react'
import { MonitorCard } from './MonitorCard'

/**
 * MonitorCard 使用示例组件
 */
export const MonitorCardExample = () => {
  return (
    <div className="dark:bg-dark-primary bg-gray-50 min-h-screen space-y-6 p-8">
      <h1 className="dark:text-dark-text-primary text-gray-900 text-2xl font-bold">
        MonitorCard 组件示例
      </h1>

      {/* 基础示例 */}
      <section className="space-y-4">
        <h2 className="dark:text-dark-text-primary text-gray-800 text-xl font-semibold">
          1. 基础使用
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <MonitorCard
            label={t("common.label.cpuUsage")}
            value={75}
            unit="%"
            color="green"
            icon={Cpu}
          />
          <MonitorCard
            label={t("common.label.memory")}
            value={60}
            unit="%"
            color="blue"
            icon={MemoryStick}
          />
          <MonitorCard
            label={t("common.label.virtualMemory")}
            value={45}
            unit="%"
            color="cyan"
            icon={HardDrive}
          />
        </div>
      </section>

      {/* 温度预警示例 */}
      <section className="space-y-4">
        <h2 className="dark:text-dark-text-primary text-gray-800 text-xl font-semibold">
          2. 温度预警（自动变色）
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <MonitorCard
            label={t("common.label.cpuTempNormal")}
            value={70}
            unit="°C"
            color="orange"
            icon={Thermometer}
          />
          <MonitorCard
            label={t("common.label.cpuTempWarning")}
            value={80}
            unit="°C"
            color="orange"
            icon={Thermometer}
          />
          <MonitorCard
            label={t("common.label.cpuTempDanger")}
            value={90}
            unit="°C"
            color="orange"
            icon={Thermometer}
          />
        </div>
      </section>

      {/* 功率显示示例 */}
      <section className="space-y-4">
        <h2 className="dark:text-dark-text-primary text-gray-800 text-xl font-semibold">
          3. 功率显示（无进度条）
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <MonitorCard
            label={t("common.label.cpuPower")}
            value={65}
            unit="W"
            color="yellow"
            icon={Zap}
            showProgressBar={false}
          />
          <MonitorCard
            label={t("common.label.gpuPower")}
            value={180}
            unit="W"
            color="pink"
            icon={Zap}
            showProgressBar={false}
          />
          <MonitorCard
            label={t("common.label.totalPower")}
            value={245}
            unit="W"
            color="purple"
            icon={Zap}
            showProgressBar={false}
          />
        </div>
      </section>

      {/* 数据缺失示例 */}
      <section className="space-y-4">
        <h2 className="dark:text-dark-text-primary text-gray-800 text-xl font-semibold">
          4. 数据缺失处理
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <MonitorCard
            label={t("common.label.cpuUsage")}
            value={null}
            unit="%"
            color="green"
            icon={Cpu}
          />
          <MonitorCard
            label={t("common.label.gpuTemp")}
            value={null}
            unit="°C"
            color="orange"
            icon={Thermometer}
          />
          <MonitorCard
            label={t("common.label.gpuPower")}
            value={null}
            unit="W"
            color="yellow"
            icon={Zap}
            showProgressBar={false}
          />
        </div>
      </section>

      {/* 边界值示例 */}
      <section className="space-y-4">
        <h2 className="dark:text-dark-text-primary text-gray-800 text-xl font-semibold">
          5. 边界值测试
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <MonitorCard
            label={t("common.label.minValue")}
            value={0}
            unit="%"
            color="green"
            icon={Cpu}
          />
          <MonitorCard
            label={t("common.label.maxValue")}
            value={100}
            unit="%"
            color="red"
            icon={Cpu}
          />
          <MonitorCard
            label={t("common.label.outOfRange")}
            value={150}
            unit="%"
            color="red"
            icon={Cpu}
          />
        </div>
      </section>

      {/* 完整的 3x3 监控网格示例 */}
      <section className="space-y-4">
        <h2 className="dark:text-dark-text-primary text-gray-800 text-xl font-semibold">
          6. 完整监控网格（3x3）
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {/* 第一排 - 内存类 */}
          <MonitorCard
            label="VRAM"
            value={85}
            unit="%"
            color="purple"
            icon={Cpu}
          />
          <MonitorCard
            label={t("common.label.memory")}
            value={62}
            unit="%"
            color="blue"
            icon={MemoryStick}
          />
          <MonitorCard
            label={t("common.label.virtualMemory")}
            value={45}
            unit="%"
            color="cyan"
            icon={HardDrive}
          />

          {/* 第二排 - CPU */}
          <MonitorCard
            label={t("common.label.cpuUsage")}
            value={75}
            unit="%"
            color="green"
            icon={Cpu}
          />
          <MonitorCard
            label={t("common.label.cpuPower")}
            value={65}
            unit="W"
            color="yellow"
            icon={Zap}
            showProgressBar={false}
          />
          <MonitorCard
            label={t("common.label.cpuTemp")}
            value={72}
            unit="°C"
            color="orange"
            icon={Thermometer}
          />

          {/* 第三排 - GPU */}
          <MonitorCard
            label={t("common.label.gpuUsage")}
            value={90}
            unit="%"
            color="indigo"
            icon={Cpu}
          />
          <MonitorCard
            label={t("common.label.gpuPower")}
            value={180}
            unit="W"
            color="pink"
            icon={Zap}
            showProgressBar={false}
          />
          <MonitorCard
            label={t("common.label.gpuTemp")}
            value={78}
            unit="°C"
            color="red"
            icon={Thermometer}
          />
        </div>
      </section>
    </div>
  )
}

export default MonitorCardExample
