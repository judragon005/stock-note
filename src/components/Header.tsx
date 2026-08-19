import React, { useState } from 'react';
import { TrendingUp, PlusCircle, Download, Upload, DollarSign, Palette } from 'lucide-react';
import { MarketType, ColorThemeMode } from '../types/stock';

interface HeaderProps {
  currentMarket: 'ALL' | MarketType;
  onSelectMarket: (market: 'ALL' | MarketType) => void;
  usdToTwdRate: number;
  onUpdateRate: (rate: number) => void;
  colorTheme: ColorThemeMode;
  onToggleColorTheme: () => void;
  onOpenTradeModal: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMarket,
  onSelectMarket,
  usdToTwdRate,
  onUpdateRate,
  colorTheme,
  onToggleColorTheme,
  onOpenTradeModal,
  onExportJSON,
  onExportCSV,
  onImportJSON,
}) => {
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(usdToTwdRate.toString());

  const handleRateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(rateInput);
    if (!isNaN(parsed) && parsed > 0) {
      onUpdateRate(parsed);
      setIsEditingRate(false);
    }
  };

  return (
    <header className="glass-card" style={{ padding: '18px 24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        {/* Brand & Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)'
          }}>
            <TrendingUp size={24} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>
              股票交易紀錄與分析儀
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              美股 · 台股 雙市場精確會計與資產配置
            </p>
          </div>
        </div>

        {/* Market Filter Tabs */}
        <div style={{
          display: 'flex',
          background: 'rgba(30, 41, 59, 0.7)',
          padding: '4px',
          borderRadius: '10px',
          border: '1px solid var(--border-color)'
        }}>
          {(['ALL', 'TW', 'US'] as const).map((m) => (
            <button
              key={m}
              onClick={() => onSelectMarket(m)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: currentMarket === m ? '#10b981' : 'transparent',
                color: currentMarket === m ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: currentMarket === m ? 700 : 500,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {m === 'ALL' ? '全部市場' : m === 'TW' ? '🇹🇼 台股 (TWD)' : '🇺🇸 美股 (USD)'}
            </button>
          ))}
        </div>

        {/* Action Controls & Rate Config */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Color Theme Toggle */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={onToggleColorTheme}
            title="切換漲跌色彩模式 (台股紅漲綠跌 / 國際綠漲紅跌)"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px' }}
          >
            <Palette size={13} color="var(--primary-color)" />
            <span style={{ fontSize: '0.75rem' }}>
              {colorTheme === 'taiwan' ? '🔴 紅漲 🟢 綠跌' : '🟢 綠漲 🔴 跌'}
            </span>
          </button>

          {/* Exchange Rate Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(30, 41, 59, 0.5)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)'
          }}>
            <DollarSign size={14} color="#f59e0b" />
            <span>USD/TWD:</span>
            {isEditingRate ? (
              <form onSubmit={handleRateSubmit} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  step="0.01"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  style={{
                    width: '60px',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    background: '#090d16',
                    border: '1px solid #10b981',
                    color: '#fff',
                    fontSize: '0.75rem'
                  }}
                  autoFocus
                />
                <button type="submit" className="btn btn-sm btn-primary" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>存</button>
              </form>
            ) : (
              <span
                onClick={() => setIsEditingRate(true)}
                className="mono"
                style={{ color: '#f8fafc', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline dotted' }}
                title="點擊修改換算匯率"
              >
                {usdToTwdRate.toFixed(2)}
              </span>
            )}
          </div>

          {/* Backup / Export Buttons */}
          <button className="btn btn-secondary btn-sm" onClick={onExportJSON} title="匯出完整 JSON 備份檔">
            <Download size={14} /> JSON
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onExportCSV} title="匯出 CSV 試算表">
            <Download size={14} /> CSV
          </button>

          {/* Import file */}
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }} title="從 JSON 還原備份">
            <Upload size={14} /> 匯入
            <input type="file" accept=".json" onChange={onImportJSON} style={{ display: 'none' }} />
          </label>

          {/* New Trade Record Button */}
          <button className="btn btn-primary" onClick={onOpenTradeModal}>
            <PlusCircle size={16} /> 新增交易
          </button>
        </div>
      </div>
    </header>
  );
};
