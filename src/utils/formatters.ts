import { Currency, MarketType, TradeRecord } from '../types/stock';

/**
 * 銀行家捨入法 (Banker's Rounding / Round Half to Even / 奇進偶捨)
 * 符合 IEEE 754 與美國證券會計 (US GAAP / Charles Schwab) 標準
 * 當小數精確處於中間點 (.5) 時向最接近的偶數捨入，消除累積正向統計偏差
 */
export function bankersRound(num: number, decimalPlaces: number = 2): number {
  if (isNaN(num)) return 0;
  const factor = Math.pow(10, decimalPlaces);
  const n = num * factor;
  const i = Math.floor(n);
  const f = n - i;
  const epsilon = 1e-8;

  if (Math.abs(f - 0.5) < epsilon) {
    return (i % 2 === 0 ? i : i + 1) / factor;
  }
  return Math.round(n) / factor;
}

/**
 * 依據券商與集保慣例計算股息現金總額
 * - 台股 (TWD): 依台灣集保/券商慣例無條件捨去至整數 (Math.floor)，嚴格與美股隔離
 * - 美股 (USD): 依美股券商標準銀行家捨入法 (Banker's Rounding) 保留 2 位小數 (Cents)
 */
export function calculateDividendCash(shares: number, pricePerShare: number, currency: Currency): number {
  if (shares <= 0 || pricePerShare <= 0) return 0;

  if (currency === 'USD') {
    return bankersRound(shares * pricePerShare, 2);
  }

  // 預設台股採無條件捨去至整數
  return Math.floor(shares * pricePerShare);
}

/**
 * 依據幣別標準化數值精度
 * - TWD: Math.floor 整數
 * - USD: 銀行家捨入法 (Banker's Rounding) 保留 2 位小數
 */
export function normalizeCurrencyPrecision(amount: number, currency: Currency): number {
  if (isNaN(amount)) return 0;

  if (currency === 'USD') {
    return bankersRound(amount, 2);
  }

  return Math.floor(amount);
}

/**
 * 幣別金額字串格式化
 * - TWD: 'NT$ 22,303'
 * - USD: '$4.78 USD' 或 '$1,234.50 USD'
 */
export function formatCurrencyAmount(amount: number, currency: Currency): string {
  const safeAmount = Number(amount) || 0;

  if (currency === 'USD') {
    const fixedVal = bankersRound(safeAmount, 2).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `$${fixedVal} USD`;
  }

  const floorVal = Math.floor(safeAmount);
  return `NT$ ${floorVal.toLocaleString('en-US')}`;
}

/**
 * 格式化時間軸上的現金股利描述
 * 輸出格式範例：
 * - 台股: '配發股息 NT$ 22,303'
 * - 美股: '配發股息 $4.78 USD'
 */
export function formatTimelineDividend(trade: TradeRecord): string {
  const currency: Currency = trade.currency || (trade.market === 'US' ? 'USD' : 'TWD');
  let rawAmount = 0;

  if (trade.cashAmount !== undefined && trade.cashAmount > 0) {
    rawAmount = trade.cashAmount;
  } else if (trade.price > 0 && trade.shares > 0) {
    rawAmount = calculateDividendCash(trade.shares, trade.price, currency);
  }

  return `配發股息 ${formatCurrencyAmount(rawAmount, currency)}`;
}

/**
 * 格式化時間軸上的減資退款描述
 * 輸出格式範例：
 * - 台股: '減 200 股 (退還 NT$ 2,000)'
 */
export function formatTimelineReduction(trade: TradeRecord): string {
  const currency: Currency = trade.currency || (trade.market === 'US' ? 'USD' : 'TWD');
  const rawAmount = trade.cashAmount || (trade.price > 0 && trade.shares > 0 ? trade.shares * trade.price : 0);
  const formattedCash = formatCurrencyAmount(rawAmount, currency);
  return `減 ${trade.shares} 股 (退還 ${formattedCash})`;
}

/**
 * 格式化股數 (支援美股碎股小數，台股整數)
 */
export function formatSharesCount(shares: number, market?: MarketType): string {
  if (market === 'US') {
    // 美股最多顯示 4 位小數，並去除尾隨 0
    return Number(shares.toFixed(4)).toString();
  }
  return Math.round(shares).toLocaleString('en-US');
}

/**
 * 依據標的代碼特徵智能推斷市場別 (TW 或 US)
 * - 若帶有 .US 後綴或純英文字母 (如 AAPL, NVDA, VT)，推斷為美股 ('US')
 * - 若為 4~6 碼數字 (如 2330, 0050, 00878) 或台股標的，推斷為台股 ('TW')
 */
export function inferMarketFromSymbol(symbol: string): MarketType {
  const clean = (symbol || '').trim().toUpperCase();
  if (!clean) return 'TW';
  if (clean.endsWith('.US') || /^[A-Z]{1,6}$/.test(clean)) {
    return 'US';
  }
  return 'TW';
}

/**
 * 依據市場別推斷預設幣別 (TW -> TWD, US -> USD)
 */
export function inferCurrencyFromMarket(market: MarketType): Currency {
  return market === 'US' ? 'USD' : 'TWD';
}
