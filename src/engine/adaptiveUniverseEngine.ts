/**
 * 自適應動態成分股引擎與存活探針 (v8.33.0)
 * 負責 Stale-While-Revalidate 分級動態成分股快取、後備候選庫自動遞補、每日開市校準與存活探針
 */
import { MarketType } from '../types/stock';
import {
  AssetPoolType,
  TW50_BLUE_CHIP_SYMBOLS,
  US_MEGA_50_CORE_SYMBOLS,
  TW_TOP_30_FOCUS_SYMBOLS,
  US_TOP_30_FOCUS_SYMBOLS,
} from './muscleBookerEngine';
import {
  getDynamicUniverseStorage,
  saveDynamicUniverseStorage,
  DynamicUniverseStorageData,
} from '../utils/storage';
import { isBusinessDay } from './holidayCalendar';
import { fetchWithCORSProxy } from './priceFetcher';
import { logger } from '../utils/logger';

export interface UniverseItem {
  symbol: string;
  name: string;
  market: MarketType;
  basePrice?: number;
}

export interface ReplacedSymbolRecord {
  oldSymbol: string;
  newSymbol: string;
  newName: string;
  poolKey: string;
  reason: string;
}

export interface UniverseSyncResult {
  hasChanges: boolean;
  checkedDate: string;
  replacedSymbols: ReplacedSymbolRecord[];
  summaryMessage: string;
}

export interface CheckAndSyncOptions {
  force?: boolean;
  todayStr?: string;
  probeFn?: (symbol: string, market: MarketType) => Promise<boolean>;
  poolsToCheck?: ('TW50_CORE' | 'US_MEGA_50_CORE' | 'TW_TOP_30_FOCUS' | 'US_TOP_30_FOCUS')[];
}

/**
 * 台股優質權值後備候選庫 (Reserve Candidates Pool)
 * 用於當 0050 或焦點 30 成分股剔除、下市或更名時，自動依序遞補以維持滿編
 */
export const TW_RESERVE_CANDIDATES: UniverseItem[] = [
  { symbol: '2308', name: '台達電', market: 'TW', basePrice: 400 },
  { symbol: '2303', name: '聯電', market: 'TW', basePrice: 45 },
  { symbol: '2886', name: '兆豐金', market: 'TW', basePrice: 40 },
  { symbol: '2884', name: '玉山金', market: 'TW', basePrice: 28 },
  { symbol: '3711', name: '日月光投控', market: 'TW', basePrice: 160 },
  { symbol: '2412', name: '中華電', market: 'TW', basePrice: 125 },
  { symbol: '2892', name: '第一金', market: 'TW', basePrice: 28 },
  { symbol: '5880', name: '合庫金', market: 'TW', basePrice: 26 },
  { symbol: '2885', name: '元大金', market: 'TW', basePrice: 32 },
  { symbol: '2383', name: '台光電', market: 'TW', basePrice: 480 },
  { symbol: '2890', name: '永豐金', market: 'TW', basePrice: 24 },
  { symbol: '2880', name: '華南金', market: 'TW', basePrice: 26 },
  { symbol: '3034', name: '聯詠', market: 'TW', basePrice: 520 },
  { symbol: '2395', name: '研華', market: 'TW', basePrice: 350 },
  { symbol: '3045', name: '台灣大', market: 'TW', basePrice: 110 },
];

/**
 * 美股標普大型巨頭後備候選庫 (Reserve Candidates Pool)
 * 用於當美股 Top 50 或焦點 30 成分股剔除、下市或更名時，自動依序遞補以維持滿編
 */
export const US_RESERVE_CANDIDATES: UniverseItem[] = [
  { symbol: 'CRM', name: '賽富時 Salesforce', market: 'US', basePrice: 260 },
  { symbol: 'TXN', name: '德州儀器 Texas Instruments', market: 'US', basePrice: 205 },
  { symbol: 'LIN', name: '林德 Linde', market: 'US', basePrice: 460 },
  { symbol: 'ACN', name: '埃森哲 Accenture', market: 'US', basePrice: 340 },
  { symbol: 'CSCO', name: '思科 Cisco', market: 'US', basePrice: 50 },
  { symbol: 'ADBE', name: 'Adobe', market: 'US', basePrice: 560 },
  { symbol: 'CVX', name: '雪佛龍 Chevron', market: 'US', basePrice: 145 },
  { symbol: 'MRK', name: '默克 Merck', market: 'US', basePrice: 118 },
  { symbol: 'WFC', name: '富國銀行 Wells Fargo', market: 'US', basePrice: 56 },
  { symbol: 'MCD', name: '麥當勞 McDonald\'s', market: 'US', basePrice: 290 },
  { symbol: 'ABT', name: '亞培 Abbott', market: 'US', basePrice: 115 },
  { symbol: 'IBM', name: 'IBM', market: 'US', basePrice: 210 },
  { symbol: 'GE', name: '奇異 GE Aerospace', market: 'US', basePrice: 185 },
  { symbol: 'NOW', name: 'ServiceNow', market: 'US', basePrice: 860 },
  { symbol: 'AMAT', name: '應用材料 Applied Materials', market: 'US', basePrice: 200 },
  { symbol: 'CAT', name: '卡特彼勒 Caterpillar', market: 'US', basePrice: 360 },
  { symbol: 'ISRG', name: '直覺外科 Intuitive Surgical', market: 'US', basePrice: 480 },
  { symbol: 'MS', name: '摩根士丹利 Morgan Stanley', market: 'US', basePrice: 102 },
  { symbol: 'AXP', name: '美國運通 American Express', market: 'US', basePrice: 255 },
];

