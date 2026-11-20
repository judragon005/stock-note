import React from 'react';
import type { QuarterlyFinancialRecord } from '../../../types/financialForensic';
import type { CompanyDividendPolicyRecord } from '../../../engine/dividendService';
import { deriveSharesOutstanding } from '../../../engine/keyMetricsEngine';
import { renderValuationRiver } from './metricChartPrimitives';

export interface ValuationMultiplesSectionProps {
  subTab: string;
  chronological: QuarterlyFinancialRecord[];
  latestRecord?: QuarterlyFinancialRecord;
  currentPrice: number;
  companyDividends: CompanyDividendPolicyRecord[];
  isUsMarket: boolean;
  isCyclicalStock: boolean;
  valuationRiverQuarterlyClosePrices: (number | null)[];
  valuation?: {
    pe?: number | null;
    pb?: number | null;
    dividendYield?: number | null;
  };
}

export const ValuationMultiplesSection: React.FC<ValuationMultiplesSectionProps> = ({
  subTab,
  chronological,
  latestRecord,
  currentPrice,
  companyDividends,
  isUsMarket,
  isCyclicalStock,
  valuationRiverQuarterlyClosePrices,
  valuation,
}) => (
  <>
    {subTab === 'pe_valuation' && (() => {
      const recent4 = chronological.slice(-4);
      const ttmEps = Number(recent4.reduce((acc, q) => acc + (q.income?.eps || 0), 0).toFixed(2));
      const effectiveEps = ttmEps > 0 ? ttmEps : (latestRecord?.income?.eps && latestRecord.income.eps > 0 ? latestRecord.income.eps * 4 : 0);
      const currentPe = effectiveEps > 0 && currentPrice > 0 ? Number((currentPrice / effectiveEps).toFixed(1)) : 0;
      const peSteps = [
        { mult: 10, label: '便宜', price: Number((effectiveEps * 10).toFixed(1)), color: '#10b981' },
        { mult: 14, label: '合理偏低', price: Number((effectiveEps * 14).toFixed(1)), color: '#06b6d4' },
        { mult: 18, label: '合理核心', price: Number((effectiveEps * 18).toFixed(1)), color: '#3b82f6' },
        { mult: 22, label: '合理偏高', price: Number((effectiveEps * 22).toFixed(1)), color: '#f59e0b' },
        { mult: 26, label: '昂貴', price: Number((effectiveEps * 26).toFixed(1)), color: '#ef4444' },
      ];

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {effectiveEps <= 0 && (
            <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#ef4444', fontSize: '12px', lineHeight: 1.6 }}>
              <strong>⚠️ 虧損股/無數據提示：</strong>
              此標的近 4 季累計 TTM EPS 處於虧損狀態 ({ttmEps.toFixed(2)} 元)，不適用傳統本益比評價模型，請切換至【股價淨值比 P/B】或【現金流折現 DCF】進行估值。
            </div>
          )}
          {isCyclicalStock && (
            <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)', color: '#f59e0b', fontSize: '12px', lineHeight: 1.6 }}>
              <strong>🚨 景氣循環股警示：</strong>
              此標的具高度景氣循環特性，獲利高點時 P/E 常處於歷史低位（低 P/E 陷阱），獲利低谷或虧損時 P/E 往往飆高或失效。強烈建議優先切換至【股價淨值比 P/B 河流圖】評估歷史景氣位階。
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>本益比評價模型 (P/E Valuation)</h3>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              當前市價：<strong style={{ color: 'var(--text-primary)', fontSize: '16px' }}>{currentPrice} 元</strong> (TTM EPS: {effectiveEps.toFixed(2)} 元 | 本益比: {currentPe > 0 ? `${currentPe} 倍` : 'N/A'})
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
            {peSteps.map((step) => {
              const isCurrentRange = currentPrice >= step.price * 0.9 && currentPrice <= step.price * 1.1;
              return (
                <div
                  key={step.mult}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: isCurrentRange ? `${step.color}18` : 'var(--bg-secondary)',
                    border: isCurrentRange ? `2px solid ${step.color}` : '1px solid var(--border-color)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '11px', color: step.color, fontWeight: 700 }}>{step.label} ({step.mult}x)</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', fontFamily: 'monospace' }}>{step.price} 元</div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            💡 本益比評價通道以近 4 季滾動 TTM EPS 作為獲利基準。當前本益比為 {currentPe} 倍，若股價低於 14 倍屬於合理偏低佈局區間。
          </p>
        </div>
      );
    })()}

    {subTab === 'pe_river' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {isCyclicalStock && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)', color: '#f59e0b', fontSize: '12px', lineHeight: 1.6 }}>
            <strong>🚨 景氣循環股警示：</strong>
            此標的具高度景氣循環特性，獲利高點時 P/E 常處於歷史低位（低 P/E 陷阱），獲利低谷或虧損時 P/E 往往飆高或失效。強烈建議優先切換至【股價淨值比 P/B 河流圖】評估歷史景氣位階。
          </div>
        )}
        {valuation && (valuation.pe || valuation.pb || valuation.dividendYield) && (
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>🏛️ 證交所/櫃買官方最新估值基準：</span>
            {valuation.pe ? <span>官方 P/E: <strong style={{ color: 'var(--text-primary)' }}>{valuation.pe.toFixed(1)}x</strong></span> : null}
            {valuation.pb ? <span>官方 P/B: <strong style={{ color: 'var(--text-primary)' }}>{valuation.pb.toFixed(2)}x</strong></span> : null}
            {valuation.dividendYield ? <span>官方殖利率: <strong style={{ color: '#10b981' }}>{valuation.dividendYield.toFixed(2)}%</strong></span> : null}
          </div>
        )}
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>本益比河流圖 (P/E River Bands)</h3>
        {renderValuationRiver(
          currentPrice,
          chronological.map((r) => `${r.year % 100}Q${r.quarter}`),
          chronological.map((_, idx) => {
            const slice = chronological.slice(Math.max(0, idx - 3), idx + 1);
            const sum = slice.reduce((acc, q) => acc + (q.income?.eps || 0), 0);
            const annualized = slice.length === 4 ? sum : (sum / Math.max(1, slice.length)) * 4;
            return Math.max(0.4, Number(annualized.toFixed(2)));
          }),
          [10, 14, 18, 22, 26],
          'TTM EPS',
          'x',
          valuationRiverQuarterlyClosePrices
        )}
      </div>
    )}

    {subTab === 'pb_valuation' && (() => {
      const latestEquity = latestRecord?.balanceSheet?.totalEquity || 0;
      const shares = deriveSharesOutstanding(latestRecord);
      const bvps = shares > 0 && latestEquity > 0 ? Number((latestEquity / shares).toFixed(2)) : 0;
      const currentPb = bvps > 0 && currentPrice > 0 ? Number((currentPrice / bvps).toFixed(2)) : 0;
      const pbSteps = [
        { mult: 0.8, label: '特價超跌', price: Number((bvps * 0.8).toFixed(1)), color: '#10b981' },
        { mult: 1.0, label: '便宜低估', price: Number((bvps * 1.0).toFixed(1)), color: '#06b6d4' },
        { mult: 1.2, label: '合理區間', price: Number((bvps * 1.2).toFixed(1)), color: '#3b82f6' },
        { mult: 1.4, label: '合理偏高', price: Number((bvps * 1.4).toFixed(1)), color: '#f59e0b' },
        { mult: 1.6, label: '昂貴溢價', price: Number((bvps * 1.6).toFixed(1)), color: '#ef4444' },
      ];

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {bvps <= 0 && (
            <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#ef4444', fontSize: '12px', lineHeight: 1.6 }}>
              <strong>⚠️ 無淨值數據提示：</strong>
              未單獨揭露股東權益或流通股數，無法客觀推估每股淨值 (BVPS) 與股價淨值比。
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>股價淨值比評價模型 (P/B Valuation)</h3>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              當前市價：<strong style={{ color: 'var(--text-primary)', fontSize: '16px' }}>{currentPrice} 元</strong> (BVPS: {bvps.toFixed(2)} 元 | 股價淨值比: {currentPb} 倍)
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
            {pbSteps.map((step) => {
              const isCurrentRange = currentPrice >= step.price * 0.9 && currentPrice <= step.price * 1.1;
              return (
                <div
                  key={step.mult}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: isCurrentRange ? `${step.color}18` : 'var(--bg-secondary)',
                    border: isCurrentRange ? `2px solid ${step.color}` : '1px solid var(--border-color)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '11px', color: step.color, fontWeight: 700 }}>{step.label} ({step.mult}x)</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', fontFamily: 'monospace' }}>{step.price} 元</div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            💡 股價淨值比適用於資本密集、週期景氣型重工業。若 P/B 低於 1.0 倍，代表現價低於公司清算帳面價值，具備強大防守護城河。
          </p>
        </div>
      );
    })()}

    {subTab === 'pb_river' && (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>股價淨值比河流圖 (P/B River Bands)</h3>
        {renderValuationRiver(
          currentPrice,
          chronological.map((r) => `${r.year % 100}Q${r.quarter}`),
          chronological.map((r) => {
            const equity = r.balanceSheet?.totalEquity || 0;
            const shares = deriveSharesOutstanding(r);
            return shares > 0 && equity > 0 ? Number((equity / shares).toFixed(2)) : 0;
          }),
          [0.8, 1.0, 1.2, 1.4, 1.6],
          '每股淨值 BVPS',
          'x',
          valuationRiverQuarterlyClosePrices
        )}
      </div>
    )}

    {subTab === 'dividend_yield' && (() => {
      if (!companyDividends || companyDividends.length === 0) {
        return (
          <div style={{ background: 'var(--bg-secondary)', padding: '32px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
              ⚠️ 該標的查無歷史現金股息配發記錄或尚未宣告配息，無法計算現金殖利率評價。
            </p>
          </div>
        );
      }

      const latestDivRaw = companyDividends[companyDividends.length - 1]?.cashDividend || 0;
      const latestDiv = isUsMarket ? latestDivRaw * 4 : latestDivRaw;
      const curYield = currentPrice > 0 && latestDiv > 0 ? Number(((latestDiv / currentPrice) * 100).toFixed(2)) : 0;
      const afterTaxYield = isUsMarket && curYield > 0 ? Number((curYield * 0.7).toFixed(2)) : curYield;

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>現金股利殖利率評價 (Dividend Yield)</h3>
            {curYield > 0 ? (
              <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '6px', background: curYield >= 5 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)', color: curYield >= 5 ? '#10b981' : '#3b82f6' }}>
                {curYield >= 5 ? '高殖利率標的 (>= 5%)' : '穩健防守型'}
              </span>
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>無配息</span>
            )}
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>當前現金殖利率 (Cash Dividend Yield)</span>
            <div style={{ fontSize: '38px', fontWeight: 900, color: curYield >= 5 ? '#10b981' : '#3b82f6', margin: '6px 0', fontFamily: 'monospace' }}>
              {curYield > 0 ? `${curYield.toFixed(2)}%` : '-'}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto' }}>
              {curYield > 0
                ? `以最新年度發放之每股現金股利 ${latestDiv.toFixed(2)} 元除以當前市價 ${currentPrice} 元計算。`
                : '目前市價或每股現金股利為 0，暫無法推算殖利率。'}
            </p>
            {isUsMarket && curYield > 0 && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '6px 12px', borderRadius: '6px', display: 'inline-block' }}>
                🇺🇸 美股海外投資人扣繳 30% 股息稅：稅後預估實拿殖利率約 <strong>{afterTaxYield.toFixed(2)}%</strong>
              </div>
            )}
          </div>
          {companyDividends.length > 0 && (
            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <table style={{ width: '100%', fontSize: '11px', textAlign: 'right', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>年度</th>
                    <th style={{ padding: '6px 8px' }}>現金股息</th>
                    <th style={{ padding: '6px 8px' }}>股票股利</th>
                    <th style={{ padding: '6px 8px' }}>除息殖利率</th>
                  </tr>
                </thead>
                <tbody>
                  {companyDividends.slice(-5).map((d, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600 }}>{d.year}年</td>
                      <td style={{ padding: '6px 8px', color: '#10b981', fontWeight: 700 }}>{d.cashDividend.toFixed(2)}元</td>
                      <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>{d.stockDividend.toFixed(2)}元</td>
                      <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>
                        {currentPrice > 0 && d.cashDividend > 0 ? `${((d.cashDividend / currentPrice) * 100).toFixed(1)}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    })()}

    {subTab === 'avg_dividend_yield' && (() => {
      if (!companyDividends || companyDividends.length === 0) {
        return (
          <div style={{ background: 'var(--bg-secondary)', padding: '32px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
              ⚠️ 該標的查無歷史現金股息記錄，無法進行平均現金股息殖利率估價。
            </p>
          </div>
        );
      }

      const divs = companyDividends.map((d) => d.cashDividend).filter((v) => v > 0);
      if (divs.length === 0) {
        return (
          <div style={{ background: 'var(--bg-secondary)', padding: '32px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
              ⚠️ 該標的無有效現金股息發放記錄，無法進行平均股息估價。
            </p>
          </div>
        );
      }

      const avg3 = Number((divs.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, divs.length)).toFixed(2));
      const avg5 = Number((divs.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, divs.length)).toFixed(2));
      const baseAvg = avg5 > 0 ? avg5 : avg3;

      const cheapPrice = Number((baseAvg / 0.07).toFixed(1));
      const fairPrice = Number((baseAvg / 0.05).toFixed(1));
      const expensivePrice = Number((baseAvg / 0.035).toFixed(1));

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>平均現金股息殖利率估價法</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>近 3 年平均現金股息</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#3b82f6', marginTop: '4px', fontFamily: 'monospace' }}>{avg3.toFixed(2)} 元</div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>近 5 年平均現金股息</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '4px', fontFamily: 'monospace' }}>{avg5.toFixed(2)} 元</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>便宜價 (7% 殖利率)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', marginTop: '4px', fontFamily: 'monospace' }}>{cheapPrice} 元</div>
            </div>
            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 700 }}>合理價 (5% 殖利率)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#3b82f6', marginTop: '4px', fontFamily: 'monospace' }}>{fairPrice} 元</div>
            </div>
            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>昂貴價 (3.5% 殖利率)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#ef4444', marginTop: '4px', fontFamily: 'monospace' }}>{expensivePrice} 元</div>
            </div>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            💡 以 5 年平均現金股利回推：當前市價 {currentPrice} 元，相對於合理價 {fairPrice} 元 ({currentPrice < fairPrice ? '處於折價便宜甜蜜點' : '處於溢價區間'})。
          </p>
        </div>
      );
    })()}

    {subTab === 'dividend_river' && (() => {
      const divs = companyDividends.length > 0 ? companyDividends.map((d) => d.cashDividend) : [1.0, 1.0, 1.2, 1.5, 1.0];
      const avgDiv = divs.length > 0 ? divs.reduce((a, b) => a + b, 0) / divs.length : 1.1;

      return (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>平均現金股息河流圖 (Dividend River Bands)</h3>
          {renderValuationRiver(
            currentPrice,
            chronological.map((r) => `${r.year % 100}Q${r.quarter}`),
            chronological.map(() => avgDiv),
            [12.5, 16.6, 20.0, 25.0, 33.3],
            '平均股利',
            '倍'
          )}
        </div>
      );
    })()}
  </>
);
