import { describe, it, expect } from 'vitest';
import {
  isDispositionActive,
  isAttentionActive,
  resolveDispositionAttentionStatus,
} from './dispositionWindowEngine';

describe('dispositionWindowEngine - 處置與注意有效視窗判定 (Ticket 01 & Ticket 02)', () => {
  describe('isDispositionActive (處置股票起訖日期有效視窗)', () => {
    it('當基準日在起訖日期區間內時應回傳 true', () => {
      const event = { startDate: '2026-09-20', endDate: '2026-10-05' };
      expect(isDispositionActive(event, '2026-09-20')).toBe(true);
      expect(isDispositionActive(event, '2026-09-25')).toBe(true);
      expect(isDispositionActive(event, '2026-10-05')).toBe(true);
    });

    it('支援 YYYY/MM/DD 斜線日期格式', () => {
      const event = { startDate: '2026/09/20', endDate: '2026/10/05' };
      expect(isDispositionActive(event, '2026-09-25')).toBe(true);
    });

    it('當基準日晚於結束日期時應回傳 false (過期失效)', () => {
      const event = { startDate: '2026-09-10', endDate: '2026-09-20' };
      expect(isDispositionActive(event, '2026-09-21')).toBe(false);
      expect(isDispositionActive(event, '2026-10-01')).toBe(false);
    });

    it('當基準日早於開始日期時應回傳 false (尚未生效)', () => {
      const event = { startDate: '2026-10-10', endDate: '2026-10-25' };
      expect(isDispositionActive(event, '2026-10-01')).toBe(false);
    });

    it('若缺少起訖日期或格式非法時應安全回傳 false', () => {
      expect(isDispositionActive({ startDate: '', endDate: '' }, '2026-10-01')).toBe(false);
      expect(isDispositionActive({ startDate: 'invalid' }, '2026-10-01')).toBe(false);
    });
  });

  describe('isAttentionActive (注意股票當日有效判定)', () => {
    it('當公告日等於基準日（或前一營業日）時應回傳 true', () => {
      expect(isAttentionActive({ eventDate: '2026-10-01' }, '2026-10-01')).toBe(true);
      // 容許前 1 個自然日（如昨日盤後公布）
      expect(isAttentionActive({ eventDate: '2026-09-30' }, '2026-10-01')).toBe(true);
    });

    it('超過有效視窗（2 日以上之歷史公告）應回傳 false', () => {
      expect(isAttentionActive({ eventDate: '2026-09-20' }, '2026-10-01')).toBe(false);
    });

    it('日期異常或缺失時應安全回傳 false', () => {
      expect(isAttentionActive({ eventDate: '' }, '2026-10-01')).toBe(false);
    });
  });

  describe('resolveDispositionAttentionStatus (複合優先級判定)', () => {
    it('無任何事件時應回傳 NORMAL', () => {
      expect(resolveDispositionAttentionStatus([], '2026-10-01')).toBe('NORMAL');
    });

    it('有有效處置時應回傳 DISPOSITION（處置優先於注意）', () => {
      const events = [
        { type: 'ATTENTION' as const, eventDate: '2026-10-01' },
        { type: 'DISPOSITION' as const, startDate: '2026-09-25', endDate: '2026-10-05' },
      ];
      expect(resolveDispositionAttentionStatus(events, '2026-10-01')).toBe('DISPOSITION');
    });

    it('僅有有效注意時應回傳 ATTENTION', () => {
      const events = [
        { type: 'ATTENTION' as const, eventDate: '2026-10-01' },
        { type: 'DISPOSITION' as const, startDate: '2026-09-01', endDate: '2026-09-10' }, // 已過期
      ];
      expect(resolveDispositionAttentionStatus(events, '2026-10-01')).toBe('ATTENTION');
    });

    it('事件皆已過期時應回傳 NORMAL', () => {
      const events = [
        { type: 'ATTENTION' as const, eventDate: '2026-09-01' },
        { type: 'DISPOSITION' as const, startDate: '2026-09-01', endDate: '2026-09-10' },
      ];
      expect(resolveDispositionAttentionStatus(events, '2026-10-01')).toBe('NORMAL');
    });
  });
});
