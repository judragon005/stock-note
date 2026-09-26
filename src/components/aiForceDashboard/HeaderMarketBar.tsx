import React, { useState, useEffect } from 'react';
import { MarketBarData } from '../../types/aiForceDashboard';
import { ColorThemeMode, MarketType } from '../../types/stock';
import { Activity, ShieldAlert, Cpu, Radio, RefreshCw } from 'lucide-react';
import { cleanSymbolInput, inferMarketType } from './HeaderQueryBar';

export type SystemBadgeType = 'AI_SCAN' | 'MAIN_FORCE' | 'MARKET_STATUS' | 'VOLATILITY';

export interface SystemBadgeConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  dotAnimate?: boolean;
}

/**
 * 格式化漲跌額與百分比色彩
 */
export function formatMarketChange(
  change: number,
  changePercent: number,
  theme: ColorThemeMode = 'taiwan'
): { changeText: string; percentText: string; color: string } {
  if (isNaN(change) || isNaN(changePercent)) {
    return { changeText: '-', percentText: '-', color: '#94a3b8' };
  }

  const isZero = Math.abs(change) < 0.0001;
  if (isZero) {
    return { changeText: '0.00', percentText: '0.00%', color: '#94a3b8' };
  }

  const isPositive = change > 0;
  const changeText = `${isPositive ? '+' : ''}${change.toFixed(2)}`;
  const percentText = `${isPositive ? '+' : ''}${changePercent.toFixed(2)}%`;

  let color: string;
  if (theme === 'taiwan') {
    color = isPositive ? '#ef4444' : '#10b981';
  } else {
    color = isPositive ? '#10b981' : '#ef4444';
  }

  return { changeText, percentText, color };
}

/**
 * 取得系統狀態燈號之配置
 */
export function getSystemBadgeConfig(type: SystemBadgeType, active: boolean = true): SystemBadgeConfig {
  switch (type) {
    case 'AI_SCAN':
      return {
        label: 'AI 智慧掃描',
        color: active ? '#10b981' : '#64748b',
        bgColor: active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.1)',
        borderColor: active ? 'rgba(16, 185, 129, 0.35)' : 'rgba(100, 116, 139, 0.2)',
        dotAnimate: active,
      };
    case 'MAIN_FORCE':
      return {
        label: '主力行為追蹤',
        color: active ? '#38bdf8' : '#64748b',
        bgColor: active ? 'rgba(56, 189, 248, 0.15)' : 'rgba(100, 116, 139, 0.1)',
        borderColor: active ? 'rgba(56, 189, 248, 0.35)' : 'rgba(100, 116, 139, 0.2)',
      };
    case 'MARKET_STATUS':
      return {
        label: '市場即時狀態',
        color: active ? '#818cf8' : '#64748b',
        bgColor: active ? 'rgba(129, 140, 248, 0.15)' : 'rgba(100, 116, 139, 0.1)',
        borderColor: active ? 'rgba(129, 140, 248, 0.35)' : 'rgba(100, 116, 139, 0.2)',
      };
    case 'VOLATILITY':
      return {
        label: '波動異常預警',
        color: active ? '#ef4444' : '#64748b',
        bgColor: active ? 'rgba(239, 68, 68, 0.15)' : 'rgba(100, 116, 139, 0.1)',
        borderColor: active ? 'rgba(239, 68, 68, 0.35)' : 'rgba(100, 116, 139, 0.2)',
        dotAnimate: active,
      };
  }
}

/**
 * 數值安全格式化
 */
