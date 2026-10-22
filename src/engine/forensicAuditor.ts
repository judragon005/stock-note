/**
 * 法務會計排雷審計引擎 (Forensic Auditor Engine)
 * 嚴格遵循美台法人法務會計檢驗標準：
 * 1. 應收與存貨剪刀差真 YoY 比對 (排除淡旺季誤判)
 * 2. 獲利純度 (CFO / NI)
 * 3. 自由現金流檢驗 (良性資本擴張期辨識)
 * 4. 負債結構檢驗 (IFRS 16 租賃負債過濾，有息負債優先)
 * 5. 實戰每股淨現金與安全邊際
 */

import type { QuarterlyFinancialRecord } from '../types/financialForensic';

export interface ForensicAuditInput {
  latestRecord?: QuarterlyFinancialRecord;
  chronological: QuarterlyFinancialRecord[];
  isFinancialStock: boolean;
  sharesOutstanding?: number;
  directorPledgeRatio?: number;
  insiderTransferShares?: number;
}

export type ForensicCheckStatus = 'PASS' | 'WARNING' | 'ALERT' | 'CAPEX_EXPANSION';

export interface ForensicCheckItem {
  id: string;
  title: string;
  status: ForensicCheckStatus;
  isAlert: boolean;
  desc: string;
  comparisonType?: 'YOY' | 'QOQ' | 'SINGLE';
  filteredIfrs16?: boolean;
  isNetCashCompany?: boolean;
  netCashPerShare?: number;
}

