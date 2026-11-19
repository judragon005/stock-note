import React from 'react';
import { LayoutGrid, AlertTriangle, TrendingUp, Activity, Table2, HelpCircle } from 'lucide-react';
import type { AiForceTaskTabKey } from '../../types/aiForceDashboard';
import { TermTooltip } from '../common/TermTooltip';

export interface TaskViewItem {
  key: AiForceTaskTabKey;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  termId?: string;
}

export const TASK_VIEWS_CONFIG: TaskViewItem[] = [
  { key: 'TASK_1_COMPREHENSIVE', label: '任務一：綜合分析報告', icon: <LayoutGrid size={14} />, badge: '21 模組', termId: 'viewTask1' },
  { key: 'TASK_2_TECHNICAL_ALERTS', label: '任務二：技術警示報告', icon: <AlertTriangle size={14} />, badge: '即時', termId: 'viewTask2' },
  { key: 'TASK_3_KD_MA', label: '任務三：KD + MA 圖表', icon: <TrendingUp size={14} />, termId: 'viewTask3' },
  { key: 'TASK_4_MACD', label: '任務四：MACD 圖表', icon: <Activity size={14} />, termId: 'viewTask4' },
  { key: 'TASK_5_RAW_DATA', label: '原始資料表', icon: <Table2 size={14} />, termId: 'viewTask5' },
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
        backgroundColor: '#0B101B',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        borderRadius: '10px',
        padding: '5px 8px',
        overflowX: 'auto',
        fontVariantNumeric: 'tabular-nums',
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
              padding: '6px 12px',
              borderRadius: '7px',
              border: isActive ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
              backgroundColor: isActive ? 'rgba(56, 189, 248, 0.14)' : 'transparent',
              color: isActive ? '#38bdf8' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: isActive ? 600 : 500,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>{task.icon}</span>
              <span>{task.label}</span>
            </span>
            {task.badge && (
              <span
                style={{
                  fontSize: '12px',
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  backgroundColor: isActive ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                  color: isActive ? '#f8fafc' : '#94a3b8',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {task.badge}
              </span>
            )}
            {task.termId && (
              <TermTooltip termId={task.termId}>
                <span
                  aria-label={`${task.label} 說明`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    color: '#94a3b8',
                    cursor: 'help',
                    marginLeft: '2px',
                  }}
                >
                  <HelpCircle size={12} />
                </span>
              </TermTooltip>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default TaskViewsSwitcher;
