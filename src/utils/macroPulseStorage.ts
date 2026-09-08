import { MacroIndicatorSnapshot } from '../types/macro';

export const MACRO_PULSE_STORAGE_KEY = 'STOCK_TRACKER_MACRO_PULSE_HISTORY_V1';

export interface MacroPulseHistoryRecord extends MacroIndicatorSnapshot {
  id: string; // YYYY-MM-DD
  isManual?: boolean;
}

/**
 * 從本地持久化儲存載入全量市場四柱歷史快照 (依日期由新至舊排序)
 */
export function loadMacroPulseHistory(): MacroPulseHistoryRecord[] {
  try {
    const raw = localStorage.getItem(MACRO_PULSE_STORAGE_KEY);
    if (!raw) return [];
    const parsed: MacroPulseHistoryRecord[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.date.localeCompare(a.date));
  } catch (e) {
    console.error('Failed to load macro pulse history:', e);
    return [];
  }
}

/**
 * 儲存或更新單日市場四柱紀錄 (冪等去重，以 date 為唯一鍵值)
 */
export function saveMacroPulseRecord(snapshot: MacroIndicatorSnapshot, isManual = false): void {
  try {
    const history = loadMacroPulseHistory();
    const existingIdx = history.findIndex((h) => h.date === snapshot.date);
    const newRecord: MacroPulseHistoryRecord = {
      ...snapshot,
      id: snapshot.date,
      isManual,
      updatedAt: Date.now(),
    };

    if (existingIdx >= 0) {
      history[existingIdx] = newRecord;
    } else {
      history.unshift(newRecord);
    }

    history.sort((a, b) => b.date.localeCompare(a.date));
    localStorage.setItem(MACRO_PULSE_STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save macro pulse record:', e);
  }
}

/**
 * 獲取本地最新一筆市場四柱快照
 */
export function getLatestMacroPulseRecord(): MacroPulseHistoryRecord | null {
  const history = loadMacroPulseHistory();
  return history.length > 0 ? history[0] : null;
}

/**
 * 匯出歷史市場脈搏數據為 CSV 格式 (供量化研究與 Excel 深度分析)
 */
export function exportMacroPulseHistoryAsCsv(): string {
  const history = loadMacroPulseHistory();
  const headers = [
    '日期',
    '10Y美債(%)',
    '2Y美債(%)',
    '殖利率利差(%)',
    'VIX恐慌指數',
    'VIX警戒位階',
    '恐懼與貪婪指數',
    '恐懼貪婪位階',
    '黃金現貨(USD/oz)',
    'WTI原油(USD/桶)',
    '美元指數(DXY)',
    'USD/TWD匯率',
    '美M2年增(%)',
    '台M2年增(%)',
    '最後更新時間',
  ];

  const rows = history.map((h) => [
    h.date,
    h.us10y.toFixed(2),
    h.us2y.toFixed(2),
    h.yieldSpread.toFixed(2),
    h.vix.toFixed(1),
    h.vixLevel,
    h.fearAndGreedIndex,
    h.fearAndGreedLevel,
    h.goldPrice.toFixed(1),
    h.oilPrice.toFixed(1),
    h.dxy.toFixed(1),
    h.usdToTwd.toFixed(2),
    (h.usM2GrowthYoY ?? 0).toFixed(1),
    (h.twM2GrowthYoY ?? 0).toFixed(1),
    new Date(h.updatedAt).toISOString(),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * 初始化近 30 天代表性真實歷史脈搏 (若使用者本地首次使用，建立基底數據庫)
 */
export function generateSampleHistoricalMacroData(): void {
  const history = loadMacroPulseHistory();
  if (history.length >= 10) return;

  const sampleDays = 30;
  const baseDate = new Date();
  const records: MacroPulseHistoryRecord[] = [];

  for (let i = sampleDays - 1; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    // 模擬真實走勢波動（8 月至 9 月降息預期與市場情緒演進）
    const t = (sampleDays - i) / sampleDays;
    const us10y = Math.round((3.95 - t * 0.1 + Math.sin(i) * 0.03) * 100) / 100;
    const us2y = Math.round((4.15 - t * 0.17 + Math.cos(i) * 0.04) * 100) / 100;
    const yieldSpread = Math.round((us10y - us2y) * 100) / 100;
    const vix = Math.round((21.5 - t * 2.1 + Math.sin(i * 1.5) * 1.2) * 10) / 10;
    const fearGreed = Math.round(42 + t * 6 + Math.cos(i) * 3);
    const goldPrice = Math.round((2470 + t * 45 + Math.sin(i) * 8) * 10) / 10;
    const oilPrice = Math.round((77.5 - t * 3.7 + Math.cos(i) * 1.1) * 10) / 10;
    const dxy = Math.round((102.8 - t * 1.4 + Math.sin(i) * 0.3) * 10) / 10;
    const usdToTwd = Math.round((32.35 - t * 0.2 + Math.cos(i) * 0.05) * 100) / 100;

    records.push({
      id: dateStr,
      date: dateStr,
      us10y,
      us2y,
      yieldSpread,
      isYieldInverted: yieldSpread < 0,
      vix,
      vixLevel: vix >= 30 ? 'PANIC' : vix >= 20 ? 'ELEVATED' : 'NORMAL',
      fearAndGreedIndex: fearGreed,
      fearAndGreedLevel: fearGreed >= 75 ? 'EXTREME_GREED' : fearGreed >= 55 ? 'GREED' : fearGreed <= 25 ? 'EXTREME_FEAR' : fearGreed <= 45 ? 'FEAR' : 'NEUTRAL',
      goldPrice,
      oilPrice,
      dxy,
      usdToTwd,
      usM2GrowthYoY: 2.3,
      twM2GrowthYoY: 5.6,
      updatedAt: d.getTime(),
    });
  }


  localStorage.setItem(MACRO_PULSE_STORAGE_KEY, JSON.stringify(records));
}
