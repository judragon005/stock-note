import React, { useState } from 'react';
import type { InstitutionalResearchSummary } from '../../engine/institutionalScoringEngine';
import { generate12AnalystsPrompt } from '../../engine/institutionalScoringEngine';
import type { QuarterlyFinancialRecord } from '../../types/financialForensic';
import { savePinnedStrategy } from '../../engine/strategyPinEngine';

interface ExecutiveSummarySectionProps {
  summary: InstitutionalResearchSummary;
  symbol: string;
  stockName: string;
  market?: 'TW' | 'US';
  currentPrice: number;
  records: QuarterlyFinancialRecord[];
  revenueRecords?: Array<{
    yearMonth: string;
    revenue: number;
    yoyRate?: number;
    isAllTimeHigh?: number;
  }>;
  directorPledgeRatio?: number;
  holdingCost?: number;
}

export const ExecutiveSummarySection: React.FC<ExecutiveSummarySectionProps> = ({
  summary,
  symbol,
  stockName,
  market = 'TW',
  currentPrice,
  records,
  revenueRecords,
  directorPledgeRatio,
  holdingCost,
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [isPromptDrawerOpen, setIsPromptDrawerOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);

  const gradeColor =
    summary.overallGrade === '強力買進'
      ? '#10b981'
      : summary.overallGrade === '穩健偏多'
      ? '#06b6d4'
      : summary.overallGrade === '中性觀望'
      ? '#3b82f6'
      : summary.overallGrade === '防禦減持'
      ? '#f59e0b'
      : '#ef4444';

  const handleCopyPrompt = () => {
    const promptText = generate12AnalystsPrompt({
      symbol,
      stockName,
      market,
      currentPrice,
      records,
      revenueRecords,
      directorPledgeRatio,
      holdingCost,
    });

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(promptText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } else {
      // 降級方案相容非 HTTPS 與 iframe
      const textArea = document.createElement('textarea');
      textArea.value = promptText;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2500);
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  const handlePinExternalVerdict = () => {
    if (!jsonInput.trim()) return;
    try {
      const parsed = JSON.parse(jsonInput);
      const now = new Date();
      const validityDays = parsed.validityDays || 30;
      const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000).toISOString();
      savePinnedStrategy({
        id: `external_${Date.now()}`,
        symbol,
        aiModel: parsed.aiModel || '12-analysts-consensus',
        verdict: parsed.verdict || summary.overallGrade,
        stopLoss: parsed.stopLoss || summary.tradeDecision.targetBuyRange[0] * 0.9,
        takeProfit: parsed.takeProfit || parsed.targetPrice || summary.tradeDecision.targetBuyRange[1],
        validityDays,
        createdAt: now.toISOString(),
        expiresAt,
        isExpired: false,
      });
      setPinSuccess(true);
      setTimeout(() => setPinSuccess(false), 3000);
      setJsonInput('');
    } catch {
      alert('JSON 格式有誤，請確認貼上的內容為有效 JSON！');
    }
  };

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* 頂部 Header：結論先行看板與動作按鈕 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                letterSpacing: '0.5px',
              }}
            >
              INSTITUTIONAL GRADE
            </span>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              01｜機構研究總覽 (Executive Summary)
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
            融合 12 位專業分析師視角，基於 Zero-Mock 公開數據完成 8 維度穿透鑑識與情境估值
          </p>
        </div>

        {/* 右上角評級徽章與 12 分析師 Prompt 按鈕 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: `${gradeColor}15`,
              border: `1px solid ${gradeColor}50`,
              padding: '6px 14px',
              borderRadius: '12px',
            }}
          >
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>綜合評級</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: gradeColor }}>{summary.overallGrade}</div>
            </div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 900,
                color: gradeColor,
                fontFamily: 'var(--font-mono, monospace)',
                borderLeft: `1px solid ${gradeColor}30`,
                paddingLeft: '8px',
              }}
            >
              {summary.totalScore}
              <span style={{ fontSize: '12px', fontWeight: 600 }}> 分</span>
            </div>
          </div>

          <button
            onClick={handleCopyPrompt}
            style={{
              background: copySuccess ? '#10b981' : 'var(--bg-primary)',
              color: copySuccess ? '#fff' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '8px 14px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            {copySuccess ? '✅ 已複製投研 Prompt' : '📋 複製 12 位分析師投研 Prompt'}
          </button>

          <button
            onClick={() => setIsPromptDrawerOpen(!isPromptDrawerOpen)}
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              padding: '8px 12px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {isPromptDrawerOpen ? '收起裁決抽屜' : '貼回外部裁決 JSON'}
          </button>
        </div>
      </div>

      {/* 外部裁決 JSON 抽屜 */}
      {isPromptDrawerOpen && (
        <div
          style={{
            background: 'var(--bg-primary)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px dashed var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              📥 貼回外部 LLM 裁決 JSON (一鍵釘選至頂部研究戰績)
            </span>
            {pinSuccess && <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>✅ 釘選成功！</span>}
          </div>
          <textarea
            rows={3}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='貼上包含 targetPrice, verdict, action, notes 的外部模型裁決 JSON...'
            style={{
              width: '100%',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              padding: '8px 12px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              onClick={handlePinExternalVerdict}
              style={{
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              📌 釘選至研究看板
            </button>
          </div>
        </div>
      )}

      {/* 8 維度透明評分卡 (進度條網格) */}
      <div>
        <h4 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 12px 0', color: 'var(--text-secondary)' }}>
          📊 8 維度機構級量化評分卡 (權重 100%)
        </h4>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
          }}
        >
          {summary.dimensions.map((dim) => {
            const pct = (dim.score / dim.weight) * 100;
            const barColor = pct >= 80 ? '#10b981' : pct >= 60 ? '#06b6d4' : pct >= 40 ? '#f59e0b' : '#ef4444';
            return (
              <div
                key={dim.name}
                style={{
                  background: 'var(--bg-primary)',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{dim.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: `${barColor}20`,
                        color: barColor,
                      }}
                    >
                      {dim.rating}
                    </span>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700 }}>
                      {dim.score}/{dim.weight}
                    </span>
                  </div>
                </div>
                {/* 橫條進度 */}
                <div
                  style={{
                    height: '4px',
                    borderRadius: '2px',
                    background: 'var(--border-color)',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ width: `${pct}%`, height: '100%', background: barColor, transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {dim.summary}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 雙欄對照：財報說了什麼 vs 沒說什麼 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
        }}
      >
        {/* 左欄：財報說了什麼 */}
        <div
          style={{
            background: 'var(--bg-primary)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>📄</span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
              財報說了什麼 (客觀事實)
            </span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            {summary.whatFinancialsSaid.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>

        {/* 右欄：財報沒說什麼 */}
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.04)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>🔍</span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#ef4444' }}>
              財報沒說什麼 (穿透鑑識)
            </span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            {summary.whatFinancialsDidntSay.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 底部交易決策面板：買進觀察區、安全邊際與論點失效條件 */}
      <div
        style={{
          background: 'var(--bg-primary)',
          padding: '16px 20px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '15px' }}>🎯</span>
            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
              實戰買進觀察區與交易邊界
            </span>
          </div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '8px',
              background: `${gradeColor}18`,
              color: gradeColor,
              border: `1px solid ${gradeColor}40`,
            }}
          >
            建議動作：{summary.tradeDecision.suggestedAction}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>合理目標買進區間</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
              {summary.tradeDecision.targetBuyRange[0]} ~ {summary.tradeDecision.targetBuyRange[1]} 元
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>當前安全邊際 (Margin of Safety)</div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 900,
                color: summary.tradeDecision.marginOfSafetyPct >= 0 ? '#10b981' : '#ef4444',
                fontFamily: 'monospace',
              }}
            >
              {summary.tradeDecision.marginOfSafetyPct > 0 ? `+${summary.tradeDecision.marginOfSafetyPct}` : summary.tradeDecision.marginOfSafetyPct}%
            </div>
          </div>
        </div>

        {summary.tradeDecision.personalAdvice && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              fontSize: '12px',
              color: '#3b82f6',
              lineHeight: 1.5,
            }}
          >
            💡 <strong>個人持倉建議：</strong>{summary.tradeDecision.personalAdvice}
          </div>
        )}

        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444', marginBottom: '6px' }}>
            🚨 論點失效停損條件 (一旦觸發立即無條件離場)：
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {summary.tradeDecision.invalidationConditions.map((cond, idx) => (
              <li key={idx}>{cond}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
