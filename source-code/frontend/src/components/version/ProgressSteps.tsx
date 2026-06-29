/**
 * ProgressSteps 组件
 * 
 * 显示版本切换的所有步骤和进度
 */

import React from 'react';
import { StepItem } from './StepItem';
import type { SwitchProgress } from '@/types/version';

interface ProgressStepsProps {
  /** 切换进度 */
  progress: SwitchProgress;
}

/**
 * ProgressSteps 组件
 */
export const ProgressSteps: React.FC<ProgressStepsProps> = ({ progress }) => {
  const steps = [
    { key: 'git' as const, label: 'Git 切换', status: progress.steps.git },
    { key: 'dependencyCheck' as const, label: '依赖检测', status: progress.steps.dependencyCheck },
    { key: 'dependencyInstall' as const, label: '依赖安装', status: progress.steps.dependencyInstall },
    { key: 'restart' as const, label: '进程重启', status: progress.steps.restart },
  ];

  return (
    <div className="space-y-2">
      {steps.map((step) => (
        <StepItem
          key={step.key}
          label={step.label}
          status={step.status}
          isActive={progress.currentStep === step.key}
        />
      ))}
    </div>
  );
};

export default ProgressSteps;
