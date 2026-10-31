import { MacroIndicatorSnapshot, MacroPinnedStrategy } from '../types/macro';

export const MACRO_PULSE_STORAGE_KEY = 'STOCK_TRACKER_MACRO_PULSE_HISTORY_V1';
export const MACRO_STRATEGY_PINS_STORAGE_KEY = 'stock_tracker_macro_strategy_pins_v1';

export interface MacroPulseHistoryRecord extends MacroIndicatorSnapshot {
  id: string; // YYYY-MM-DD
  isManual?: boolean;
}

/**
 * 判定給定快取時間戳記是否為同日有效（同一自然日且非零，防止跨日數據過期）
 */
export function isSameDayCacheValid(
  lastUpdatedTimestamp: number,
  nowTimestamp: number = Date.now()
): boolean {
  if (!lastUpdatedTimestamp || lastUpdatedTimestamp <= 0) return false;
  const lastDate = new Date(lastUpdatedTimestamp).toISOString().split('T')[0];
  const currentDate = new Date(nowTimestamp).toISOString().split('T')[0];
  return lastDate === currentDate;
}

/**
 * 輔助函式：安全提取純數值標量 (Primitive Number)，若遇行情物件則自動拆包取 .price
 */
export function toFiniteScalarNumber(val: unknown, fallback: number): number {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (
    val &&
    typeof val === 'object' &&
    'price' in val &&
    typeof (val as { price: unknown }).price === 'number' &&
    Number.isFinite((val as { price: number }).price)
  ) {
    return (val as { price: number }).price;
  }
  return fallback;
}

/**
 * 升級相容清洗：將可能缺少新增欄位之歷史快照安全補齊，防止 undefined 導致白屏崩潰
 */
export function sanitizeMacroRecord(
  raw: Partial<MacroIndicatorSnapshot>
): MacroIndicatorSnapshot {
  const us10y = toFiniteScalarNumber(raw.us10y, 3.85);
  const us2y = toFiniteScalarNumber(raw.us2y, 3.98);
  const rawSpread =
    typeof raw.yieldSpread === 'number'
      ? raw.yieldSpread
      : Math.round((us10y - us2y) * 100) / 100;
  const isYieldInverted =
    raw.isYieldInverted !== undefined ? raw.isYieldInverted : rawSpread < 0;

  const creditSpreadOAS = typeof raw.creditSpreadOAS === 'number' ? raw.creditSpreadOAS : 3.5;
  const cdsInsuranceIndex =
    typeof raw.cdsInsuranceIndex === 'number' ? raw.cdsInsuranceIndex : 65;
  const cdsRiskLevel =
    raw.cdsRiskLevel ??
    (creditSpreadOAS >= 5.0 || cdsInsuranceIndex >= 90 ? 'HIGH' : 'LOW');

  const twFuturesNetOi = typeof raw.twFuturesNetOi === 'number' ? raw.twFuturesNetOi : -15000;
  const twMarginMaintenance =
    typeof raw.twMarginMaintenance === 'number' ? raw.twMarginMaintenance : 165.0;
  const twFuturesRiskLevel =
    raw.twFuturesRiskLevel ??
    (twFuturesNetOi <= -45000
      ? 'EXTREME_SHORT'
      : twFuturesNetOi <= -30000
      ? 'HIGH_ALERT'
      : 'NEUTRAL');
  const twMarginRiskLevel =
    raw.twMarginRiskLevel ??
    (twMarginMaintenance < 130
      ? 'LIQUIDATION_RISK'
      : twMarginMaintenance < 140
      ? 'WARNING'
      : 'SAFE');

  return {
    date: raw.date || new Date().toISOString().split('T')[0],
    us10y,
    us2y,
    us3m: typeof raw.us3m === 'number' ? raw.us3m : undefined,
    yieldSpread: rawSpread,
    isYieldInverted,
    vix: toFiniteScalarNumber(raw.vix, 18.0),
    vixLevel: raw.vixLevel || 'NORMAL',
    fearAndGreedIndex: typeof raw.fearAndGreedIndex === 'number' ? raw.fearAndGreedIndex : 50,
    fearAndGreedLevel: raw.fearAndGreedLevel || 'NEUTRAL',
    goldPrice: toFiniteScalarNumber(raw.goldPrice, 3350.0),
    oilPrice: toFiniteScalarNumber(raw.oilPrice, 75.0),
    dxy: toFiniteScalarNumber(raw.dxy, 101.5),
    usdToTwd: toFiniteScalarNumber(raw.usdToTwd, 32.0),
    usM2GrowthYoY: raw.usM2GrowthYoY ?? 2.1,
    twM2GrowthYoY: raw.twM2GrowthYoY ?? 5.5,
    usFedRate: raw.usFedRate,
    usCpiYoY: raw.usCpiYoY,
    creditSpreadOAS,
    cdsInsuranceIndex,
    cdsRiskLevel,
    twFuturesNetOi,
    twMarginMaintenance,
    twFuturesRiskLevel,
    twMarginRiskLevel,
    soxIndex: raw.soxIndex,
    soxChangePercent: raw.soxChangePercent,
    soxBias20Ma: raw.soxBias20Ma,
    soxAbove20Ma: raw.soxAbove20Ma,
    soxAbove60Ma: raw.soxAbove60Ma,
    tsmAdrPrice: raw.tsmAdrPrice,
    tsmAdrChangePercent: raw.tsmAdrChangePercent,
    tsmTwPrice: raw.tsmTwPrice,
    tsmAdrConvertedTwd: raw.tsmAdrConvertedTwd,
    tsmAdrPremiumPercent: raw.tsmAdrPremiumPercent,
    taiexIndex: raw.taiexIndex,
    taiexChangePercent: raw.taiexChangePercent,
    taiexBias20Ma: raw.taiexBias20Ma,
    taiexAbove20Ma: raw.taiexAbove20Ma,
    taiexAbove60Ma: raw.taiexAbove60Ma,
    sp500Index: raw.sp500Index,
    sp500ChangePercent: raw.sp500ChangePercent,
    sp500Bias20Ma: raw.sp500Bias20Ma,
    nasdaqIndex: raw.nasdaqIndex,
    nasdaqChangePercent: raw.nasdaqChangePercent,
    nasdaqBias20Ma: raw.nasdaqBias20Ma,
    twMarketBreadth: raw.twMarketBreadth
      ? {
          ...raw.twMarketBreadth,
          pctAbove20MA:
            raw.twMarketBreadth.pctAbove20MA ??
            (raw.twMarketBreadth as any).pctAbove20Ma ??
            (raw.twMarketBreadth as any).above20MaPercent,
          pctAbove20Ma:
            (raw.twMarketBreadth as any).pctAbove20Ma ??
            raw.twMarketBreadth.pctAbove20MA,
        }
      : undefined,
    twInstitutionalSpot: raw.twInstitutionalSpot,
    asOfTimestamp: raw.asOfTimestamp,
    sourceStatus: raw.sourceStatus,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
  };
}