/**
 * 取得靜態種子清單 (Baseline Seed fallback)
 */
function getStaticSeedForPool(poolKey: string): UniverseItem[] {
  switch (poolKey) {
    case 'TW50_CORE':
      return TW50_BLUE_CHIP_SYMBOLS;
    case 'US_MEGA_50_CORE':
      return US_MEGA_50_CORE_SYMBOLS;
    case 'TW_TOP_30_FOCUS':
      return TW_TOP_30_FOCUS_SYMBOLS;
    case 'US_TOP_30_FOCUS':
      return US_TOP_30_FOCUS_SYMBOLS;
    default:
      return [];
  }
}

/**
 * 讀取動態目標池清單：優先從快取讀取，無快取時回退至靜態種子常數
 */
function getUniverseForPoolKey(poolKey: string): UniverseItem[] {
  const cached = getDynamicUniverseStorage(poolKey);
  if (cached && cached.symbols && cached.symbols.length > 0) {
    return cached.symbols;
  }
  return getStaticSeedForPool(poolKey);
}

/**
 * 核心獲取介面：依據市場與資產池取得生效之最新動態成分股清單
 */
export function getEffectiveUniverse(
  market: 'ALL' | MarketType = 'ALL',
  pool: AssetPoolType = 'TOP30_FOCUS'
): UniverseItem[] {
  if (pool === 'TW50_CORE') {
    if (market === 'US') return getUniverseForPoolKey('US_MEGA_50_CORE');
    return getUniverseForPoolKey('TW50_CORE');
  }

  if (pool === 'TOP30_FOCUS') {
    if (market === 'US') return getUniverseForPoolKey('US_TOP_30_FOCUS');
    if (market === 'TW') return getUniverseForPoolKey('TW_TOP_30_FOCUS');
    return [
      ...getUniverseForPoolKey('TW_TOP_30_FOCUS'),
      ...getUniverseForPoolKey('US_TOP_30_FOCUS'),
    ];
  }

  // 其他如 HOLDINGS 或自訂清單回傳空陣列，由工作區自身狀態處理
  return [];
}

/**
 * 預設存活探針實現：向公開 API 請求 1 日輕量報價，若回傳 404 或資料損毀判定為失效
 */
