import React from 'react';
import { MarketBarData } from '../../types/aiForceDashboard';
import { ColorThemeMode } from '../../types/stock';
import { Activity, ShieldAlert, Cpu, Radio } from 'lucide-react';

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
        label: 'AI SCAN ACTIVE',
        color: active ? '#10b981' : '#64748b',
        bgColor: active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.1)',
        borderColor: active ? 'rgba(16, 185, 129, 0.35)' : 'rgba(100, 116, 139, 0.2)',
        dotAnimate: active,
      };
    case 'MAIN_FORCE':
      return {
        label: 'MAIN FORCE TRACKING',
        color: active ? '#38bdf8' : '#64748b',
        bgColor: active ? 'rgba(56, 189, 248, 0.15)' : 'rgba(100, 116, 139, 0.1)',
        borderColor: active ? 'rgba(56, 189, 248, 0.35)' : 'rgba(100, 116, 139, 0.2)',
      };
    case 'MARKET_STATUS':
      return {
        label: 'MARKET STATUS',
        color: active ? '#818cf8' : '#64748b',
        bgColor: active ? 'rgba(129, 140, 248, 0.15)' : 'rgba(100, 116, 139, 0.1)',
        borderColor: active ? 'rgba(129, 140, 248, 0.35)' : 'rgba(100, 116, 139, 0.2)',
      };
    case 'VOLATILITY':
      return {
        label: 'VOLATILITY ALERT',
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
}

export const HeaderMarketBar: React.FC<HeaderMarketBarProps> = ({
  data,
  colorTheme = 'taiwan',
}) => {
  const changeMeta = formatMarketChange(data.change, data.changePercent, colorTheme);

  const scanBadge = getSystemBadgeConfig('AI_SCAN', data.statusBadges.aiScanActive);
  const mainForceBadge = getSystemBadgeConfig('MAIN_FORCE', data.statusBadges.mainForceTracking);
  const marketBadge = getSystemBadgeConfig('MARKET_STATUS', true);
  const volBadge = getSystemBadgeConfig('VOLATILITY', data.statusBadges.volatilityAlert);

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        padding: '12px 18px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(20, 30, 55, 0.9) 100%)',
        borderRadius: '14px',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* 左側：系統指示狀態燈群 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* 1. AI SCAN ACTIVE */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            background: scanBadge.bgColor,
            border: `1px solid ${scanBadge.borderColor}`,
            fontSize: '0.72rem',
            fontWeight: 700,
            color: scanBadge.color,
            letterSpacing: '0.5px',
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
              boxShadow: `0 0 8px ${scanBadge.color}`,
            }}
          />
        </div>

        {/* 2. MAIN FORCE TRACKING */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            background: mainForceBadge.bgColor,
            border: `1px solid ${mainForceBadge.borderColor}`,
            fontSize: '0.72rem',
            fontWeight: 700,
            color: mainForceBadge.color,
          }}
        >
          <Radio size={13} />
          <span>{mainForceBadge.label}</span>
        </div>

        {/* 3. MARKET STATUS */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            background: marketBadge.bgColor,
            border: `1px solid ${marketBadge.borderColor}`,
            fontSize: '0.72rem',
            fontWeight: 700,
            color: marketBadge.color,
          }}
        >
          <Activity size={13} />
          <span>{marketBadge.label}</span>
        </div>

        {/* 4. VOLATILITY ALERT */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            background: volBadge.bgColor,
            border: `1px solid ${volBadge.borderColor}`,
            fontSize: '0.72rem',
            fontWeight: 700,
            color: volBadge.color,
          }}
        >
          <ShieldAlert size={13} />
          <span>{volBadge.label}</span>
        </div>
      </div>

      {/* 右側：即時行情數值 Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          fontSize: '0.85rem',
        }}
      >
        {/* 今日收盤價 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>今日收盤價</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
            {formatMarketMetric(data.currentPrice, 2)}
          </span>
        </div>

        {/* 今日漲跌 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>今日漲跌</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: changeMeta.color }}>
            {changeMeta.changeText}
          </span>
        </div>

        {/* 今日漲幅 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>今日漲幅</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: changeMeta.color }}>
            {changeMeta.percentText}
          </span>
        </div>

        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />

        {/* 成交量 (張) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>成交量(張)</span>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8' }}>
            {formatMarketMetric(data.volumeShares, 0)}
          </span>
        </div>

        {/* 成交筆數 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>成交筆數</span>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9' }}>
            {formatMarketMetric(data.transactionCount, 0)}
          </span>
        </div>

        {/* 開盤 / 最高 / 最低 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>開盤</span>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' }}>
            {formatMarketMetric(data.openPrice, 2)}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>最高</span>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f87171' }}>
            {formatMarketMetric(data.highPrice, 2)}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>最低</span>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34d399' }}>
            {formatMarketMetric(data.lowPrice, 2)}
          </span>
        </div>

        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />

        {/* 最新交易日 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>最新交易日</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>
            {data.latestTradingDate}
          </span>
        </div>

        {/* 資料筆數 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>資料筆數</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24' }}>
            {data.dataPointsCount} 日
          </span>
        </div>
      </div>
    </div>
  );
};
