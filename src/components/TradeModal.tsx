import React, { useState, useEffect, useRef } from 'react';
import { TradeRecord, MarketType, TradeType, Currency } from '../types/stock';
import { calculateTaiwanFee, calculateTaiwanTax } from '../engine/calculator';
import { X, Plus, Calculator, Zap, Sparkles } from 'lucide-react';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTrade: (trade: Omit<TradeRecord, 'id' | 'createdAt'>) => void;
  initialSymbol?: string;
  initialType?: TradeType;
}

interface StockSuggestion {
  symbol: string;
  name: string;
  market: MarketType;
}

const POPULAR_STOCKS: StockSuggestion[] = [
  // 台股熱門
  { symbol: '2330', name: '台積電', market: 'TW' },
  { symbol: '0050', name: '元大台灣50', market: 'TW' },
  { symbol: '00878', name: '國泰永續高股息', market: 'TW' },
  { symbol: '0056', name: '元大高股息', market: 'TW' },
  { symbol: '00919', name: '群益台灣精選高息', market: 'TW' },
  { symbol: '00929', name: '復華台灣科技優息', market: 'TW' },
  { symbol: '006208', name: '富邦台50', market: 'TW' },
  { symbol: '2454', name: '聯發科', market: 'TW' },
  { symbol: '2317', name: '鴻海', market: 'TW' },
  { symbol: '2881', name: '富邦金', market: 'TW' },
  { symbol: '2882', name: '國泰金', market: 'TW' },
  { symbol: '2603', name: '長榮', market: 'TW' },
  // 美股熱門
  { symbol: 'NVDA', name: 'NVIDIA 輝達', market: 'US' },
  { symbol: 'AAPL', name: 'Apple 蘋果', market: 'US' },
  { symbol: 'TSLA', name: 'Tesla 特斯拉', market: 'US' },
  { symbol: 'MSFT', name: 'Microsoft 微軟', market: 'US' },
  { symbol: 'AMZN', name: 'Amazon 亞馬遜', market: 'US' },
  { symbol: 'GOOGL', name: 'Alphabet Google', market: 'US' },
  { symbol: 'META', name: 'Meta 臉書', market: 'US' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', market: 'US' },
  { symbol: 'QQQ', name: 'Invesco QQQ 納指100', market: 'US' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', market: 'US' },
  { symbol: 'VT', name: 'Vanguard 全世界股票 ETF', market: 'US' },
  { symbol: 'TLT', name: 'iShares 20年期以上美國公債 ETF', market: 'US' },
];

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

  // 智慧折數與連續記帳狀態
  const [feeDiscount, setFeeDiscount] = useState<string>('0.28'); // 預設 2.8 折
  const [customDiscount, setCustomDiscount] = useState<string>('0.28');
  const [hasMinFee, setHasMinFee] = useState<boolean>(true); // 預設有 20 元低消
  const [continuousMode, setContinuousMode] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  const symbolInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialSymbol) {
      setSymbol(initialSymbol);
      if (/^[0-9]+$/.test(initialSymbol)) {
        setMarket('TW');
      } else {
        setMarket('US');
        setShares('10');
      }
    }
    setType(initialType);
  }, [initialSymbol, initialType, isOpen]);

  const currency: Currency = market === 'US' ? 'USD' : 'TWD';

  // 取得有效的手續費折扣比例（純計算，無閉包依賴）
  const getDiscountRate = (discount: string, custom: string): number => {
    if (discount === 'custom') {
      const val = parseFloat(custom);
      return isNaN(val) ? 1.0 : val;
    }
    return parseFloat(discount) || 1.0;
  };

  // 自動試算手續費（供手動按鈕呼叫）
  const autoCalculateFees = () => {
    const s = parseFloat(shares) || 0;
    const p = parseFloat(price) || 0;
    recalcFees(p, s, market, type, feeDiscount, customDiscount, hasMinFee, symbol);
  };

  // 純函式：根據所有參數重新計算費用，避免 stale closure
  const recalcFees = (
    p: number, s: number,
    mkt: typeof market, tradeType: typeof type,
    discount: string, customDisc: string,
    minFeeOn: boolean, sym: string
  ) => {
    if (mkt === 'TW') {
      const discountRate = getDiscountRate(discount, customDisc);
      const minFee = minFeeOn ? 20 : 0;
      setFee(calculateTaiwanFee(p, s, discountRate, minFee).toString());
      if (tradeType === 'SELL') {
        const isETF = sym.startsWith('00') || sym.startsWith('01');
        setTax(calculateTaiwanTax(p, s, isETF).toString());
      } else {
        setTax('0');
      }
    } else {
      if (tradeType === 'SELL') {
        const gross = s * p;
        setFee('0');
        setTax(Math.max(0.01, +(gross * 0.0000278).toFixed(2)).toString());
      } else {
        setFee('0');
        setTax('0');
      }
    }
  };

  // 當價格、股數、市場或折數改變時，自動更新費用 (完整 deps，無 stale closure)
  useEffect(() => {
    const p = parseFloat(price) || 0;
    const s = parseFloat(shares) || 0;
    if (p > 0 && s > 0) {
      recalcFees(p, s, market, type, feeDiscount, customDiscount, hasMinFee, symbol);
    }
  }, [price, shares, market, type, feeDiscount, customDiscount, hasMinFee, symbol]);

  // 點擊外部自動關閉 Autosuggest 下拉
  useEffect(() => {
    const handleClickOutside = () => setShowSuggestions(false);
    if (showSuggestions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showSuggestions]);

  // 過濾智慧建議候選標的
  const filteredSuggestions = POPULAR_STOCKS.filter((stock) => {
    if (!symbol.trim()) return stock.market === market;
    const query = symbol.trim().toUpperCase();
    return (
      stock.symbol.toUpperCase().includes(query) ||
      stock.name.includes(query)
    );
  }).slice(0, 6);

  const handleSelectSuggestion = (suggestion: StockSuggestion) => {
    setSymbol(suggestion.symbol);
    setName(suggestion.name);
    setMarket(suggestion.market);
    if (suggestion.market === 'US' && shares === '1000') {
      setShares('10');
    } else if (suggestion.market === 'TW' && shares === '10') {
      setShares('1000');
    }
    setShowSuggestions(false);
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

    if (continuousMode) {
      // 連續記帳模式：保留日期、市場與折數，清空代碼、價格與備註
      setSymbol('');
      setName('');
      setPrice('');
      setFee('0');
      setTax('0');
      setNote('');
      if (symbolInputRef.current) {
        symbolInputRef.current.focus();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 7, 18, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '580px',
          padding: '28px',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
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
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <span style={{ fontSize: '1.4rem' }}>📝</span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
            錄入股票交易紀錄
          </h2>
        </div>

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
                  onClick={() => {
                    setMarket('TW');
                    if (shares === '10') setShares('1000');
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: market === 'TW' ? '#3b82f6' : 'rgba(30, 41, 59, 0.6)',
                    color: market === 'TW' ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  🇹🇼 台股 (TWD)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMarket('US');
                    if (shares === '1000') setShares('10');
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: market === 'US' ? '#8b5cf6' : 'rgba(30, 41, 59, 0.6)',
                    color: market === 'US' ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
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
                      background:
                        type === t
                          ? t === 'BUY'
                            ? '#10b981'
                            : t === 'SELL'
                            ? '#f43f5e'
                            : '#f59e0b'
                          : 'rgba(30, 41, 59, 0.6)',
                      color: type === t ? '#fff' : 'var(--text-secondary)',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {t === 'BUY' ? '買進' : t === 'SELL' ? '賣出' : '配息'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Date & Symbol with Autosuggest */}
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
                  fontSize: '0.875rem',
                }}
                required
              />
            </div>

            {/* Symbol Autosuggest Container */}
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  標的代碼 (Ticker)
                </label>
                <span style={{ fontSize: '0.7rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <Sparkles size={11} /> 智慧建議
                </span>
              </div>
              <input
                ref={symbolInputRef}
                type="text"
                placeholder={market === 'TW' ? '如: 2330, 0050' : '如: AAPL, NVDA'}
                value={symbol}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  setSymbol(e.target.value);
                  setShowSuggestions(true);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  fontSize: '0.875rem',
                  textTransform: 'uppercase',
                }}
                required
              />

              {/* Autosuggest Dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    zIndex: 50,
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }}
                >
                  {filteredSuggestions.map((item) => (
                    <div
                      key={item.symbol}
                      onClick={() => handleSelectSuggestion(item)}
                      style={{
                        padding: '8px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="mono" style={{ fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>
                          {item.symbol}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {item.name}
                        </span>
                      </div>
                      <span className={`badge ${item.market === 'TW' ? 'badge-tw' : 'badge-us'}`} style={{ fontSize: '0.65rem' }}>
                        {item.market}
                      </span>
                    </div>
                  ))}
                </div>
              )}
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
                  fontSize: '0.875rem',
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
                  textAlign: 'right',
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
                  textAlign: 'right',
                }}
                required
              />
            </div>
          </div>

          {/* Fee & Tax Calculation with Broker Discount */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.4)',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                手續費與稅費核算
              </span>

              {/* 台股券商折數選擇器 */}
              {market === 'TW' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>券商折數:</label>
                  <select
                    value={feeDiscount}
                    onChange={(e) => setFeeDiscount(e.target.value)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: '#60a5fa',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    <option value="1.0">原價 (不打折)</option>
                    <option value="0.6">6 折 (0.60)</option>
                    <option value="0.5">5 折 (0.50)</option>
                    <option value="0.28">2.8 折 (0.28)</option>
                    <option value="0.2">2 折 (0.20)</option>
                    <option value="custom">自訂折數</option>
                  </select>

                  {feeDiscount === 'custom' && (
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.28"
                      value={customDiscount}
                      onChange={(e) => setCustomDiscount(e.target.value)}
                      style={{
                        width: '60px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        color: '#fff',
                        fontSize: '0.75rem',
                      }}
                    />
                  )}

                  <label style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={hasMinFee}
                      onChange={(e) => setHasMinFee(e.target.checked)}
                    />
                    低消20元
                  </label>
                </div>
              )}

              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={autoCalculateFees}
                style={{ padding: '3px 8px', fontSize: '0.7rem' }}
              >
                <Calculator size={12} /> 自動試算
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
                    textAlign: 'right',
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
                    textAlign: 'right',
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
                    fontSize: '0.75rem',
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
                  fontSize: '0.8rem',
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
          <div style={{ marginBottom: '20px' }}>
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
                resize: 'none',
              }}
            />
          </div>

          {/* Continuous Mode Switch & Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={continuousMode}
                onChange={(e) => setContinuousMode(e.target.checked)}
              />
              <Zap size={14} color={continuousMode ? '#f59e0b' : 'var(--text-muted)'} />
              <span style={{ fontWeight: continuousMode ? 600 : 400, color: continuousMode ? '#f59e0b' : 'inherit' }}>
                連續快速記帳模式
              </span>
            </label>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                取消
              </button>
              <button type="submit" className="btn btn-primary">
                {continuousMode ? '儲存並繼續新增' : '確認儲存交易'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