export function formatMarketMetric(val?: number, fractionDigits: number = 0): string {
  if (val === undefined || val === null || isNaN(val)) {
    return '-';
  }
  return val.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export interface HeaderMarketBarProps {
  data: MarketBarData;
  colorTheme?: ColorThemeMode;
  currentSymbol?: string;
  currentName?: string;
  isLoading?: boolean;
  onAnalyze?: (symbol: string, market: MarketType) => void;
}

export const HeaderMarketBar: React.FC<HeaderMarketBarProps> = ({
  data,
  colorTheme = 'taiwan',
  currentSymbol = '2360',
  currentName = '致茂',
  isLoading = false,
  onAnalyze,
}) => {
  const [inputVal, setInputVal] = useState(currentSymbol);

  useEffect(() => {
    setInputVal(currentSymbol);
  }, [currentSymbol]);

  const changeMeta = formatMarketChange(data.change, data.changePercent, colorTheme);

  const scanBadge = getSystemBadgeConfig('AI_SCAN', data.statusBadges.aiScanActive);
  const mainForceBadge = getSystemBadgeConfig('MAIN_FORCE', data.statusBadges.mainForceTracking);
  const marketBadge = getSystemBadgeConfig('MARKET_STATUS', true);
  const volBadge = getSystemBadgeConfig('VOLATILITY', data.statusBadges.volatilityAlert);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cleanSymbolInput(inputVal);
    if (!clean || !onAnalyze) return;
    const inferred = inferMarketType(clean);
    onAnalyze(clean, inferred);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '10px 16px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(20, 30, 55, 0.9) 100%)',
        borderRadius: '14px',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. 第一層：股票搜尋操作與 4 大全繁中科技感狀態燈號 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          width: '100%',
          paddingBottom: '8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* 左側：股票代號輸入框、股票名稱與分析按鈕 */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(30, 41, 59, 0.85)',
            padding: '3px 10px 3px 6px',
            borderRadius: '8px',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
          }}
        >
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="代號"
            aria-label="股票代號"
            style={{
              width: '75px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#38bdf8',
              fontSize: '1.15rem',
              fontWeight: 800,
              textAlign: 'center',
              letterSpacing: '0.8px',
            }}
          />
          <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap' }}>
            {currentName}
          </span>
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.4)',
            }}
          >
            {isLoading ? <RefreshCw size={12} className="animate-spin" /> : <span>分析</span>}
          </button>
        </form>

        {/* 右側：4 大全繁體中文科技感狀態指示燈 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* 1. AI 智慧掃描 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '7px',
              background: scanBadge.bgColor,
              border: `1px solid ${scanBadge.borderColor}`,
              fontSize: '0.75rem',
              fontWeight: 700,
              color: scanBadge.color,
              letterSpacing: '0.3px',
            }}
          >
            <Cpu size={13} />
            <span>{scanBadge.label}</span>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: scanBadge.color,
                boxShadow: `0 0 6px ${scanBadge.color}`,
              }}
            />
          </div>

          {/* 2. 主力行為追蹤 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '7px',
              background: mainForceBadge.bgColor,
              border: `1px solid ${mainForceBadge.borderColor}`,
              fontSize: '0.75rem',
              fontWeight: 700,
              color: mainForceBadge.color,
            }}
          >
            <Radio size={13} />
            <span>{mainForceBadge.label}</span>
          </div>

          {/* 3. 市場即時狀態 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '7px',
              background: marketBadge.bgColor,
              border: `1px solid ${marketBadge.borderColor}`,
              fontSize: '0.75rem',
              fontWeight: 700,
              color: marketBadge.color,
            }}
          >
            <Activity size={13} />
            <span>{marketBadge.label}</span>
          </div>

          {/* 4. 波動異常預警 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '7px',
              background: volBadge.bgColor,
              border: `1px solid ${volBadge.borderColor}`,
              fontSize: '0.75rem',
              fontWeight: 700,
              color: volBadge.color,
            }}
          >
            <ShieldAlert size={13} />
            <span>{volBadge.label}</span>
          </div>
        </div>
      </div>

      {/* 2. 第二層：寬幅即時行情大面板 (10 大 KPI 舒展橫排，徹底告別緊縮) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          width: '100%',
          fontSize: '0.85rem',
          paddingTop: '2px',
        }}
      >
        {/* 今日收盤價 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>今日收盤價</span>
          <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
            {formatMarketMetric(data.currentPrice, 2)}
          </span>
        </div>

        {/* 今日漲跌 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>今日漲跌</span>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: changeMeta.color }}>
            {changeMeta.changeText}
          </span>
        </div>

        {/* 今日漲幅 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>今日漲幅</span>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: changeMeta.color }}>
            {changeMeta.percentText}
          </span>
        </div>

        <div style={{ width: '1px', height: '26px', background: 'rgba(255,255,255,0.12)' }} />

        {/* 成交量 (張) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>成交量(張)</span>
          <span style={{ fontSize: '1.02rem', fontWeight: 700, color: '#38bdf8' }}>
            {formatMarketMetric(data.volumeShares, 0)}
          </span>
        </div>

        {/* 成交筆數 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>成交筆數</span>
          <span style={{ fontSize: '1.02rem', fontWeight: 700, color: '#f1f5f9' }}>
            {formatMarketMetric(data.transactionCount, 0)}
          </span>
        </div>

        {/* 開盤 / 最高 / 最低 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>開盤</span>
          <span style={{ fontSize: '0.98rem', fontWeight: 700, color: '#e2e8f0' }}>
            {formatMarketMetric(data.openPrice, 2)}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>最高</span>
          <span style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f87171' }}>
            {formatMarketMetric(data.highPrice, 2)}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>最低</span>
          <span style={{ fontSize: '0.98rem', fontWeight: 700, color: '#34d399' }}>
            {formatMarketMetric(data.lowPrice, 2)}
          </span>
        </div>

        <div style={{ width: '1px', height: '26px', background: 'rgba(255,255,255,0.12)' }} />

        {/* 最新交易日 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>最新交易日</span>
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#94a3b8' }}>
            {data.latestTradingDate}
          </span>
        </div>

        {/* 資料筆數 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>資料筆數</span>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fbbf24' }}>
            {data.dataPointsCount} 日
          </span>
        </div>
      </div>
    </div>
  );
};

export default HeaderMarketBar;
