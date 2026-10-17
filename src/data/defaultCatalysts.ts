import { UpcomingCatalyst } from '../types/macro';
import { generatePeriodicCatalysts } from '../engine/periodicCatalystEngine';

/**
 * 2026 ~ 2027 年官方排定之重磅財經前瞻種子庫
 */
export const OFFICIAL_FORWARD_CATALYSTS: Omit<UpcomingCatalyst, 'daysLeft'>[] = [
  // --- 2026 Q4 ---
  {
    id: 'fomc-2026-11',
    name: 'FOMC 聯準會利率決議',
    date: '2026-11-05',
    category: 'CENTRAL_BANK',
    impact: 'HIGH',
    targetMarket: 'US',
    description: '美國第四季貨幣政策路徑，降息節奏與量化緊縮 (QT) 水位評估。',
  },
  {
    id: 'pce-2026-10',
    name: '美國 9 月核心 PCE 物價指數公布',
    date: '2026-10-30',
    category: 'INFLATION',
    impact: 'HIGH',
    targetMarket: 'US',
    description: '聯準會最偏好之通膨指標，直接決定 11 月 FOMC 降息碼數。',
  },
  {
    id: 'gdp-2026-11',
    name: '美國 Q3 GDP 季增年率修正值',
    date: '2026-11-25',
    category: 'EMPLOYMENT',
    impact: 'MEDIUM',
    targetMarket: 'US',
    description: '檢視實體經濟韌性與軟著陸可能性，市場修正景氣衰退預期。',
  },
  {
    id: 'fomc-2026-12',
    name: 'FOMC 年終利率決議與經濟預測點陣圖',
    date: '2026-12-17',
    category: 'CENTRAL_BANK',
    impact: 'HIGH',
    targetMarket: 'US',
    description: '公布 2027 年終極利率點陣圖 (Dot Plot) 與中長期經濟成長展望。',
  },
  {
    id: 'cbc-2026-12',
    name: '台灣央行 Q4 理監事聯席會議',
    date: '2026-12-17',
    category: 'CENTRAL_BANK',
    impact: 'HIGH',
    targetMarket: 'TW',
    description: '評估台灣通膨、不動產選擇性信用管制實施成效與台美利差走勢。',
  },

  // --- 2027 Q1 ---
  {
    id: 'fomc-2027-01',
    name: 'FOMC 新春首場利率決議',
    date: '2027-01-28',
    category: 'CENTRAL_BANK',
    impact: 'HIGH',
    targetMarket: 'US',
    description: '定調 2027 年全年貨幣寬鬆步調與資產負債表常態化進展。',
  },
  {
    id: 'fomc-2027-03',
    name: 'FOMC 第一季利率決議與點陣圖',
    date: '2027-03-18',
    category: 'CENTRAL_BANK',
    impact: 'HIGH',
    targetMarket: 'US',
    description: '更新春季點陣圖，市場重新定價上半年降息或維持中性利率機率。',
  },
  {
    id: 'cbc-2027-03',
    name: '台灣央行 2027 年 Q1 理監事會議',
    date: '2027-03-25',
    category: 'CENTRAL_BANK',
    impact: 'HIGH',
    targetMarket: 'TW',
    description: '檢討全年經濟成長率預估與央行存單流動性調節。',
  },
];

/**
 * 自適應前瞻種子滾動生成器
 * 結合官方排定前瞻種子庫與純演算法之常態金融週期（台指結算/四巫日/非農/CPI）
 * 保證無論時間如何推移，永遠提供未來 30~60 天內的標準重大宏觀節點
 */
export function generateRollingSeedCatalysts(
  asOfDateStr: string = new Date().toISOString().split('T')[0]
): Omit<UpcomingCatalyst, 'daysLeft'>[] {
  const periodicList = generatePeriodicCatalysts(asOfDateStr, 2);

  // 合併官方排程與常態演算法事件
  const allCandidates: Omit<UpcomingCatalyst, 'daysLeft'>[] = [
    ...OFFICIAL_FORWARD_CATALYSTS,
    ...periodicList,
  ];

  // 去重並按日期由近至遠排序
  const seenKeys = new Set<string>();
  const uniqueList: Omit<UpcomingCatalyst, 'daysLeft'>[] = [];

  for (const item of allCandidates) {
    const key = `${item.date}_${item.category}_${item.name}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueList.push(item);
    }
  }

  // 僅返回日期大於或等於 asOfDateStr 的未來或當日事件
  const validFutureList = uniqueList
    .filter((c) => c.date >= asOfDateStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  // 極限兜底防禦：若未來事件不足 4 筆，擴大常態週期至未來 4 個月
  if (validFutureList.length < 4) {
    const extendedPeriodic = generatePeriodicCatalysts(asOfDateStr, 4);
    for (const item of extendedPeriodic) {
      const key = `${item.date}_${item.category}_${item.name}`;
      if (!seenKeys.has(key) && item.date >= asOfDateStr) {
        seenKeys.add(key);
        validFutureList.push(item);
      }
    }
    validFutureList.sort((a, b) => a.date.localeCompare(b.date));
  }

  return validFutureList;
}
