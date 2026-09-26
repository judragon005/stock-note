import { describe, it, expect } from 'vitest';
import { TASK_VIEWS_CONFIG } from './TaskViewsSwitcher';
import type { AiForceTaskTabKey } from '../../types/aiForceDashboard';

describe('TaskViewsSwitcher configuration & keys', () => {
  it('應該完整定義 5 大任務視圖設定', () => {
    expect(TASK_VIEWS_CONFIG).toHaveLength(5);
    const keys = TASK_VIEWS_CONFIG.map((t) => t.key);
    expect(keys).toContain<AiForceTaskTabKey>('TASK_1_COMPREHENSIVE');
    expect(keys).toContain<AiForceTaskTabKey>('TASK_2_TECHNICAL_ALERTS');
    expect(keys).toContain<AiForceTaskTabKey>('TASK_3_KD_MA');
    expect(keys).toContain<AiForceTaskTabKey>('TASK_4_MACD');
    expect(keys).toContain<AiForceTaskTabKey>('TASK_5_RAW_DATA');
  });

  it('應該具備繁體中文任務標籤與圖示', () => {
    const task1 = TASK_VIEWS_CONFIG.find((t) => t.key === 'TASK_1_COMPREHENSIVE');
    expect(task1?.label).toContain('綜合分析報告');
    expect(task1?.icon).toBeDefined();
  });
});
