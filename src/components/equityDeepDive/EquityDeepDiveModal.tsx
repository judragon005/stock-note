import React, { useState, useEffect } from 'react';
import { MarketType, HoldingPosition } from '../../types/stock';
import { EquityDeepDiveInput, InvestmentMemoRecord } from '../../types/equityDeepDive';
import { generateFull7StepsPromptPayload } from '../../engine/equityDeepDiveEngine';
import { EquityDeepDiveStepCard } from './EquityDeepDiveStepCard';
import {
  getInvestmentMemo,
  saveInvestmentMemo,
  isSymbolInHoldings,
  syncMemoToHoldingsRiskLine,
} from '../../utils/investmentMemoStorage';
import { triggerDashboardCanvasPngDownload } from '../../engine/dashboardCanvasExporter';
import { AiForceDashboardReport } from '../../types/aiForceDashboard';

export interface EquityDeepDiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  input?: EquityDeepDiveInput;
  symbol?: string;
  market?: MarketType;
  name?: string;
  holdings?: HoldingPosition[];
  onUpdateHoldings?: (holdings: HoldingPosition[]) => void;
  reportContext?: AiForceDashboardReport;
}

export const EquityDeepDiveModal: React.FC<EquityDeepDiveModalProps> = ({
  isOpen,
  onClose,
  input,
  symbol,
  market = 'TW',
  name,
  holdings = [],
  onUpdateHoldings,
  reportContext,
}) => {
  if (!isOpen) return null;

  const resolvedInput: EquityDeepDiveInput = input || {
    symbol: symbol || '',
    name: name || symbol || '',
    market: market || 'TW',
  };

  const [report, setReport] = useState(() => generateFull7StepsPromptPayload(resolvedInput));
  const [allCopied, setAllCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 投資筆記表單狀態
  const [buyReason, setBuyReason] = useState('');
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [stopLossPrice, setStopLossPrice] = useState<string>('');
  const [holdingDays, setHoldingDays] = useState<string>('60');
  const [trackingMetrics, setTrackingMetrics] = useState<string>('');
  const [syncToHoldings, setSyncToHoldings] = useState(false);

  const isInHoldings = isSymbolInHoldings(resolvedInput.symbol, holdings);

  // 載入既有筆記與預設風控數值
  useEffect(() => {
    setReport(generateFull7StepsPromptPayload(resolvedInput));
    const existing = getInvestmentMemo(resolvedInput.symbol);
    if (existing) {
      setBuyReason(existing.buyReason || '');
      setTargetPrice(existing.targetPrice !== undefined ? String(existing.targetPrice) : '');
      setStopLossPrice(existing.stopLossPrice !== undefined ? String(existing.stopLossPrice) : '');
      setHoldingDays(existing.holdingPeriodDays ? String(existing.holdingPeriodDays) : '60');
      setTrackingMetrics(existing.trackingMetrics ? existing.trackingMetrics.join(', ') : '');
    } else {
      // 依當前市價推估預設停損價 (-8%) 與目標價 (+20%)
      const price = resolvedInput.quote?.price || (resolvedInput.candles && resolvedInput.candles.length > 0 ? resolvedInput.candles[resolvedInput.candles.length - 1].close : 0);
      if (price > 0) {
        setTargetPrice(String(Math.round(price * 1.2 * 10) / 10));
        setStopLossPrice(String(Math.round(price * 0.92 * 10) / 10));
      } else {
        setTargetPrice('');
        setStopLossPrice('');
      }
      setBuyReason('');
      setHoldingDays('60');
      setTrackingMetrics('');
    }
  }, [resolvedInput.symbol, resolvedInput.market]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyAll = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(report.fullPayloadPrompt);
      setAllCopied(true);
      showToast('已複製 7 步全量投研 Prompt Payload！可直接貼入 Claude/ChatGPT');
      setTimeout(() => setAllCopied(false), 2500);
    }
  };

  const handleDownloadSnapshot = () => {
    const dummyReport: AiForceDashboardReport = reportContext || ({
      symbol: resolvedInput.symbol,
      name: resolvedInput.name,
      market: resolvedInput.market,
      updatedAt: new Date().toLocaleTimeString(),
      marketBar: {
        currentPrice: resolvedInput.quote?.price || (resolvedInput.candles && resolvedInput.candles.length > 0 ? resolvedInput.candles[resolvedInput.candles.length - 1].close : 0),
        change: resolvedInput.quote?.change || 0,
        changePercent: resolvedInput.quote?.changePercent || 0,
        currency: resolvedInput.market === 'US' ? 'USD' : 'TWD',
        volumeUnit: resolvedInput.market === 'US' ? '股' : '張',
        marketStatusTag: resolvedInput.statusTag || 'NORMAL',
        latestTradingDate: new Date().toISOString().split('T')[0],
      } as any,
    } as any);

    const currentMemo: InvestmentMemoRecord = {
      symbol: resolvedInput.symbol,
      name: resolvedInput.name,
      market: resolvedInput.market,
      buyReason,
      targetPrice: parseFloat(targetPrice) || 0,
      stopLossPrice: parseFloat(stopLossPrice) || 0,
      holdingPeriodDays: parseInt(holdingDays, 10) || 60,
      trackingMetrics: trackingMetrics ? trackingMetrics.split(/[,，、]/).map((s) => s.trim()).filter(Boolean) : [],
      isWatchlist: !isInHoldings,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    triggerDashboardCanvasPngDownload(dummyReport, currentMemo);
    showToast('已生成並觸發下載 1920x1080 向量決策快照圖檔 (PNG)');
  };

  const handleSaveMemo = () => {
    const memo: InvestmentMemoRecord = {
      symbol: resolvedInput.symbol,
      name: resolvedInput.name,
      market: resolvedInput.market,
      buyReason: buyReason.trim(),
      targetPrice: parseFloat(targetPrice) || 0,
      stopLossPrice: parseFloat(stopLossPrice) || 0,
      holdingPeriodDays: parseInt(holdingDays, 10) || 60,
      trackingMetrics: trackingMetrics
        ? trackingMetrics.split(/[,，、]/).map((s) => s.trim()).filter(Boolean)
        : [],
      isWatchlist: !isInHoldings,
      syncedToHoldings: syncToHoldings && isInHoldings,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    saveInvestmentMemo(memo);

    if (syncToHoldings && isInHoldings && onUpdateHoldings) {
      const syncResult = syncMemoToHoldingsRiskLine(resolvedInput.symbol, memo, holdings);
      if (syncResult.success) {
        onUpdateHoldings(syncResult.updatedHoldings);
        showToast('投資筆記已保存，並成功同步目標價/停損價至在庫持倉！');
        return;
      }
    }

    showToast(isInHoldings ? '投資筆記已成功保存！' : '投資筆記已保存至觀察清單 (Watchlist)！');
  };

  return (
    <div
      data-testid="equity-deep-dive-modal"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1000px',
          maxHeight: '90vh',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal 頂部標題 */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(30, 41, 59, 0.5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '22px' }}>🔍</span>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f8fafc' }}>
                {resolvedInput.name} ({resolvedInput.symbol}) · 全市場個股 7 步深度投研決策閉環
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                市場：{resolvedInput.market === 'US' ? '美股 (US)' : '台股 (TW)'} | 狀態：
                {resolvedInput.statusTag === 'DISPOSITION' ? (
                  <span style={{ color: '#ef4444', fontWeight: 'bold' }}>🚨 處置股票</span>
                ) : resolvedInput.statusTag === 'ATTENTION' ? (
                  <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>⚠️ 注意股票</span>
                ) : (
                  <span style={{ color: '#22c55e' }}>正常交易</span>
                )}
                {isInHoldings ? ' · 📦 已在庫持倉' : ' · 🔭 觀察清單標的'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              data-testid="copy-all-prompts-btn"
              onClick={handleCopyAll}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 'bold',
                borderRadius: '8px',
                backgroundColor: allCopied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                color: allCopied ? '#4ade80' : '#38bdf8',
                border: `1px solid ${allCopied ? '#22c55e' : '#38bdf8'}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {allCopied ? '✓ 已複製全量 7 步 Prompt' : '📋 一鍵複製全量 Prompt'}
            </button>

            <button
              type="button"
              data-testid="download-canvas-snapshot-btn"
              onClick={handleDownloadSnapshot}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 'bold',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                cursor: 'pointer',
              }}
            >
              🖼️ 導出快照 PNG
            </button>

            <button
              type="button"
              data-testid="close-deep-dive-modal-btn"
              onClick={onClose}
              style={{
                padding: '6px 12px',
                fontSize: '16px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                color: '#94a3b8',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal 主體內容 (可滾動) */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {toastMessage && (
            <div
              style={{
                padding: '10px 16px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '8px',
                color: '#38bdf8',
                fontSize: '13px',
                marginBottom: '16px',
                textAlign: 'center',
              }}
            >
              {toastMessage}
            </div>
          )}

          {/* 7 步驟折疊卡片清單 */}
          <EquityDeepDiveStepCard
            stepNumber={1}
            title="商業模式拆解"
            subtitle="500 字白話業務核心、產品營收佔比與能力圈邊界"
            promptContent={report.step1Prompt}
            defaultOpen={true}
          />

          <EquityDeepDiveStepCard
            stepNumber={2}
            title="財報魔鬼細節"
            subtitle="營收 vs 現金流背離、應收帳款與存貨周轉異常檢驗"
            promptContent={report.step2Prompt}
          />

          <EquityDeepDiveStepCard
            stepNumber={3}
            title="同業對照與相對估值"
            subtitle="橫向對比 2 檔直接競對之毛利率、PE、PB、殖利率"
            promptContent={report.step3Prompt}
          />

          <EquityDeepDiveStepCard
            stepNumber={4}
            title="市場沒說的事"
            subtitle="主流定價外之潛在黑天鵝、客戶集中度與處置/注意警訊"
            promptContent={report.step4Prompt}
          />

          <EquityDeepDiveStepCard
            stepNumber={5}
            title="未來一年情境推演"
            subtitle="樂觀、中性、悲觀 3 套動態劇本與合理目標價區間"
            promptContent={report.step5Prompt}
          />

          <EquityDeepDiveStepCard
            stepNumber={6}
            title="籌碼微觀解讀"
            subtitle="近 20 日法人累計動能、箱底支撐與突破防線研判"
            promptContent={report.step6Prompt}
          />

          {/* 第 7 步：投資筆記編輯器 */}
          <div
            data-testid="deep-dive-step-7"
            style={{
              backgroundColor: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '12px',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              padding: '18px',
              marginTop: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  backgroundColor: '#38bdf8',
                  color: '#0f172a',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                7
              </span>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#f8fafc' }}>
                  第 7 步：投資筆記（200 字極簡交易卡沉澱）
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  建立進場劇本與嚴格紀律，並持久化至本機儲存
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>
                  買進核心理由（最強催化劑）：
                </label>
                <input
                  type="text"
                  data-testid="memo-buy-reason-input"
                  value={buyReason}
                  onChange={(e) => setBuyReason(e.target.value)}
                  placeholder="例如：先進製程壟斷優勢明確，外資連續吃貨突破箱體上緣..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>
                  目標價位區間：
                </label>
                <input
                  type="number"
                  data-testid="memo-target-price-input"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder="目標獲利了結價"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>
                  停損風控底線：
                </label>
                <input
                  type="number"
                  data-testid="memo-stop-loss-input"
                  value={stopLossPrice}
                  onChange={(e) => setStopLossPrice(e.target.value)}
                  placeholder="跌破無條件出場價"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>
                  預計持有週期（天）：
                </label>
                <input
                  type="number"
                  data-testid="memo-holding-days-input"
                  value={holdingDays}
                  onChange={(e) => setHoldingDays(e.target.value)}
                  placeholder="如 60 天"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>
                  3 個追蹤觀察指標（以逗號分隔）：
                </label>
                <input
                  type="text"
                  data-testid="memo-tracking-metrics-input"
                  value={trackingMetrics}
                  onChange={(e) => setTrackingMetrics(e.target.value)}
                  placeholder="月營收年增率、外資買超連續性、毛利率 > 50%"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                marginTop: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              {isInHoldings ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#38bdf8', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    data-testid="memo-sync-holdings-checkbox"
                    checked={syncToHoldings}
                    onChange={(e) => setSyncToHoldings(e.target.checked)}
                  />
                  同步更新至在庫持倉之「目標價與停損風控線」
                </label>
              ) : (
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  ℹ️ 此標的目前不在庫，保存後將歸檔至觀察清單 (Watchlist)
                </span>
              )}

              <button
                type="button"
                data-testid="save-memo-btn"
                onClick={handleSaveMemo}
                style={{
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  backgroundColor: '#38bdf8',
                  color: '#0f172a',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                💾 儲存投資筆記
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
