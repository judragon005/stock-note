import React from 'react';
import { Sliders, CheckCircle2, XCircle } from 'lucide-react';
import type { QuarterlyFinancialRecord } from '../../../types/financialForensic';
import { calculateTurnoverMetrics } from '../../../engine/financialTurnoverEngine';
import { formatFinancialAmount } from '../../../utils/formatters';
import { renderSimpleBars } from './metricChartPrimitives';

export interface QuantValuationModelsSectionProps {
  subTab: string;
  chronological: QuarterlyFinancialRecord[];
  latestRecord?: QuarterlyFinancialRecord;
  piotroskiRes: {
    totalScore: number;
    rating: string;
    details: Record<string, { id: string; name: string; actualDesc: string; passed: boolean }>;
  };
  fcfYield: number;
  lynchRes: { fairValue: number; pegRatio: number; assessment: string };
  dcfRes: { intrinsicValue: number; marginOfSafetyPct: number };
  ddmRes: { fairValue: number; assessment: string };
  dcfWacc: number;
  dcfGrowth: number;
  onDcfWaccChange: (nextWacc: number) => void;
  onDcfGrowthChange: (nextGrowth: number) => void;
}

export const QuantValuationModelsSection: React.FC<QuantValuationModelsSectionProps> = ({
  subTab,
  chronological,
  latestRecord,
  piotroskiRes,
  fcfYield,
  lynchRes,
  dcfRes,
  ddmRes,
  dcfWacc,
  dcfGrowth,
  onDcfWaccChange,
  onDcfGrowthChange,
}) => (
  <>
    {subTab === 'piotroski_f' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Piotroski F-Score (9 分量化財務評分卡)</h3>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 800,
              color: piotroskiRes.rating === 'EXCELLENT' ? '#10b981' : piotroskiRes.rating === 'GOOD' ? '#3b82f6' : '#ef4444',
            }}
          >
            總評分：{piotroskiRes.totalScore} / 9 分 ({piotroskiRes.rating})
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {Object.values(piotroskiRes.details).map((d) => (
            <div
              key={d.id}
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'var(--bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{d.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{d.actualDesc}</div>
              </div>
              {d.passed ? <CheckCircle2 size={18} style={{ color: '#10b981' }} /> : <XCircle size={18} style={{ color: '#ef4444' }} />}
            </div>
          ))}
        </div>
      </div>
    )}

    {subTab === 'fcf_yield' && (
      <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>自由現金流報酬率 (FCF Yield)</span>
        <div style={{ fontSize: '32px', fontWeight: 900, color: '#10b981', margin: '8px 0' }}>{fcfYield.toFixed(2)}%</div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
          每股所創造的實質自由現金流除以當前股價。若高於 6% 代表防守安全邊際極高。
        </p>
      </div>
    )}

    {subTab === 'debt_structure' && (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>長短期金融借款結構</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>短期借款 (Short-Term Debt)</span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
              {latestRecord?.balanceSheet?.shortTermDebt && latestRecord.balanceSheet.shortTermDebt > 0
                ? formatFinancialAmount(latestRecord.balanceSheet.shortTermDebt)
                : '未單獨揭露'}
            </div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>長期借款 (Long-Term Debt)</span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>
              {latestRecord?.balanceSheet?.longTermDebt && latestRecord.balanceSheet.longTermDebt > 0
                ? formatFinancialAmount(latestRecord.balanceSheet.longTermDebt)
                : '未單獨揭露'}
            </div>
          </div>
        </div>
      </div>
    )}

    {subTab === 'cash_conversion' && (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0' }}>現金轉換循環 CCC (天數)</h3>
        {renderSimpleBars(
          chronological.map((r) => {
            const tm = calculateTurnoverMetrics(r);
            const ccc = tm?.cccDays != null && !isNaN(tm.cccDays) && isFinite(tm.cccDays) ? Math.round(tm.cccDays) : null;
            return {
              label: `${r.year % 100}Q${r.quarter}`,
              value: ccc ?? 0,
              displayValue: ccc != null ? `${ccc}天` : '-',
              isNoData: ccc == null,
            };
          }),
          '#0284c7',
          'CCC = 應收天數 + 存貨天數 - 應付天數 (天數越短營運效率越高)'
        )}
      </div>
    )}

    {subTab === 'peter_lynch' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>彼得林區評價 (Peter Lynch Fair Value & PEG)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>合理內在價值 (Fair Value)</span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{lynchRes.fairValue} 元</div>
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

    {subTab === 'dcf_valuation' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>DCF 現金流折現估值模型 (Discounted Cash Flow)</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            以未來 5 年自由現金流預測結合永續價值進行貼現，支援互動滑桿即時求解每股合理價。
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>DCF 每股內在價值 (Intrinsic Value)</span>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#10b981', marginTop: '4px' }}>{dcfRes.intrinsicValue} 元</div>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>當前股價安全邊際 (Margin of Safety)</span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: dcfRes.marginOfSafetyPct > 0 ? '#10b981' : '#ef4444', marginTop: '4px' }}>
              {dcfRes.marginOfSafetyPct > 0 ? `折價 ${dcfRes.marginOfSafetyPct}% (低估)` : `溢價 ${Math.abs(dcfRes.marginOfSafetyPct)}% (偏貴)`}
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              onChange={(e) => onDcfWaccChange(parseFloat(e.target.value))}
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
              onChange={(e) => onDcfGrowthChange(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>
        </div>
      </div>
    )}

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
  </>
);
