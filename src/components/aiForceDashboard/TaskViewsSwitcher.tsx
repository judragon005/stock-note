import React from 'react';
import type { AiForceTaskTabKey } from '../../types/aiForceDashboard';

export interface TaskViewItem {
  key: AiForceTaskTabKey;
  label: string;
  icon: string;
  badge?: string;
}

export const TASK_VIEWS_CONFIG: TaskViewItem[] = [
  { key: 'TASK_1_COMPREHENSIVE', label: '任務一：綜合分析報告', icon: '📊', badge: '18 卡片' },
  { key: 'TASK_2_TECHNICAL_ALERTS', label: '任務二：技術警示報告', icon: '⚠️', badge: '即時' },
  { key: 'TASK_3_KD_MA', label: '任務三：KD + MA 圖表', icon: '📈' },
  { key: 'TASK_4_MACD', label: '任務四：MACD 圖表', icon: '📉' },
  { key: 'TASK_5_RAW_DATA', label: '原始資料表', icon: '📑' },
];

export interface TaskViewsSwitcherProps {
  activeTab: AiForceTaskTabKey;
  onChangeTab: (tab: AiForceTaskTabKey) => void;
}

export const TaskViewsSwitcher: React.FC<TaskViewsSwitcherProps> = ({
  activeTab,
  onChangeTab,
}) => {
  return (
    <div
      data-testid="task-views-switcher"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '6px',
        overflowX: 'auto',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      }}
    >
      {TASK_VIEWS_CONFIG.map((task) => {
        const isActive = task.key === activeTab;
        return (
          <button
            key={task.key}
            type="button"
            data-testid={`task-tab-${task.key}`}
            onClick={() => onChangeTab(task.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: isActive ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
              backgroundColor: isActive ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: isActive ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: isActive ? 600 : 500,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              boxShadow: isActive ? '0 0 12px rgba(56, 189, 248, 0.2)' : 'none',
            }}
          >
            <span>{task.icon}</span>
            <span>{task.label}</span>
            {task.badge && (
              <span
                style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  backgroundColor: isActive ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                  color: isActive ? '#f8fafc' : '#64748b',
                }}
              >
                {task.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default TaskViewsSwitcher;
