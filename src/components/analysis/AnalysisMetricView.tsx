import React, { useState, useMemo } from 'react';
import {
  FileText,
  Sliders,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import type { QuarterlyFinancialRecord } from '../../types/financialForensic';
import {
  calculatePiotroskiFScore,
  calculateFcfYield,
  calculatePeterLynchValuation,
  calculateDcfValuation,
  calculateDdmValuation,
} from '../../engine/keyMetricsEngine';
import { calculateTurnoverMetrics } from '../../engine/financialTurnoverEngine';
import { formatFinancialAmount } from '../../utils/formatters';

interface AnalysisMetricViewProps {
  primaryTab: string;
  subTab: string;
  records: QuarterlyFinancialRecord[];
  currentPrice: number;
  annualDividends: { year: number; amount: number }[];
  stockName: string;
  symbol: string;
}

export const AnalysisMetricView: React.FC<AnalysisMetricViewProps> = ({
  primaryTab: _primaryTab,
  subTab,
  records,
  currentPrice,
  annualDividends,
  stockName,
  symbol,
}) => {
  // DCF 互動滑桿狀態 (Ticket 26)
  const [dcfWacc, setDcfWacc] = useState<number>(0.09);
  const [dcfGrowth, setDcfGrowth] = useState<number>(0.025);

  // 排序由舊到新方便走勢圖渲染 (最近 20 季)
  const chronological = useMemo(() => {
    return [...records]
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.quarter - b.quarter;
      })
      .slice(-20);
  }, [records]);

  const latestRecord = chronological[chronological.length - 1];

  // 1. Piotroski F-Score 計算
  const piotroskiRes = useMemo(() => {
    return calculatePiotroskiFScore(records);
  }, [records]);

  // 2. FCF Yield 計算
  const fcfYield = useMemo(() => {
    return latestRecord ? calculateFcfYield(latestRecord, currentPrice) : 0;
  }, [latestRecord, currentPrice]);

  // 3. 彼得林區計算
  const lynchRes = useMemo(() => {
    return calculatePeterLynchValuation(records, currentPrice);
  }, [records, currentPrice]);

  // 4. DCF 計算
  const dcfRes = useMemo(() => {
    return calculateDcfValuation(records, currentPrice, {
      waccRate: dcfWacc,
      perpetualGrowthRate: dcfGrowth,
    });
  }, [records, currentPrice, dcfWacc, dcfGrowth]);

  // 5. DDM 計算
  const ddmRes = useMemo(() => {
    return calculateDdmValuation(annualDividends, currentPrice);
  }, [annualDividends, currentPrice]);

  // 6. 最新營運天數
  const turnoverMetrics = useMemo(() => {
    return latestRecord ? calculateTurnoverMetrics(latestRecord) : null;
  }, [latestRecord]);

  // 渲染柱狀走勢圖輔助函數
  const renderSimpleBars = (
    data: { label: string; value: number; displayValue: string; isNegative?: boolean }[],
    color = '#3b82f6'
  ) => {
    if (!data || data.length === 0) {
      return <div style={{ color: 'var(--text-secondary)', padding: '24px' }}>暫無歷史季報數據</div>;
    }

    const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.value)));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '8px',
            height: '200px',
            paddingTop: '20px',
            borderBottom: '1px solid var(--border-color)',
            overflowX: 'auto',
          }}
        >
          {data.map((d, idx) => {
            const hPct = Math.min(100, Math.max(8, (Math.abs(d.value) / maxAbs) * 100));
            const isLoss = d.isNegative || d.value < 0;
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: '40px',
                  flex: 1,
                  height: '100%',
                  justifyContent: 'flex-end',
                }}
              >
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono, monospace)',
                    color: isLoss ? '#ef4444' : 'var(--text-secondary)',
                    marginBottom: '4px',
                  }}
                >
                  {d.displayValue}
                </span>
                <div
                  style={{
                    width: '100%',
                    maxWidth: '32px',
                    height: `${hPct}%`,
                    borderRadius: '4px 4px 0 0',
                    background: isLoss ? '#ef4444' : color,
                    transition: 'height 0.2s ease',
                  }}
                />
                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-secondary)',
                    marginTop: '6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ==================== 1. 財務報表模組 ==================== */}
      {subTab === 'eps' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>每股盈餘 (EPS) 20 季趨勢</h3>
          {renderSimpleBars(
            chronological.map((r) => {
              const eps = r.income?.eps || 0;
              return {
                label: `${r.year % 100}Q${r.quarter}`,
                value: eps,
                displayValue: `${eps.toFixed(2)}`,
              };
            }),
            '#3b82f6'
          )}
        </div>
      )}

      {subTab === 'bvps' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>每股淨值 (BVPS) 走勢</h3>
          {renderSimpleBars(
            chronological.map((r) => {
              const equity = r.balanceSheet?.totalEquity || 0;
              const bvps = Number((equity / 10000000).toFixed(2));
              return {
                label: `${r.year % 100}Q${r.quarter}`,
                value: bvps,
                displayValue: `${bvps}`,
              };
            }),
            '#10b981'
          )}
        </div>
      )}

      {subTab === 'income_statement' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>損益表核心科目 (營收與毛利)</h3>
          {renderSimpleBars(
            chronological.map((r) => {
              const rev = r.income?.revenue || 0;
              return {
                label: `${r.year % 100}Q${r.quarter}`,
                value: rev,
                displayValue: formatFinancialAmount(rev),
              };
            }),
            '#6366f1'
          )}
        </div>
      )}

      {subTab === 'total_assets' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>總資產規模變化</h3>
          {renderSimpleBars(
            chronological.map((r) => {
              const assets = r.balanceSheet?.totalAssets || 0;
              return {
                label: `${r.year % 100}Q${r.quarter}`,
                value: assets,
                displayValue: formatFinancialAmount(assets),
              };
            }),
            '#0284c7'
          )}
        </div>
      )}

      {subTab === 'liabilities_equity' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>負債與股東權益分佈</h3>
          {renderSimpleBars(
            chronological.map((r) => {
              const liab = r.balanceSheet?.totalLiabilities || 0;
              return {
                label: `${r.year % 100}Q${r.quarter}`,
                value: liab,
                displayValue: formatFinancialAmount(liab),
              };
            }),
            '#f59e0b'
          )}
        </div>
      )}

      {subTab === 'cash_flow' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>營業現金流 (CFO) 雙向瀑布</h3>
          {renderSimpleBars(
            chronological.map((r) => {
              const cfo = r.cashFlow?.operatingCashFlow || 0;
              return {
                label: `${r.year % 100}Q${r.quarter}`,
                value: cfo,
                displayValue: formatFinancialAmount(cfo),
                isNegative: cfo < 0,
              };
            }),
            '#10b981'
          )}
        </div>
      )}

      {subTab === 'dividend_policy' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>歷年股利配發紀錄</h3>
          {renderSimpleBars(
            annualDividends.map((d) => ({
              label: `${d.year}年`,
              value: d.amount,
              displayValue: `${d.amount.toFixed(2)}元`,
            })),
            '#f59e0b'
          )}
        </div>
      )}

      {subTab === 'reports_pdf' && (
        <div style={{ textAlign: 'center', padding: '32px' }}>
          <FileText size={48} style={{ color: 'var(--accent-primary, #3b82f6)', margin: '0 auto 12px auto' }} />
          <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 8px 0' }}>公開資訊觀測站電子書與季報</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            點擊可直接前往臺灣證券交易所公開資訊觀測站，查閱 {stockName} ({symbol}) 經會計師審計之正式財報 PDF。
          </p>
          <a
            href={`https://mops.twse.com.tw/mops/web/t05st03?step=1&firstin=1&off=1&keyword4=&code1=&TYPEK=all&check=&code=&co_id=${symbol}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'var(--accent-primary, #3b82f6)',
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '13px',
            }}
          >
            開啟公開資訊觀測站 <ExternalLink size={14} />
          </a>
        </div>
      )}

      {/* ==================== 2. 獲利能力模組 ==================== */}
      {subTab === 'margins_trio' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>毛利率走勢 (Profit Margin)</h3>
          {renderSimpleBars(
            chronological.map((r) => {
              const rev = r.income?.revenue || 1;
              const gross = r.income?.grossProfit || 0;
              const pct = Number(((gross / rev) * 100).toFixed(1));
              return {
                label: `${r.year % 100}Q${r.quarter}`,
                value: pct,
                displayValue: `${pct}%`,
              };
            }),
            '#3b82f6'
          )}
        </div>
      )}

      {subTab === 'dupont' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>杜邦分析三因子拆解 (DuPont Model)</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
            }}
          >
            <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>1. 稅後淨利率</span>
              <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px' }}>
                {latestRecord && latestRecord.income?.revenue
                  ? `${(((latestRecord.income?.netIncome ?? 0) / latestRecord.income.revenue) * 100).toFixed(1)}%`
                  : '0.0%'}
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>2. 總資產週轉率</span>
              <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px' }}>
                {latestRecord && latestRecord.balanceSheet?.totalAssets
                  ? `${((latestRecord.income?.revenue ?? 0) / latestRecord.balanceSheet.totalAssets).toFixed(2)}x`
                  : '0.0x'}
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>3. 權益乘數 (槓桿)</span>
              <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px' }}>
                {latestRecord && latestRecord.balanceSheet?.totalEquity
                  ? `${((latestRecord.balanceSheet?.totalAssets ?? 0) / latestRecord.balanceSheet.totalEquity).toFixed(2)}x`
                  : '1.0x'}
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'turnover_days' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>營運週轉天數 (DSO & DIO)</h3>
          {turnoverMetrics && (
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>應收帳款天數 (DSO):</span>
                <strong style={{ fontSize: '16px', marginLeft: '6px' }}>{turnoverMetrics.dsoDays} 天</strong>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>存貨週轉天數 (DIO):</span>
                <strong style={{ fontSize: '16px', marginLeft: '6px' }}>{turnoverMetrics.dioDays} 天</strong>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>現金轉換週期 (CCC):</span>
                <strong style={{ fontSize: '16px', marginLeft: '6px' }}>{turnoverMetrics.cccDays} 天</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== 3. 安全性分析模組 ==================== */}
      {subTab === 'liquidity_ratios' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>流動比率 (Current Ratio) 20 季走勢</h3>
          {renderSimpleBars(
            chronological.map((r) => {
              const ca = (r.balanceSheet?.cashAndEquivalents ?? 0) + (r.balanceSheet?.accountsReceivable ?? 0) + (r.balanceSheet?.inventory ?? 0);
              const cl = (r.balanceSheet?.totalLiabilities ?? 0) * 0.5 || 1;
              const ratio = Number(((ca / cl) * 100).toFixed(0));
              return {
                label: `${r.year % 100}Q${r.quarter}`,
                value: ratio,
                displayValue: `${ratio}%`,
                isNegative: ratio < 100,
              };
            }),
            '#10b981'
          )}
        </div>
      )}

      {subTab === 'cfo_to_net_income' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>營業現金流對淨利比 (CFO / Net Income)</h3>
          {renderSimpleBars(
            chronological.map((r) => {
              const cfo = r.cashFlow?.operatingCashFlow || 0;
              const net = r.income?.netIncome || 1;
              const ratio = Number(((cfo / Math.abs(net)) * 100).toFixed(0));
              return {
                label: `${r.year % 100}Q${r.quarter}`,
                value: ratio,
                displayValue: `${ratio}%`,
                isNegative: ratio < 100,
              };
            }),
            '#6366f1'
          )}
        </div>
      )}

      {/* ==================== 4. 成長力分析模組 ==================== */}
      {(subTab === 'revenue_growth' || subTab === 'eps_growth') && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>
            {subTab === 'revenue_growth' ? '營收同期年成長率 (YoY)' : 'EPS 同期年成長率 (YoY)'}
          </h3>
          {renderSimpleBars(
            chronological.slice(4).map((r, idx) => {
              const prev = chronological[idx];
              const currVal = subTab === 'revenue_growth' ? r.income?.revenue ?? 0 : r.income?.eps ?? 0;
              const prevVal = subTab === 'revenue_growth' ? prev?.income?.revenue ?? 1 : prev?.income?.eps ?? 1;
              const yoy = prevVal !== 0 ? Number((((currVal - prevVal) / Math.abs(prevVal)) * 100).toFixed(1)) : 0;
              return {
                label: `${r.year % 100}Q${r.quarter}`,
                value: yoy,
                displayValue: `${yoy > 0 ? '+' : ''}${yoy}%`,
                isNegative: yoy < 0,
              };
            }),
            '#ec4899'
          )}
        </div>
      )}

      {/* ==================== 5. 關鍵指標與估值模型模組 ==================== */}
      {/* 22: Piotroski F-Score */}
      {subTab === 'piotroski_f' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Piotroski F-Score (9 分量化評分卡)</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                {piotroskiRes.summary}
              </p>
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 900,
                fontFamily: 'var(--font-mono, monospace)',
                color: piotroskiRes.totalScore >= 7 ? '#10b981' : piotroskiRes.totalScore >= 4 ? '#f59e0b' : '#ef4444',
              }}
            >
              {piotroskiRes.totalScore} <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>/ 9 分</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
            {Object.values(piotroskiRes.details).map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {item.actualDesc}
                  </div>
                </div>
                {item.passed ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '12px', fontWeight: 700 }}>
                    <CheckCircle2 size={16} /> 1分
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '12px', fontWeight: 700 }}>
                    <XCircle size={16} /> 0分
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 23: FCF Yield */}
      {subTab === 'fcf_yield' && (
        <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>自由現金流報酬率 (FCF Yield)</span>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#10b981', margin: '8px 0' }}>
            {fcfYield.toFixed(2)}%
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
            每股所創造的實質自由現金流除以當前股價。若高於 6% 代表防守安全邊際極高。
          </p>
        </div>
      )}

      {/* 25: 彼得林區評價 */}
      {subTab === 'peter_lynch' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>彼得林區評價 (Peter Lynch Fair Value & PEG)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>合理內在價值 (Fair Value)</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {lynchRes.fairValue} 元
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>PEG 本益成長比</span>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: lynchRes.pegRatio < 1.0 ? '#10b981' : lynchRes.pegRatio > 1.8 ? '#ef4444' : '#f59e0b',
                  marginTop: '4px',
                }}
              >
                {lynchRes.pegRatio} ({lynchRes.assessment === 'UNDERVALUED' ? '低估' : lynchRes.assessment === 'OVERVALUED' ? '高估' : '合理'})
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 26: DCF 現金流折現估值模型 (附互動滑桿) */}
      {subTab === 'dcf_valuation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>DCF 現金流折現估值模型 (Discounted Cash Flow)</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              以未來 5 年自由現金流預測結合永續價值進行貼現，支援互動滑桿即時求解每股合理價。
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              background: 'var(--bg-secondary)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>DCF 每股內在價值 (Intrinsic Value)</span>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#10b981', marginTop: '4px' }}>
                {dcfRes.intrinsicValue} 元
              </div>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>當前股價安全邊際 (Margin of Safety)</span>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: dcfRes.marginOfSafetyPct > 0 ? '#10b981' : '#ef4444',
                  marginTop: '4px',
                }}
              >
                {dcfRes.marginOfSafetyPct > 0 ? `折價 ${dcfRes.marginOfSafetyPct}% (低估)` : `溢價 ${Math.abs(dcfRes.marginOfSafetyPct)}% (偏貴)`}
              </div>
            </div>
          </div>

          {/* 互動滑桿控制面板 */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              padding: '20px',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700 }}>
              <Sliders size={16} style={{ color: 'var(--accent-primary, #3b82f6)' }} /> 參數即時試算滑桿
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span>折現率 (WACC / 要求回報率):</span>
                <strong style={{ fontFamily: 'var(--font-mono, monospace)' }}>{(dcfWacc * 100).toFixed(1)}%</strong>
              </div>
              <input
                type="range"
                min="0.06"
                max="0.15"
                step="0.005"
                value={dcfWacc}
                onChange={(e) => {
                  const nextWacc = parseFloat(e.target.value);
                  setDcfWacc(nextWacc);
                  if (dcfGrowth >= nextWacc - 0.01) {
                    setDcfGrowth(Number(Math.max(0.01, nextWacc - 0.01).toFixed(3)));
                  }
                }}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span>永續成長率 (Terminal Growth Rate):</span>
                <strong style={{ fontFamily: 'var(--font-mono, monospace)' }}>{(dcfGrowth * 100).toFixed(1)}%</strong>
              </div>
              <input
                type="range"
                min="0.01"
                max={Math.max(0.01, Math.min(0.05, Number((dcfWacc - 0.01).toFixed(3))))}
                step="0.005"
                value={dcfGrowth}
                onChange={(e) => setDcfGrowth(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 27: DDM 股利折現模型 */}
      {subTab === 'ddm_valuation' && (
        <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>戈登股利折現合理價 (DDM Fair Value)</span>
          <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-primary)', margin: '8px 0' }}>
            {ddmRes.fairValue > 0 ? `${ddmRes.fairValue} 元` : '不適用'}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto', lineHeight: 1.6 }}>
            {ddmRes.fairValue > 0 ? (
              <>
                以連續穩定發放之現金股利推估內在價值。評定為：
                <strong style={{ color: ddmRes.assessment === 'UNDERVALUED' ? '#10b981' : '#f59e0b', marginLeft: '4px' }}>
                  {ddmRes.assessment === 'UNDERVALUED' ? '具投資安全邊際 (低估)' : '評價合理'}
                </strong>
              </>
            ) : (
              '本標的暫無歷史現金配息紀錄（或屬於不配息之高速擴張成長股），建議切換至彼得林區 PEG 或 DCF 現金流折現模型進行估值。'
            )}
          </p>
        </div>
      )}
    </div>
  );
};