export function evaluateForensicWarnings({
  latestRecord,
  chronological,
  isFinancialStock,
  sharesOutstanding,
  directorPledgeRatio,
  insiderTransferShares,
}: ForensicAuditInput): ForensicCheckItem[] {
  const cur = latestRecord || (chronological.length > 0 ? chronological[chronological.length - 1] : undefined);
  if (!cur) return [];

  // 1. 應收帳款與存貨剪刀差：嚴格尋找去年同期季度 (YoY)
  const yoyRecord = chronological.find(
    (r) => r.year === cur.year - 1 && r.quarter === cur.quarter
  );
  // 若無去年同期（資料未滿 5 季），降級回前一筆
  const prevRecord = yoyRecord || (chronological.length >= 2 ? chronological[chronological.length - 2] : null);
  const compType: 'YOY' | 'QOQ' = yoyRecord ? 'YOY' : 'QOQ';

  const curRev = cur.income?.revenue || 0;
  const prevRev = prevRecord?.income?.revenue || 0;
  const revGrowth = prevRecord && prevRev > 0 ? (curRev - prevRev) / prevRev : 0;

  // 1-1. 應收帳款剪刀差
  const curAr = cur.balanceSheet?.accountsReceivable || 0;
  const prevAr = prevRecord?.balanceSheet?.accountsReceivable || 0;
  const arGrowth = prevRecord && prevAr > 0 ? (curAr - prevAr) / prevAr : 0;

  const isScissorRisk = !!(prevRecord && arGrowth - revGrowth > 0.2);

  // 1-2. 存貨積壓風險
  const curInv = cur.balanceSheet?.inventory || 0;
  const prevInv = prevRecord?.balanceSheet?.inventory || 0;
  const invGrowth = prevRecord && prevInv > 0 ? (curInv - prevInv) / prevInv : 0;
  const isInvRisk = !!(prevRecord && curInv > 0 && invGrowth - revGrowth > 0.25);

  // 2. 獲利純度檢測 (CFO / NI)
  const cfo = cur.cashFlow?.operatingCashFlow || 0;
  const ni = cur.income?.netIncome || 0;
  let cfoStatus: ForensicCheckStatus = 'PASS';
  let cfoRatioText = '-';
  if (ni > 0) {
    const ratio = (cfo / ni) * 100;
    cfoRatioText = `${ratio.toFixed(0)}%`;
    if (ratio < 80) {
      cfoStatus = 'ALERT';
    } else if (ratio < 100) {
      cfoStatus = 'WARNING';
    }
  } else if (cfo < 0) {
    cfoStatus = 'ALERT';
  }

  // 3. 自由現金流檢驗 (過濾高額 Capex 的良性擴張期)
  const recent2 = chronological.slice(-2);
  const fcfNegativeCount = recent2.filter(
    (r) => (r.cashFlow?.operatingCashFlow || 0) - (r.cashFlow?.capitalExpenditure || 0) < 0
  ).length;

  let fcfStatus: ForensicCheckStatus = 'PASS';
  let fcfAlert = false;
  let fcfDesc = '自由現金流自主造血正常：營運產生之現金足以覆蓋資本支出，具備健全自體造血機能';

  if (recent2.length >= 2 && fcfNegativeCount === 2) {
    // 檢查是否為良性資本擴張期：近 2 季營運現金流 CFO 皆為正且強勁，主要因 Capex 投資過高導致 FCF 為負
    const isCfoRobust = recent2.every((r) => (r.cashFlow?.operatingCashFlow || 0) > 0);
    const hasHeavyCapex = recent2.every(
      (r) => (r.cashFlow?.capitalExpenditure || 0) > (r.cashFlow?.operatingCashFlow || 0) * 0.8
    );

    if (isCfoRobust && hasHeavyCapex) {
      fcfStatus = 'CAPEX_EXPANSION';
      fcfAlert = false; // 良性擴張，不亮致命紅燈
      fcfDesc = '🚀 良性資本擴張期：營運現金流 (CFO) 充沛強勁，係因大額資本支出建廠或產能擴張致自由現金流暫時為負，非本業失血！';
    } else {
      fcfStatus = 'ALERT';
      fcfAlert = true;
      fcfDesc = '自由現金流連續失血：近 2 季自由現金流持續為負，企業需仰賴舉債或現增維持運作';
    }
  }

  // 4. 負債結構檢驗 (IFRS 16 租賃過濾)
  const totalLiabilities = cur.balanceSheet?.totalLiabilities || 0;
  const totalAssets = cur.balanceSheet?.totalAssets || 0;
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

  const shortDebt = cur.balanceSheet?.shortTermDebt;
  const longDebt = cur.balanceSheet?.longTermDebt;
  const hasInterestBearingDebt = typeof shortDebt === 'number' && typeof longDebt === 'number';

  let isDebtRisk = false;
  let filteredIfrs16 = false;
  let debtDesc = '';

  if (isFinancialStock) {
    debtDesc = '金融保險業受高槓桿資產負債特性豁免，由資本適足率 (BIS) 與逾放比監管';
  } else if (hasInterestBearingDebt) {
    const interestBearingDebt = shortDebt + longDebt;
    const interestDebtRatio = totalAssets > 0 ? (interestBearingDebt / totalAssets) * 100 : 0;
    isDebtRisk = interestDebtRatio > 45;
    filteredIfrs16 = true;
    debtDesc = isDebtRisk
      ? `金融有息負債偏高：實質借款負債比達 ${interestDebtRatio.toFixed(1)}% (> 45%)，償債利息負擔重（已過濾 IFRS 16 租賃負債）`
      : `資本結構健全：實質金融借款比率僅 ${interestDebtRatio.toFixed(1)}%，無立即流動性償債危機（已過濾 IFRS 16 租賃負債）`;
  } else {
    isDebtRisk = debtRatio > 70;
    debtDesc = isDebtRisk
      ? `財務槓桿偏高：總負債比率達 ${debtRatio.toFixed(1)}% (> 70%)，抗景氣逆風緩衝空間狹窄（含租賃等經營性負債）`
      : `資本結構合理：總負債比率為 ${debtRatio.toFixed(1)}%，處於合理安全邊際內`;
  }

  // 5. 每股淨現金 (Net-Net Cash)
  const cash = cur.balanceSheet?.cashAndEquivalents || 0;
  const totalDebtForNet = hasInterestBearingDebt
    ? (shortDebt || 0) + (longDebt || 0)
    : totalLiabilities * 0.4; // 保守估算
  const netCash = cash - totalDebtForNet;
  const shares = sharesOutstanding && sharesOutstanding > 0 ? sharesOutstanding : 1;
  const netCashPerShare = Number((netCash / shares).toFixed(2));
  const isNetCashCompany = netCash > 0;

  const checks: ForensicCheckItem[] = [
    {
      id: 'ar_scissor',
      title: '應收帳款剪刀差',
      status: isScissorRisk ? 'ALERT' : 'PASS',
      isAlert: isScissorRisk,
      comparisonType: compType,
      desc: isScissorRisk
        ? `剪刀差警訊 (${compType})：應收帳款增速 (${(arGrowth * 100).toFixed(1)}%) 顯著超越營收增速 (${(revGrowth * 100).toFixed(1)}%)，提防塞貨或認列虛增營收`
        : `營收與應收帳款增長匹配正常（營收 ${compType}: ${(revGrowth * 100).toFixed(1)}%，應收 ${compType}: ${(arGrowth * 100).toFixed(1)}%）`,
    },
    {
      id: 'inv_scissor',
      title: '存貨週轉壓力',
      status: isInvRisk ? 'ALERT' : 'PASS',
      isAlert: isInvRisk,
      comparisonType: compType,
      desc: isInvRisk
        ? `存貨積壓警訊 (${compType})：存貨增速 (${(invGrowth * 100).toFixed(1)}%) 遠超營收增速，恐面臨存貨跌價與滯銷打銷損失`
        : curInv === 0
        ? '無顯著實體存貨風險（輕資產或無存貨型商業模式）'
        : `存貨水平健康（營收 ${compType}: ${(revGrowth * 100).toFixed(1)}%，存貨 ${compType}: ${(invGrowth * 100).toFixed(1)}%），未見異常庫存囤積`,
    },
    {
      id: 'cfo_quality',
      title: '營業現金流獲利純度',
      status: cfoStatus,
      isAlert: cfoStatus === 'ALERT',
      desc:
        cfoStatus === 'ALERT'
          ? `獲利純度不足：營業現金流僅佔稅後淨利 ${cfoRatioText} (< 80%)，獲利多停留在帳面未轉化為真實真金白銀`
          : `獲利純度優良：營業現金流充足 (${cfoRatioText})，淨利具備高度現金轉化率`,
    },
    {
      id: 'fcf_health',
      title: '自由現金流造血能力',
      status: fcfStatus,
      isAlert: fcfAlert,
      desc: fcfDesc,
    },
    {
      id: 'debt_structure',
      title: '負債結構與償債壓力',
      status: isDebtRisk ? 'ALERT' : 'PASS',
      isAlert: isDebtRisk,
      filteredIfrs16,
      desc: debtDesc,
    },
    {
      id: 'net_cash',
      title: '每股淨現金 (Net-Net Cash)',
      status: isNetCashCompany ? 'PASS' : 'WARNING',
      isAlert: false,
      isNetCashCompany,
      netCashPerShare,
      desc: isNetCashCompany
        ? `防守堡壘：現金及約當現金扣除金融借款後，每股淨現金達 ${netCashPerShare} 元，具備極強清算安全邊際與抗危機能力`
        : `資本週轉型：每股淨現金為 ${netCashPerShare} 元，企業維持正常借貸槓桿營運`,
    },
  ];

  // 6. 董監事股權質押風控雷達 (Ticket 12)
  if (typeof directorPledgeRatio === 'number') {
    const isHighPledge = directorPledgeRatio >= 40;
    const isMediumPledge = directorPledgeRatio >= 20;
    checks.push({
      id: 'director_pledge',
      title: '董監事股權質押風控雷達',
      status: isHighPledge ? 'ALERT' : isMediumPledge ? 'WARNING' : 'PASS',
      isAlert: isHighPledge,
      desc: isHighPledge
        ? `⚠️ 董監質押高危險斷頭警戒：最新董監事持股質押比率達 ${directorPledgeRatio.toFixed(1)}% (門檻 >= 40%)，一旦股價下挫觸發維持率下限，恐遭金融機構斷頭連續跌停拋售`
        : isMediumPledge
        ? `董監持股質押比率為 ${directorPledgeRatio.toFixed(1)}% (介於 20%~40%)，經營階層資金偏緊，需密切留意市場波動`
        : `董監持股質押比率僅 ${directorPledgeRatio.toFixed(1)}%，大股東籌碼極為安定穩健`,
    });
  }

  // 7. 內部人大量申報轉讓檢驗
  if (typeof insiderTransferShares === 'number' && insiderTransferShares >= 500) {
    checks.push({
      id: 'insider_transfer',
      title: '內部人持股大量申報轉讓',
      status: 'WARNING',
      isAlert: false,
      desc: `高管大額減持警示：近月董監或內部人申報轉讓持股達 ${insiderTransferShares} 張 (>= 500張)，籌碼出現鬆動徵兆`,
    });
  }

  return checks;
}