export async function defaultProbeFn(symbol: string, market: MarketType): Promise<boolean> {
  const yahooSymbol = market === 'TW' ? `${symbol}.TW` : symbol;
  const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`;
  try {
    const data = await fetchWithCORSProxy(targetUrl, 3000);
    if (!data || !data.chart || !data.chart.result || data.chart.result.length === 0) {
      return false;
    }
    return true;
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (msg.includes('404') || msg.includes('Not Found')) {
      return false;
    }
    // 若為網路超時或暫時性代理錯誤，不輕易誤殺標的，預設保守視為存活
    logger.warn(`Liveness probe transient error for ${symbol}:`, err);
    return true;
  }
}

/**
 * 存活探針 (Liveness Probe)：檢查指定標的是否依然在市活躍
 */
export async function probeSymbolLiveness(
  symbol: string,
  market: MarketType,
  probeFn?: (symbol: string, market: MarketType) => Promise<boolean>
): Promise<boolean> {
  const fn = probeFn || defaultProbeFn;
  return fn(symbol, market);
}

/**
 * 自動替換與遞補 (Heal & Replace Inactive Symbol)
 * 當標的被探針證實失效 (404/下市)，自動自後備候選池中挑選未重複標的替換，維持總檔數滿編
 */
export function healInactiveSymbolInPool(
  poolKey: string,
  inactiveSymbol: string,
  reason: string = '代碼不存在或已更名下市'
): { oldSymbol: string; newSymbol: string; newName: string } | null {
  const currentSymbols = [...getUniverseForPoolKey(poolKey)];
  const targetIndex = currentSymbols.findIndex((s) => s.symbol === inactiveSymbol);
  if (targetIndex === -1) {
    return null;
  }

  const isUsPool = poolKey.startsWith('US_');
  const market: MarketType = isUsPool ? 'US' : 'TW';
  const reserveCandidates = isUsPool ? US_RESERVE_CANDIDATES : TW_RESERVE_CANDIDATES;

  // 既有名單已存在的 symbol 集合
  const existingSet = new Set(currentSymbols.map((s) => s.symbol));

  // 從後備庫中挑選第一檔不在現有名單中的標的
  const candidate = reserveCandidates.find((c) => !existingSet.has(c.symbol));
  if (!candidate) {
    logger.error(`No candidate available in reserve pool for ${poolKey}`);
    return null;
  }

  // 替換失效標的
  const replacedItem: UniverseItem = {
    symbol: candidate.symbol,
    name: candidate.name,
    market,
    basePrice: candidate.basePrice,
  };
  currentSymbols[targetIndex] = replacedItem;

  // 讀取既有失效清單
  const existingStorage = getDynamicUniverseStorage(poolKey);
  const inactiveSet = new Set(existingStorage?.inactiveSymbols || []);
  inactiveSet.add(inactiveSymbol);

  const updatedStorage: DynamicUniverseStorageData = {
    poolKey,
    symbols: currentSymbols,
    lastCheckedDate: existingStorage?.lastCheckedDate || new Date().toISOString().split('T')[0],
    version: (existingStorage?.version || 1) + 1,
    inactiveSymbols: Array.from(inactiveSet),
    updatedAt: Date.now(),
  };

  saveDynamicUniverseStorage(poolKey, updatedStorage);

  logger.info(
    `[AdaptiveUniverse] Successfully replaced ${inactiveSymbol} with ${candidate.symbol} (${candidate.name}) in ${poolKey}. Reason: ${reason}`
  );

  return {
    oldSymbol: inactiveSymbol,
    newSymbol: candidate.symbol,
    newName: candidate.name,
  };
}

/**
 * 每日開市前背景自動校準管線 (Daily Pre-Market Auto-Sync Pipeline)
 */
export async function checkAndSyncUniverseDaily(
  options: CheckAndSyncOptions = {}
): Promise<UniverseSyncResult> {
  const todayStr = options.todayStr || new Date().toISOString().split('T')[0];
  const force = options.force ?? false;
  const probeFn = options.probeFn || defaultProbeFn;
  const poolsToCheck = options.poolsToCheck || [
    'TW_TOP_30_FOCUS',
    'US_TOP_30_FOCUS',
    'TW50_CORE',
    'US_MEGA_50_CORE',
  ];

  const isTwTradingDay = isBusinessDay(todayStr, 'TW');
  const isUsTradingDay = isBusinessDay(todayStr, 'US');

  // 若非交易日且非強制執行，跳過校準
  if (!force && !isTwTradingDay && !isUsTradingDay) {
    return {
      hasChanges: false,
      checkedDate: todayStr,
      replacedSymbols: [],
      summaryMessage: `📅 ${todayStr} 為台美非交易日，跳過成分股背景校準。`,
    };
  }

  // 檢查是否所有目標池今日皆已校準過 (Throttling 節流保護)
  let allPoolsCheckedToday = true;
  for (const poolKey of poolsToCheck) {
    const cached = getDynamicUniverseStorage(poolKey);
    if (!cached || cached.lastCheckedDate !== todayStr) {
      allPoolsCheckedToday = false;
      break;
    }
  }

  if (!force && allPoolsCheckedToday) {
    return {
      hasChanges: false,
      checkedDate: todayStr,
      replacedSymbols: [],
      summaryMessage: `🟢 今日已完成成分股校準 (${todayStr})，維持最新狀態。`,
    };
  }

  const replacedRecords: ReplacedSymbolRecord[] = [];

  // 對各目標池進行存活探針校準
  for (const poolKey of poolsToCheck) {
    const symbols = getUniverseForPoolKey(poolKey);
    const isUsPool = poolKey.startsWith('US_');
    const market: MarketType = isUsPool ? 'US' : 'TW';

    for (const item of symbols) {
      try {
        const isAlive = await probeFn(item.symbol, market);
        if (!isAlive) {
          const replaced = healInactiveSymbolInPool(
            poolKey,
            item.symbol,
            '存活探針檢測 HTTP 404 或無效資料'
          );
          if (replaced) {
            replacedRecords.push({
              oldSymbol: replaced.oldSymbol,
              newSymbol: replaced.newSymbol,
              newName: replaced.newName,
              poolKey,
              reason: '標的無效/下市更名',
            });
          }
        }
      } catch (err) {
        logger.warn(`Probe check failed for ${item.symbol}:`, err);
      }
    }

    // 更新該目標池之 lastCheckedDate
    const currentData = getDynamicUniverseStorage(poolKey);
    const updatedData: DynamicUniverseStorageData = {
      poolKey,
      symbols: currentData ? currentData.symbols : symbols,
      lastCheckedDate: todayStr,
      version: currentData ? currentData.version : 1,
      inactiveSymbols: currentData?.inactiveSymbols,
      updatedAt: Date.now(),
    };
    saveDynamicUniverseStorage(poolKey, updatedData);
  }

  const hasChanges = replacedRecords.length > 0;
  let summaryMessage = `🟢 ${todayStr} 成分股校準完成，全數標的運作正常。`;
  if (hasChanges) {
    const details = replacedRecords
      .map((r) => `[${r.oldSymbol} ➔ ${r.newSymbol} ${r.newName}]`)
      .join('、');
    summaryMessage = `🔔 已自動完成成分股校準：剔除失效標的並自動遞補 ${details}，保持滿編狀態。`;
  }

  return {
    hasChanges,
    checkedDate: todayStr,
    replacedSymbols: replacedRecords,
    summaryMessage,
  };
}