/**
 * 從本地持久化儲存載入全量市場四柱歷史快照 (依日期由新至舊排序，並經過自動清洗升級)
 */
export function loadMacroPulseHistory(): MacroPulseHistoryRecord[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MACRO_PULSE_STORAGE_KEY);
    if (!raw) return [];
    const parsed: Partial<MacroPulseHistoryRecord>[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((p) => ({
        ...sanitizeMacroRecord(p),
        id: p.date || new Date().toISOString().split('T')[0],
        isManual: p.isManual,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch (e) {
    console.error('Failed to load macro pulse history:', e);
    return [];
  }
}

export const loadMacroHistory = loadMacroPulseHistory;

/**
 * 儲存或更新單日市場四柱紀錄 (冪等去重，以 date 為唯一鍵值)
 */
export function saveMacroPulseRecord(snapshot: MacroIndicatorSnapshot, isManual = false): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const history = loadMacroPulseHistory();
    const existingIdx = history.findIndex((h) => h.date === snapshot.date);
    const newRecord: MacroPulseHistoryRecord = {
      ...sanitizeMacroRecord(snapshot),
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
 * Zero-Mock 政策 (Spec 0209 Ticket 02)：
 * 徹底移除舊版正弦波假歷史產生器，僅回傳本地已儲存之真實歷史快照（無歷史則回傳空陣列 []）。
 */
export function generateSampleHistoricalMacroData(): MacroPulseHistoryRecord[] {
  return loadMacroPulseHistory();
}

/**
 * 載入外部 AI 宏觀戰略釘選清單 (Spec 0209 Ticket 10)
 */
export function loadMacroPinnedStrategies(): MacroPinnedStrategy[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MACRO_STRATEGY_PINS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is MacroPinnedStrategy =>
        Boolean(item && typeof item.id === 'string' && typeof item.aiModel === 'string')
    );
  } catch (e) {
    console.error('Failed to load macro pinned strategies:', e);
    return [];
  }
}

/**
 * 儲存或更新外部 AI 宏觀戰略釘選（按 aiModel 名稱不分大小寫去重覆蓋，預設 7 天效期）
 */
export function saveMacroPinnedStrategy(
  pin: Omit<MacroPinnedStrategy, 'id' | 'pinnedAt' | 'expiresAt'> &
    Partial<Pick<MacroPinnedStrategy, 'id' | 'pinnedAt' | 'expiresAt'>>
): MacroPinnedStrategy[] {
  try {
    const current = loadMacroPinnedStrategies();
    const normalizedModel = (pin.aiModel || 'External AI').trim() || 'External AI';
    const nowMs = Date.now();
    const pinnedAt = pin.pinnedAt || new Date(nowMs).toISOString();
    const expiresAt =
      pin.expiresAt || new Date(nowMs + 7 * 24 * 60 * 60 * 1000).toISOString();

    const clampedCap = Math.max(
      0,
      Math.min(100, Math.round(Number(pin.recommendedEquityCapPercent) || 50))
    );

    const existingIdx = current.findIndex(
      (item) => item.aiModel.trim().toLowerCase() === normalizedModel.toLowerCase()
    );

    const record: MacroPinnedStrategy = {
      id:
        pin.id ||
        (existingIdx >= 0
          ? current[existingIdx].id
          : `macro-pin-${nowMs}-${Math.random().toString(36).slice(2, 7)}`),
      aiModel: existingIdx >= 0 ? current[existingIdx].aiModel : normalizedModel,
      recommendedEquityCapPercent: clampedCap,
      soxSupportLevel:
        typeof pin.soxSupportLevel === 'number' && Number.isFinite(pin.soxSupportLevel)
          ? pin.soxSupportLevel
          : undefined,
      taiexSupportLevel:
        typeof pin.taiexSupportLevel === 'number' && Number.isFinite(pin.taiexSupportLevel)
          ? pin.taiexSupportLevel
          : undefined,
      tacticalSummary: (pin.tacticalSummary || '').trim(),
      pinnedAt,
      expiresAt,
    };

    if (existingIdx >= 0) {
      current.splice(existingIdx, 1);
    }
    current.unshift(record);

    localStorage.setItem(MACRO_STRATEGY_PINS_STORAGE_KEY, JSON.stringify(current));
    return current;
  } catch (e) {
    console.error('Failed to save macro pinned strategy:', e);
    return [];
  }
}

/**
 * 移除指定 ID 之外部 AI 宏觀戰略釘選
 */
export function removeMacroPinnedStrategy(id: string): MacroPinnedStrategy[] {
  try {
    const filtered = loadMacroPinnedStrategies().filter((item) => item.id !== id);
    localStorage.setItem(MACRO_STRATEGY_PINS_STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (e) {
    console.error('Failed to remove macro pinned strategy:', e);
    return [];
  }
}

/**
 * 解析外部 LLM 回覆文字中之 Loopback 戰略 JSON 區塊 (Spec 0209 Ticket 10)
 */
export function parseMacroLoopbackJson(
  rawText: string
): Partial<MacroPinnedStrategy> | null {
  if (!rawText || typeof rawText !== 'string') return null;

  const candidates: string[] = [];
  const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch?.[1]) {
    candidates.push(codeBlockMatch[1].trim());
  }

  const braceStart = rawText.indexOf('{');
  const braceEnd = rawText.lastIndexOf('}');
  if (braceStart >= 0 && braceEnd > braceStart) {
    candidates.push(rawText.slice(braceStart, braceEnd + 1));
  }

  for (const candidate of candidates) {
    try {
      const obj = JSON.parse(candidate);
      if (
        obj &&
        typeof obj === 'object' &&
        (obj.recommendedEquityCapPercent !== undefined ||
          typeof obj.tacticalSummary === 'string')
      ) {
        const capNum = Number(obj.recommendedEquityCapPercent);
        const soxNum = Number(obj.soxSupportLevel);
        const taiexNum = Number(obj.taiexSupportLevel);
        return {
          aiModel:
            typeof obj.aiModel === 'string' && obj.aiModel.trim()
              ? obj.aiModel.trim()
              : 'External AI',
          recommendedEquityCapPercent: Number.isFinite(capNum)
            ? Math.max(0, Math.min(100, Math.round(capNum)))
            : undefined,
          soxSupportLevel:
            Number.isFinite(soxNum) && soxNum > 0 ? soxNum : undefined,
          taiexSupportLevel:
            Number.isFinite(taiexNum) && taiexNum > 0 ? taiexNum : undefined,
          tacticalSummary:
            typeof obj.tacticalSummary === 'string'
              ? obj.tacticalSummary.trim()
              : undefined,
        };
      }
    } catch {
      // 嘗試下一個候選區段
    }
  }

  return null;
}
