import React from 'react';
import type { QuarterlyFinancialRecord } from '../../types/financialForensic';
import { evaluateForensicWarnings } from '../../engine/forensicAuditor';

interface ForensicWarningSectionProps {
  latestRecord?: QuarterlyFinancialRecord;
  chronological: QuarterlyFinancialRecord[];
  isFinancialStock: boolean;
  sharesOutstanding?: number;
  directorPledgeRatio?: number;
  insiderTransferShares?: number;
}

/**
 * 法務會計排雷防雷燈模組 (Forensic Accounting Radar)
 * 嚴格遵循法人法務會計跨表勾稽準則：
 * 1. 應收帳款剪刀差 (真 YoY 比對，淡旺季防誤報)
 * 2. 存貨週轉壓力 (真 YoY 比對)
 * 3. 獲利純度檢驗 (CFO / NI)
 * 4. 自由現金流造血能力 (標註良性資本擴張期)
 * 5. 負債結構檢驗 (過濾 IFRS 16 租賃虛胖，優先檢驗金融有息負債)
 * 6. 每股淨現金安全邊際 (Net-Net Cash Per Share)
 * 7. 董監事股權質押風控雷達 (>40% 斷頭風險紅燈)
 */
export const ForensicWarningSection: React.FC<ForensicWarningSectionProps> = ({
  latestRecord,
  chronological,
  isFinancialStock,
  sharesOutstanding,
  directorPledgeRatio,
  insiderTransferShares,
}) => {
  const checks = evaluateForensicWarnings({
    latestRecord,
    chronological,
    isFinancialStock,
    sharesOutstanding,
    directorPledgeRatio,
    insiderTransferShares,
  });

  const warningCount = checks.filter((c) => c.isAlert).length;
  const expansionCount = checks.filter((c) => c.status === 'CAPEX_EXPANSION').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>法務會計五大排雷排毒燈</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            依據美台法人法務會計 (Forensic Accounting) 跨表勾稽準則，主動排查財報造假與粉飾徵兆
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {expansionCount > 0 && (
            <div
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                fontWeight: 700,
                fontSize: '12px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
                border: '1px solid rgba(59, 130, 246, 0.4)',
              }}
            >
              🚀 良性資本擴張中
            </div>
          )}
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
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
        {checks.map((c, i) => {
          let badgeText = '綠燈安全';
          let badgeColor = '#10b981';
          let badgeBg = '#10b98120';

          if (c.status === 'ALERT') {
            badgeText = '紅燈警戒';
            badgeColor = '#ef4444';
            badgeBg = '#ef444420';
          } else if (c.status === 'WARNING') {
            badgeText = '黃燈留意';
            badgeColor = '#f59e0b';
            badgeBg = '#f59e0b20';
          } else if (c.status === 'CAPEX_EXPANSION') {
            badgeText = '良性擴張';
            badgeColor = '#3b82f6';
            badgeBg = '#3b82f620';
          }

          return (
            <div
              key={c.id || c.title}
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
                    background: badgeBg,
                    color: badgeColor,
                  }}
                >
                  {badgeText}
                </span>
              </div>
              <p
                style={{
                  fontSize: '12px',
                  color: c.isAlert ? '#ef4444' : 'var(--text-secondary)',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {c.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
