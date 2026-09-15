import { describe, it, expect } from 'vitest';
import {
  WINDOWS_SCHEDULE_COMMANDS,
  formatScheduleSummaryText,
} from './MarketScheduleHubSection';

describe('MarketScheduleHubSection - Windows 背景自動化排程與卸載管理規範測試 (Spec 0133)', () => {
  describe('1. 系統命令常數定義規範', () => {
    it('卸載指令應包含正確的台股與美股任務名稱，並使用強制參數 /f', () => {
      const uninstallCmd = WINDOWS_SCHEDULE_COMMANDS.UNINSTALL;
      expect(uninstallCmd).toContain('schtasks /delete /tn "StockTracker_TW_Sync" /f');
      expect(uninstallCmd).toContain('schtasks /delete /tn "StockTracker_US_Sync" /f');
    });

    it('安裝指引應正確指向專案中的批次檔 scripts\\market-sync\\setup-windows-task.bat', () => {
      const batPath = WINDOWS_SCHEDULE_COMMANDS.SETUP_BAT_PATH;
      expect(batPath).toBe('scripts\\market-sync\\setup-windows-task.bat');
    });

    it('手動測試指令應包含台股與美股各自的獨立執行命令', () => {
      expect(WINDOWS_SCHEDULE_COMMANDS.TEST_TW_CMD).toBe('node scripts/market-sync/sync-tw-market.cjs');
      expect(WINDOWS_SCHEDULE_COMMANDS.TEST_US_CMD).toBe('node scripts/market-sync/sync-us-market.cjs');
    });
  });

  describe('2. 水線資訊與狀態格式化規範', () => {
    it('當無快取資訊時，應明確提示尚未啟動或等待排程', () => {
      const text = formatScheduleSummaryText(null, 'TW');
      expect(text).toContain('未偵測到排程執行數據');
      expect(text).toContain('16:00');
    });

    it('當有快取資訊時，應展示日期、標的數量與執行秒數', () => {
      const mockSummary = {
        date: '2026-09-15',
        market: 'TW' as const,
        totalSymbols: 2540,
        updatedAt: 1789446264000,
        durationMs: 3450,
        stocks: {},
      };
      const text = formatScheduleSummaryText(mockSummary, 'TW');
      expect(text).toContain('2026-09-15');
      expect(text).toContain('2,540 檔');
      expect(text).toContain('3.5 秒');
    });
  });
});
