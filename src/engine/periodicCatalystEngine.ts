import { UpcomingCatalyst } from '../types/macro';

/**
 * 依據年份、月份、目標星期與序號，精確推算日期 (YYYY-MM-DD)
 * @param year 西元年
 * @param month 月份 (1 ~ 12)
 * @param targetDayOfWeek 0 (日) ~ 6 (六)
 * @param n 第幾個星期 (1 ~ 5)
 */
export function getNthDayOfWeek(
  year: number,
  month: number,
  targetDayOfWeek: number,
  n: number
): string {
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCMonth() !== month - 1) break;
    if (d.getUTCDay() === targetDayOfWeek) {
      count++;
      if (count === n) {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${dayStr}`;
      }
    }
  }
  throw new Error(`無法在 ${year}-${month} 找到第 ${n} 個星期 ${targetDayOfWeek}`);
}

/** 每月第三個星期三 (台指期/選擇權月結算日) */
export function getThirdWednesday(year: number, month: number): string {
  return getNthDayOfWeek(year, month, 3, 3);
}

/** 每月第三個星期五 (美股選擇權月結算 / 季末四巫日) */
export function getThirdFriday(year: number, month: number): string {
  return getNthDayOfWeek(year, month, 5, 3);
}

/** 每月第一個星期五 (美國非農就業報告 NFP) */
export function getFirstFriday(year: number, month: number): string {
  return getNthDayOfWeek(year, month, 5, 1);
}

/** 每月第二個星期三 (美國 CPI 通膨公布估計日程) */
export function getSecondWednesday(year: number, month: number): string {
  return getNthDayOfWeek(year, month, 3, 2);
}

/**
 * 動態推算基準日起算未來數個月份之確定性常態金融週期事件
 * @param asOfDateStr 基準日 (YYYY-MM-DD)
 * @param lookaheadMonths 向前推算之月數 (預設 2 個月)
 */
export function generatePeriodicCatalysts(
  asOfDateStr: string = new Date().toISOString().split('T')[0],
  lookaheadMonths: number = 2
): Omit<UpcomingCatalyst, 'daysLeft'>[] {
  const parts = asOfDateStr.split('-');
  let currentYear = parseInt(parts[0], 10);
  let currentMonth = parseInt(parts[1], 10);

  const results: Omit<UpcomingCatalyst, 'daysLeft'>[] = [];

  for (let i = 0; i <= lookaheadMonths; i++) {
    let y = currentYear;
    let m = currentMonth + i;
    while (m > 12) {
      y += 1;
      m -= 12;
    }

    const monthStr = `${y}-${String(m).padStart(2, '0')}`;

    // 1. 台指期貨月結算日 (每月第三個週三)
    const txDate = getThirdWednesday(y, m);
    results.push({
      id: `periodic-tx-settle-${monthStr}`,
      name: `${m} 月台指期貨暨選擇權月結算`,
      date: txDate,
      category: 'DERIVATIVE_SETTLEMENT',
      impact: 'HIGH',
      targetMarket: 'TW',
      description: '台指期現貨巨額未平倉最後結算，外資與主力換倉洗盤關鍵日。',
    });

    // 2. 美股衍生品結算 (每月第三個週五，其中 3/6/9/12 為四巫日)
    const usOptDate = getThirdFriday(y, m);
    const isWitching = [3, 6, 9, 12].includes(m);
    results.push({
      id: `periodic-us-witching-${monthStr}`,
      name: isWitching ? `美股 ${m} 月四巫日 (Quadruple Witching)` : `美股 ${m} 月選擇權月結算`,
      date: usOptDate,
      category: 'DERIVATIVE_SETTLEMENT',
      impact: 'HIGH',
      targetMarket: 'US',
      description: isWitching
        ? '指數期貨、指數選擇權、個股期貨與個股選擇權四大衍生品同步到期，引發美股成交量與波動度急遽放大。'
        : '月度選擇權未平倉履約合約結算，留意尾盤 Gamma 擠壓與巨額換手。',
    });

    // 3. 美國非農就業報告公布日 (每月第一個週五)
    const nfpDate = getFirstFriday(y, m);
    results.push({
      id: `periodic-nfp-${monthStr}`,
      name: `美國 ${m} 月非農就業報告 (NFP) 與失業率`,
      date: nfpDate,
      category: 'EMPLOYMENT',
      impact: 'HIGH',
      targetMarket: 'US',
      description: '檢驗美國就業市場健康度與工資成長率，聯準會利率路徑核心依據。',
    });

    // 4. 美國 CPI 通膨估算日 (每月第二個週三)
    const cpiDate = getSecondWednesday(y, m);
    results.push({
      id: `periodic-cpi-${monthStr}`,
      name: `美國 ${m} 月 CPI 消費者物價指數公布`,
      date: cpiDate,
      category: 'INFLATION',
      impact: 'HIGH',
      targetMarket: 'US',
      description: '核心通膨黏滯度與物價趨勢關鍵檢驗，直接牽動公債殖利率與科技股估值。',
    });
  }

  return results;
}
