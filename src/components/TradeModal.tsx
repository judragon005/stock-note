import React, { useState, useEffect } from 'react';
import { TradeRecord, MarketType, TradeType, Currency } from '../types/stock';
import { X, Plus, Calculator } from 'lucide-react';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTrade: (trade: Omit<TradeRecord, 'id' | 'createdAt'>) => void;
  initialSymbol?: string;
  initialType?: TradeType;
}

export const TradeModal: React.FC<TradeModalProps> = ({
  isOpen,
  onClose,
  onSaveTrade,
  initialSymbol = '',
  initialType = 'BUY',
}) => {
  const [market, setMarket] = useState<MarketType>('TW');
  const [type, setType] = useState<TradeType>(initialType);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [symbol, setSymbol] = useState<string>(initialSymbol);
  const [name, setName] = useState<string>('');
  const [shares, setShares] = useState<string>('1000');
  const [price, setPrice] = useState<string>('');
  const [fee, setFee] = useState<string>('0');
  const [tax, setTax] = useState<string>('0');
  const [tagInput, setTagInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>(['核心持股']);
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (initialSymbol) {
      setSymbol(initialSymbol);
      // 自動推測市場：若全為數字或4碼通常為台股，若英文字母通常為美股
      if (/^[0-9]+$/.test(initialSymbol)) {
        setMarket('TW');
      } else {
        setMarket('US');
        setShares('10');
      }
    }
    setType(initialType);
  }, [initialSymbol, initialType, isOpen]);

  // 當市場切換時調整預設股數與預設幣別
  const currency: Currency = market === 'US' ? 'USD' : 'TWD';

  // 自動估算手續費與稅費
  const autoCalculateFees = () => {
    const s = parseFloat(shares) || 0;
    const p = parseFloat(price) || 0;
    const gross = s * p;

    if (market === 'TW') {
      // 台股手續費 0.1425%（設最低20元）
      const estimatedFee = Math.max(20, Math.round(gross * 0.001425));
      setFee(estimatedFee.toString());

      // 賣出時計算證交稅 0.3% (ETF 為 0.1%)
      if (type === 'SELL') {
        const isETF = symbol.startsWith('00');
        const taxRate = isETF ? 0.001 : 0.003;
        const estimatedTax = Math.round(gross * taxRate);
        setTax(estimatedTax.toString());
      } else {
        setTax('0');
      }
    } else {
      // 美股通常主流券商免手續費，賣出時有極小規費
      if (type === 'SELL') {
        const secFee = Math.max(0.01, +(gross * 0.0000278).toFixed(2));
        setFee('0');
        setTax(secFee.toString());
      } else {
        setFee('0');
        setTax('0');
      }
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = parseFloat(shares);
    const p = parseFloat(price);
    const f = parseFloat(fee) || 0;
    const t = parseFloat(tax) || 0;

    if (!symbol.trim() || isNaN(s) || isNaN(p) || s <= 0 || p <= 0) {
      alert('請填寫有效的標的代碼、股數與成交單價！');
      return;
    }

    onSaveTrade({
      date,
      symbol: symbol.trim().toUpperCase(),
      name: name.trim() || symbol.trim().toUpperCase(),
      market,
      currency,
      type,
      shares: s,
      price: p,
      fee: f,
      tax: t,
      tags,
      note: note.trim(),
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(3, 7, 18, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-card animate-fade-in" style={{
        width: '100%',
        maxWidth: '560px',
        padding: '28px',
        position: 'relative',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        {/* Title */}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', color: '#ffffff' }}>
          📝 錄入股票交易紀錄
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Market & Type Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            {/* Market */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                交易市場
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => { setMarket('TW'); setShares('1000'); }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: market === 'TW' ? '#3b82f6' : 'rgba(30, 41, 59, 0.6)',
                    color: market === 'TW' ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  🇹🇼 台股 (TWD)
                </button>
                <button
                  type="button"
                  onClick={() => { setMarket('US'); setShares('10'); }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: market === 'US' ? '#8b5cf6' : 'rgba(30, 41, 59, 0.6)',
                    color: market === 'US' ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  🇺🇸 美股 (USD)
                </button>
              </div>
            </div>

            {/* Trade Type */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                交易類別
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['BUY', 'SELL', 'DIVIDEND'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: type === t
                        ? t === 'BUY' ? '#10b981' : t === 'SELL' ? '#f43f5e' : '#f59e0b'
                        : 'rgba(30, 41, 59, 0.6)',
                      color: type === t ? '#fff' : 'var(--text-secondary)',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {t === 'BUY' ? '買進' : t === 'SELL' ? '賣出' : '配息'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Date & Symbol */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                交易日期
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  fontSize: '0.875rem'
                }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                標的代碼 (Ticker)
              </label>
              <input
                type="text"
                placeholder={market === 'TW' ? '如: 2330, 0050' : '如: AAPL, NVDA'}
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  fontSize: '0.875rem',
                  textTransform: 'uppercase'
                }}
                required
              />
            </div>
          </div>

          {/* Name & Shares & Price */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                標的名稱 (選填)
              </label>
              <input
                type="text"
                placeholder="如: 台積電"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                成交股數
              </label>
              <input
                type="number"
                step="any"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  fontSize: '0.875rem',
                  textAlign: 'right'
                }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                成交單價 ({currency})
              </label>
              <input
                type="number"
                step="any"
                placeholder="每股價格"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  fontSize: '0.875rem',
                  textAlign: 'right'
                }}
                required
              />
            </div>
          </div>

          {/* Fee & Tax Calculation */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.4)',
            padding: '14px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                手續費與稅費核算
              </span>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={autoCalculateFees}
                style={{ padding: '2px 8px', fontSize: '0.7rem' }}
              >
                <Calculator size={12} /> 自動試算標準費率
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  交易手續費 ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: '#fff',
                    fontSize: '0.8rem',
                    textAlign: 'right'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  證交稅 / 扣繳稅額 ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: '#fff',
                    fontSize: '0.8rem',
                    textAlign: 'right'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Strategy Tags */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
              策略標籤 (Tags)
            </label>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
              {tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem'
                  }}
                >
                  {tag}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => handleRemoveTag(tag)} />
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="輸入標籤後按新增..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  fontSize: '0.8rem'
                }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddTag}
              >
                <Plus size={14} /> 新增
              </button>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
              交易備註 (筆記與心態)
            </label>
            <textarea
              placeholder="記錄買進理由、停損利計畫或市場觀察..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                fontSize: '0.85rem',
                resize: 'none'
              }}
            />
          </div>

          {/* Submit & Cancel Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              確認儲存交易
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
