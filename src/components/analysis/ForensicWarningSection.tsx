import React from 'react';
import type { QuarterlyFinancialRecord } from '../../types/financialForensic';

interface ForensicWarningSectionProps {
  latestRecord?: QuarterlyFinancialRecord;
  chronological: QuarterlyFinancialRecord[];
  isFinancialStock: boolean;
}

/**
 * 法務會計五大排雷排毒燈子模組
 *
 * 依據法人機構法務會計 (Forensic Accounting) 跨表勾稽準則：
 * 1. 應收帳款剪刀差：應收增速與營收增速背離檢測 (塞貨/虛增營收)
 * 2. 獲利純度：營業現金流 (CFO) 與稅後淨利 (NI) 勾稽檢測 (帳面獲利轉化率)
 * 3. 自由現金流造血能力：連續季度 FCF 是否失血
 * 4. 存貨週轉壓力：存貨增速與營收增速偏離度 (滯銷與打銷跌價風險)
 * 5. 股本膨脹與負債結構：負債比率檢測 (金融保險業享豁免)
 */
export const ForensicWarningSection: React.FC<ForensicWarningSectionProps> = ({
  latestRecord,
  chronological,
  isFinancialStock,
}) => {
  const cur = latestRecord;
  const prev = chronological.length >= 2 ? chronological[chronological.length - 2] : null;

  // 1. 應收帳款剪刀差檢測
  const curRev = cur?.income?.revenue || 0;
  const prevRev = prev?.income?.revenue || 0;
  const revGrowth = prev && prevRev > 0 ? (curRev - prevRev) / prevRev : 0;

  const curAr = cur?.balanceSheet?.accountsReceivable || 0;
  const prevAr = prev?.balanceSheet?.accountsReceivable || 0;
  const arGrowth = prev && prevAr > 0 ? (curAr - prevAr) / prevAr : 0;

  const isScissorRisk = !!(prev && arGrowth - revGrowth > 0.2);

  // 2. 獲利純度檢測 (CFO / NI)
  const cfo = cur?.cashFlow?.operatingCashFlow || 0;
  const ni = cur?.income?.netIncome || 0;
  let cfoQualityStatus: 'PASS' | 'WARNING' | 'ALERT' = 'PASS';
  let cfoRatioText = '-';
  if (ni > 0) {
    const ratio = (cfo / ni) * 100;
    cfoRatioText = `${ratio.toFixed(0)}%`;
    if (ratio < 80) {
      cfoQualityStatus = 'ALERT';
    } else if (ratio < 100) {
      cfoQualityStatus = 'WARNING';
    }
  } else if (cfo < 0) {
    cfoQualityStatus = 'ALERT';
  }

  // 3. 自由現金流造血能力 (近 2 季 FCF)
  const recent2 = chronological.slice(-2);
  const fcfNegativeCount = recent2.filter(
    (r) => ((r.cashFlow?.operatingCashFlow || 0) - (r.cashFlow?.capitalExpenditure || 0)) < 0
  ).length;
  const isFcfBleeding = recent2.length >= 2 && fcfNegativeCount === 2;

  // 4. 存貨積壓風險
  const curInv = cur?.balanceSheet?.inventory || 0;
  const prevInv = prev?.balanceSheet?.inventory || 0;
  const invGrowth = prev && prevInv > 0 ? (curInv - prevInv) / prevInv : 0;
  const isInvRisk = !!(prev && curInv > 0 && invGrowth - revGrowth > 0.25);

  // 5. 股本膨脹與負債比率
  const totalLiabilities = cur?.balanceSheet?.totalLiabilities || 0;
  const totalAssets = cur?.balanceSheet?.totalAssets || 0;
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  const isDebtRisk = !isFinancialStock && debtRatio > 70;

  const warningCount = [
    isScissorRisk,
    cfoQualityStatus === 'ALERT',
    isFcfBleeding,
    isInvRisk,
    isDebtRisk,
  ].filter(Boolean).length;

  const checks = [
    {
      title: '應收帳款剪刀差',
      isAlert: isScissorRisk,
      desc: isScissorRisk
        ? `剪刀差警訊：應收帳款增速 (${(arGrowth * 100).toFixed(1)}%) 顯著超越營收增速 (${(revGrowth * 100).toFixed(1)}%)，提防塞貨或認列虛增營收`
        : `營收與應收帳款增長匹配正常（營收 YoY: ${(revGrowth * 100).toFixed(1)}%，應收 YoY: ${(arGrowth * 100).toFixed(1)}%）`,
    },
    {
      title: '營業現金流獲利純度',
      isAlert: cfoQualityStatus === 'ALERT',
      desc: cfoQualityStatus === 'ALERT'
        ? `獲利純度不足：營業現金流僅佔稅後淨利 ${cfoRatioText} (< 80%)，獲利多停留在帳面未轉化為真實真金白銀`
        : `獲利純度優良：營業現金流充足 (${cfoRatioText})，淨利具備高度現金轉化率`,
    },
    {
      title: '自由現金流造血能力',
      isAlert: isFcfBleeding,
      desc: isFcfBleeding
        ? '自由現金流連續失血：近 2 季自由現金流持續為負，企業需仰賴舉債或現增維持運作'
        : '自由現金流自主造血正常：營運產生之現金足以覆蓋資本支出，具備健全自體造血機能',
    },
    {
      title: '存貨週轉壓力',
      isAlert: isInvRisk,
      desc: isInvRisk
        ? `存貨積壓警訊：存貨增速 (${(invGrowth * 100).toFixed(1)}%) 遠超營收增速，恐面臨存貨跌價與滯銷打銷損失`
        : curInv === 0
        ? '無顯著實體存貨風險（輕資產或無存貨型商業模式）'
        : '存貨水平健康，未見異常庫存囤積',
    },
    {
      title: '股本膨脹與負債結構',
      isAlert: isDebtRisk,
      desc: isFinancialStock
        ? '金融保險業受高槓桿資產負債特性豁免，由資本適足率 (BIS) 與逾放比監管'
        : isDebtRisk
        ? `財務槓桿偏高：負債比率達 ${debtRatio.toFixed(1)}% (> 70%)，抗景氣逆風緩衝空間狹窄`
        : `資本結構健康：負債比率為 ${debtRatio.toFixed(1)}%，處於合理安全邊際內`,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>法務會計五大排雷排毒燈</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            嚴格依據美台法務會計 (Forensic Accounting) 跨表勾稽準則，主動排查財報造假與粉飾徵兆
          </p>
        </div>
        <div
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontWeight: 800,
            fontSize: '13px',
            background: warningCount === 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: warningCount === 0 ? '#10b981' : '#ef4444',
            border: `1px solid ${warningCount === 0 ? '#10b98140' : '#ef444440'}`,
          }}
        >
          {warningCount === 0 ? '全數安全無異常 (0 雷點)' : `觸發 ${warningCount} 項排雷警報`}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
        {checks.map((c, i) => (
          <div
            key={c.title}
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: c.isAlert ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-secondary)',
              border: `1px solid ${c.isAlert ? '#ef444450' : 'var(--border-color)'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {i + 1}. {c.title}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: c.isAlert ? '#ef444420' : '#10b98120',
                  color: c.isAlert ? '#ef4444' : '#10b981',
                }}
              >
                {c.isAlert ? '紅燈警戒' : '綠燈安全'}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: c.isAlert ? '#ef4444' : 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              {c.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
