import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TradeRecord, MarketType, TradeType, Currency, BrokerAccount, TradePlan } from '../types/stock';
import { calculateTaiwanFee, calculateTaiwanTax, getHoldingsAsOfDate } from '../engine/calculator';
import { calculatePlannedRiskRewardRatio } from '../engine/riskAlertEngine';
import { X, Plus, Calculator, Zap, Sparkles, Calendar, Target, ShieldAlert, TrendingUp } from 'lucide-react';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTrade: (trade: Omit<TradeRecord, 'id' | 'createdAt'>, existingTradeId?: string) => void;
  editingTrade?: TradeRecord | null;
  initialSymbol?: string;
  initialType?: TradeType;
  initialMarket?: MarketType;
  initialAccountId?: string;
  trades?: TradeRecord[];
  accounts?: BrokerAccount[];
}

interface StockSuggestion {
  symbol: string;
  name: string;
  market: MarketType;
}

/**
 * 依據目標市場與給定的候選帳戶 ID，計算有效相容的帳戶 ID
 */
export function getEffectiveAccountIdForMarket(
  targetMarket: MarketType,
  candidateAccountId: string | undefined,
  accounts: BrokerAccount[]
): string {
  if (candidateAccountId) {
    const matched = accounts.find((a) => a.id === candidateAccountId);
    if (matched && matched.market === targetMarket) {
      return matched.id;
    }
  }
  const defaultAcc = accounts.find((a) => a.market === targetMarket && a.isDefault);
  if (defaultAcc) return defaultAcc.id;
  const firstAcc = accounts.find((a) => a.market === targetMarket);
  if (firstAcc) return firstAcc.id;
  return targetMarket === 'TW' ? 'broker-tw-default' : 'broker-us-default';
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
  editingTrade,
  initialSymbol = '',
  initialType = 'BUY',
  initialMarket = 'TW',
  initialAccountId,
  trades = [],
  accounts = [],
}) => {
  const [market, setMarket] = useState<MarketType>(initialMarket);
  const [accountId, setAccountId] = useState<string>(() =>
    getEffectiveAccountIdForMarket(initialMarket, initialAccountId, accounts)
  );
  const [type, setType] = useState<TradeType>(initialType);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [symbol, setSymbol] = useState<string>(initialSymbol);
  const [name, setName] = useState<string>('');
  const [shares, setShares] = useState<string>('1000');
  const [price, setPrice] = useState<string>('');
  const [fee, setFee] = useState<string>('0');
  const [tax, setTax] = useState<string>('0');
  const [ratio, setRatio] = useState<string>('');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [targetSymbol, setTargetSymbol] = useState<string>('');
  const [targetName, setTargetName] = useState<string>('');
  const [allocationRatio, setAllocationRatio] = useState<string>('0.2');
  const [conversionPrice, setConversionPrice] = useState<string>('');
  const [tagInput, setTagInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>(['核心持股']);
  const [note, setNote] = useState<string>('');

  // 交易計畫與風控狀態 (Trade Plan)
  const [entryReason, setEntryReason] = useState<string>('');
  const [stopLossPrice, setStopLossPrice] = useState<string>('');
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>('');
  const [isPlanExpanded, setIsPlanExpanded] = useState<boolean>(false);

  // 智慧折數與連續記帳狀態
  const [feeDiscount, setFeeDiscount] = useState<string>('0.28'); // 預設 2.8 折
  const [customDiscount, setCustomDiscount] = useState<string>('0.28');
  const [hasMinFee, setHasMinFee] = useState<boolean>(true); // 預設有 20 元低消
  const [continuousMode, setContinuousMode] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  const symbolInputRef = useRef<HTMLInputElement>(null);

  // 判定所選日期當時之持股數量
  const asOfShares = useMemo(() => {
    if (!symbol.trim()) return 0;
    return getHoldingsAsOfDate(trades, date, symbol.trim().toUpperCase());
  }, [trades, date, symbol]);

  // 切換市場時連動帳戶與手續費折數
  const handleMarketChange = (newMarket: MarketType) => {
    setMarket(newMarket);
    const nextAccId = getEffectiveAccountIdForMarket(newMarket, accountId, accounts);
    setAccountId(nextAccId);
    if (newMarket === 'TW') {
      if (shares === '10') setShares('1000');
      const acc = accounts.find((a) => a.id === nextAccId);
      if (acc) {
        setFeeDiscount(acc.discountRate.toString());
      }
    } else {
      if (shares === '1000') setShares('10');
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (editingTrade) {
        setMarket(editingTrade.market);
        setAccountId(editingTrade.accountId || (editingTrade.market === 'US' ? 'broker-us-default' : 'broker-tw-default'));
        setType(editingTrade.type);
        setDate(editingTrade.date);
        setSymbol(editingTrade.symbol);
        setName(editingTrade.name || '');
        setShares(editingTrade.shares !== undefined ? editingTrade.shares.toString() : '0');
        setPrice(editingTrade.price !== undefined ? editingTrade.price.toString() : '0');
        setFee(editingTrade.fee !== undefined ? editingTrade.fee.toString() : '0');
        setTax(editingTrade.tax !== undefined ? editingTrade.tax.toString() : '0');
        setRatio(editingTrade.ratio !== undefined ? editingTrade.ratio.toString() : '');
        setCashAmount(editingTrade.cashAmount !== undefined ? editingTrade.cashAmount.toString() : '');
        setTargetSymbol(editingTrade.targetSymbol || '');
        setTargetName(editingTrade.targetName || '');
        setAllocationRatio(editingTrade.allocationRatio !== undefined ? editingTrade.allocationRatio.toString() : '0.2');
        setConversionPrice(editingTrade.conversionPrice !== undefined ? editingTrade.conversionPrice.toString() : '');
        setTags(editingTrade.tags || []);
        setNote(editingTrade.note || '');
        if (editingTrade.plan) {
          setEntryReason(editingTrade.plan.entryReason || '');
          setStopLossPrice(editingTrade.plan.stopLossPrice !== undefined ? editingTrade.plan.stopLossPrice.toString() : '');
          setTakeProfitPrice(editingTrade.plan.takeProfitPrice !== undefined ? editingTrade.plan.takeProfitPrice.toString() : '');
          setIsPlanExpanded(true);
        } else {
          setEntryReason('');
          setStopLossPrice('');
          setTakeProfitPrice('');
          setIsPlanExpanded(false);
        }
        return;
      }

      let targetMkt: MarketType = initialMarket || 'TW';
      if (initialSymbol) {
        setSymbol(initialSymbol);
        if (/^[0-9]+$/.test(initialSymbol)) {
          targetMkt = 'TW';
          setShares('1000');
        } else {
          targetMkt = 'US';
          setShares('10');
        }
      }
      setMarket(targetMkt);
      const effectiveId = getEffectiveAccountIdForMarket(targetMkt, initialAccountId, accounts);
      setAccountId(effectiveId);

      const chosenAcc = accounts.find((a) => a.id === effectiveId);
      if (chosenAcc && chosenAcc.market === 'TW') {
        setFeeDiscount(chosenAcc.discountRate.toString());
      }
      setType(initialType);
      setEntryReason('');
      setStopLossPrice('');
      setTakeProfitPrice('');
      setIsPlanExpanded(false);
    }
  }, [initialSymbol, initialType, initialMarket, initialAccountId, isOpen, accounts, editingTrade]);

  // 當切換類別時，動態設置預設提示與計算
  useEffect(() => {
    if (type === 'STOCK_DIVIDEND') {
      if (!ratio) setRatio('0.05');
      if (asOfShares > 0 && (!shares || shares === '1000' || shares === '10')) {
        const estShares = Math.round(asOfShares * 0.05);
        setShares(estShares > 0 ? estShares.toString() : '50');
      }
      setPrice('0');
      setFee('0');
      setTax('0');
    } else if (type === 'STOCK_SPLIT') {
      if (!ratio) setRatio('10');
      setShares('0');
      setPrice('0');
      setFee('0');
      setTax('0');
    } else if (type === 'CAPITAL_REDUCTION') {
      if (!ratio) setRatio('0.2');
      if (!price) setPrice('2');
      if (asOfShares > 0) {
        const reduced = Math.round(asOfShares * 0.2);
        setShares(reduced.toString());
        setCashAmount((asOfShares * 2).toString());
      }
      setFee('0');
      setTax('0');
    } else if (type === 'DIVIDEND') {
      if (asOfShares > 0 && price && parseFloat(price) > 0) {
        setCashAmount((asOfShares * parseFloat(price)).toString());
      }
    } else if (type === 'STOCK_MERGER') {
      if (asOfShares > 0 && (!shares || shares === '1000')) {
        setShares(asOfShares.toString());
      }
      if (!ratio) setRatio('1.0');
    } else if (type === 'PREFERRED_REDEMPTION') {
      if (asOfShares > 0) {
        setShares(asOfShares.toString());
        setPrice('50');
        setCashAmount((asOfShares * 50).toString());
      }
    } else if (type === 'SPIN_OFF') {
      if (!ratio) setRatio('0.2');
      if (!allocationRatio) setAllocationRatio('0.2');
      if (asOfShares > 0) {
        setShares(Math.round(asOfShares * 0.2).toString());
      }
    } else if (type === 'CB_CONVERSION') {
      if (!conversionPrice) setConversionPrice('50');
      if (!cashAmount) setCashAmount('100000');
      setShares('2000');
    } else if (type === 'TENDER_OFFER') {
      if (asOfShares > 0) {
        setShares(asOfShares.toString());
      }
    }
  }, [type, asOfShares]);

  const currency: Currency = market === 'US' ? 'USD' : 'TWD';

  // 取得有效的手續費折扣比例
  const getDiscountRate = (discount: string, custom: string): number => {
    if (discount === 'custom') {
      const val = parseFloat(custom);
      return isNaN(val) ? 1.0 : val;
    }
    return parseFloat(discount) || 1.0;
  };

  // 自動試算手續費
  const autoCalculateFees = () => {
    const s = parseFloat(shares) || 0;
    const p = parseFloat(price) || 0;
    recalcFees(p, s, market, type, feeDiscount, customDiscount, hasMinFee, symbol);
  };

  // 純函式：根據所有參數重新計算費用
  const recalcFees = (
    p: number, s: number,
    mkt: typeof market, tradeType: typeof type,
    discount: string, customDisc: string,
    minFeeOn: boolean, sym: string
  ) => {
    if (tradeType !== 'BUY' && tradeType !== 'SELL' && tradeType !== 'CAPITAL_INCREASE') {
      setFee('0');
      setTax('0');
      return;
    }

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

  // 當價格、股數、市場或折數改變時，自動更新費用
  useEffect(() => {
    const p = parseFloat(price) || 0;
    const s = parseFloat(shares) || 0;
    if (p > 0 && s > 0 && (type === 'BUY' || type === 'SELL' || type === 'CAPITAL_INCREASE')) {
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
    handleMarketChange(suggestion.market);
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
    const s = parseFloat(shares) || 0;
    const p = parseFloat(price) || 0;
    const f = parseFloat(fee) || 0;
    const t = parseFloat(tax) || 0;
    const r = ratio ? parseFloat(ratio) : undefined;
    const c = cashAmount ? parseFloat(cashAmount) : undefined;

    if (!symbol.trim()) {
      alert('請填寫有效的標的代碼！');
      return;
    }

    if ((type === 'BUY' || type === 'SELL' || type === 'CAPITAL_INCREASE') && (s <= 0 || p <= 0)) {
      alert('買賣或增資請填寫大於 0 的股數與單價！');
      return;
    }

    const numPrice = parseFloat(price) || 0;
    const numStopLoss = stopLossPrice ? parseFloat(stopLossPrice) : undefined;
    const numTakeProfit = takeProfitPrice ? parseFloat(takeProfitPrice) : undefined;

    let tradePlan: TradePlan | undefined = undefined;
    if (entryReason.trim() || numStopLoss !== undefined || numTakeProfit !== undefined) {
      const rr =
        numPrice > 0
          ? calculatePlannedRiskRewardRatio(numPrice, numStopLoss, numTakeProfit)
          : undefined;
      tradePlan = {
        entryReason: entryReason.trim() || undefined,
        stopLossPrice: numStopLoss,
        takeProfitPrice: numTakeProfit,
        plannedRiskRewardRatio: rr,
      };
    }

    onSaveTrade(
      {
        date,
        symbol: symbol.trim().toUpperCase(),
        name: name.trim() || symbol.trim().toUpperCase(),
        market,
        currency,
        type,
        accountId,
        shares: s,
        price: p,
        fee: f,
        tax: t,
        ratio: r,
        cashAmount: c,
        exDate: date,
        targetSymbol: targetSymbol ? targetSymbol.trim().toUpperCase() : undefined,
        targetName: targetName ? targetName.trim() : undefined,
        allocationRatio: allocationRatio ? parseFloat(allocationRatio) : undefined,
        conversionPrice: conversionPrice ? parseFloat(conversionPrice) : undefined,
        tags,
        note: note.trim(),
        plan: tradePlan,
      },
      editingTrade?.id
    );

    if (continuousMode && !editingTrade) {
      // 連續記帳模式：保留日期、市場與折數，清空代碼、價格與備註
      setSymbol('');
      setName('');
      setPrice('');
      setShares('1000');
      setFee('0');
      setTax('0');
      setRatio('');
      setCashAmount('');
      setTargetSymbol('');
      setTargetName('');
      setAllocationRatio('0.2');
      setConversionPrice('');
      setNote('');
      setEntryReason('');
      setStopLossPrice('');
      setTakeProfitPrice('');
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
          maxWidth: '640px',
          padding: '28px',
          position: 'relative',
          maxHeight: '92vh',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <span style={{ fontSize: '1.4rem' }}>{editingTrade ? '✏️' : '📝'}</span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
            {editingTrade
              ? `編輯交易紀錄 (${editingTrade.symbol})`
              : type === 'BUY'
              ? '新增買進紀錄'
              : type === 'SELL'
              ? '新增賣出結算'
              : type === 'DIVIDEND'
              ? '記錄現金股利 (除息)'
              : type === 'STOCK_DIVIDEND'
              ? '記錄除權配股'
              : type === 'STOCK_SPLIT'
              ? '記錄股票分割/反分割'
              : type === 'CAPITAL_REDUCTION'
              ? '記錄現金/虧損減資'
              : type === 'CAPITAL_INCREASE'
              ? '記錄現金增資認股'
              : type === 'STOCK_MERGER'
              ? '記錄換股合併 / 股份轉換'
              : type === 'PREFERRED_REDEMPTION'
              ? '記錄特別股收回 / 贖回'
              : type === 'SPIN_OFF'
              ? '記錄企業分拆獨立上市'
              : type === 'CB_CONVERSION'
              ? '記錄可轉債 (CB) 換股普通股'
              : '記錄公開收購 / 私有化下市'}
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Market & Category Selector */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              {/* Market */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                  交易市場
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleMarketChange('TW')}
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
                    onClick={() => handleMarketChange('US')}
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

              {/* Broker Account Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                  所屬券商帳戶
                </label>
                <select
                  value={accountId}
                  onChange={(e) => {
                    const chosenId = e.target.value;
                    setAccountId(chosenId);
                    const acc = accounts.find((a) => a.id === chosenId);
                    if (acc && acc.market === 'TW') {
                      setFeeDiscount(acc.discountRate.toString());
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'rgba(30, 41, 59, 0.9)',
                    color: '#38bdf8',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                >
                  {accounts
                    .filter((acc) => acc.market === market)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id} style={{ background: '#1e293b', color: '#ffffff' }}>
                        {acc.name}
                      </option>
                    ))}
                  {accounts.filter((acc) => acc.market === market).length === 0 && (
                    <option value={market === 'TW' ? 'broker-tw-default' : 'broker-us-default'}>
                      {market === 'TW' ? '預設台股帳戶' : '預設美股帳戶'}
                    </option>
                  )}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                  常用買賣
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
                      {t === 'BUY' ? '買進' : t === 'SELL' ? '賣出' : '除息'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Corporate Actions Tabs */}
            <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  🏢 常規公司行動 (Standard Actions)
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {[
                  { key: 'STOCK_DIVIDEND', label: '除權/配股' },
                  { key: 'STOCK_SPLIT', label: '股票分割' },
                  { key: 'CAPITAL_REDUCTION', label: '現金/虧損減資' },
                  { key: 'CAPITAL_INCREASE', label: '現金增資認股' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setType(item.key as TradeType)}
                    style={{
                      padding: '6px 4px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: type === item.key ? '#6366f1' : 'rgba(15, 23, 42, 0.6)',
                      color: type === item.key ? '#fff' : 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Special Corporate Actions Tabs */}
            <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ec4899' }}>
                  ⚡ 特殊公司行動 (Special Events)
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                {[
                  { key: 'STOCK_MERGER', label: '換股合併' },
                  { key: 'PREFERRED_REDEMPTION', label: '特別股贖回' },
                  { key: 'SPIN_OFF', label: '企業分拆' },
                  { key: 'CB_CONVERSION', label: '可轉債換股' },
                  { key: 'TENDER_OFFER', label: '公開收購' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setType(item.key as TradeType)}
                    style={{
                      padding: '6px 4px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: type === item.key ? '#db2777' : 'rgba(15, 23, 42, 0.6)',
                      color: type === item.key ? '#fff' : 'var(--text-secondary)',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Date & Symbol with Autosuggest */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                交易 / 基準日期
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

          {/* As of Date Holding Banner */}
          {symbol.trim() && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                marginBottom: '14px',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa' }}>
                <Calendar size={14} />
                <span>
                  截至 <strong>{date}</strong> 基準日持股：<strong>{asOfShares.toLocaleString()}</strong> 股
                </span>
              </div>
              {asOfShares === 0 && (
                <span style={{ color: '#f59e0b', fontSize: '0.72rem' }}>⚠️ 該日期前尚無買入持股</span>
              )}
            </div>
          )}

          {/* DYNAMIC FORM FIELDS BY TYPE */}
          {/* 1. 標準買賣 (BUY / SELL) */}
          {(type === 'BUY' || type === 'SELL') && (
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
          )}

          {/* 1.1 交易計畫與風控設定 (僅在 BUY 建倉時提供) */}
          {type === 'BUY' && (
            <div
              style={{
                marginBottom: '16px',
                borderRadius: '10px',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                background: 'rgba(15, 23, 42, 0.6)',
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                onClick={() => setIsPlanExpanded(!isPlanExpanded)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: isPlanExpanded ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  border: 'none',
                  color: '#93c5fd',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={16} color="#60a5fa" />
                  <span>🎯 交易作戰計畫與風控設定 (選填)</span>
                  {(stopLossPrice || takeProfitPrice || entryReason) && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: '#34d399',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      已設定
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {isPlanExpanded ? '▲ 收合' : '▼ 展開設定'}
                </span>
              </button>

              {isPlanExpanded && (
                <div style={{ padding: '14px', borderTop: '1px solid rgba(59, 130, 246, 0.15)' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '6px',
                        fontWeight: 600,
                      }}
                    >
                      進場理由 / 交易假說
                    </label>
                    <input
                      type="text"
                      placeholder="如：突破頸線、月線有撐、營收創高、季線回踩"
                      value={entryReason}
                      onChange={(e) => setEntryReason(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        color: '#fff',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                      marginBottom: '12px',
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.8rem',
                          color: '#f87171',
                          marginBottom: '6px',
                          fontWeight: 600,
                        }}
                      >
                        <ShieldAlert size={14} /> 預設停損價 ({currency})
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="跌破此價停損"
                        value={stopLossPrice}
                        onChange={(e) => setStopLossPrice(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'var(--bg-input)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#fca5a5',
                          fontSize: '0.85rem',
                          textAlign: 'right',
                        }}
                      />
                      {parseFloat(price) > 0 && parseFloat(stopLossPrice) > 0 && (
                        <div
                          style={{
                            fontSize: '0.72rem',
                            color: '#f87171',
                            marginTop: '4px',
                            textAlign: 'right',
                          }}
                        >
                          承擔風險：
                          {(
                            ((parseFloat(stopLossPrice) - parseFloat(price)) /
                              parseFloat(price)) *
                            100
                          ).toFixed(2)}
                          %
                        </div>
                      )}
                    </div>

                    <div>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.8rem',
                          color: '#34d399',
                          marginBottom: '6px',
                          fontWeight: 600,
                        }}
                      >
                        <TrendingUp size={14} /> 預設停利目標價 ({currency})
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="達此價分批停利"
                        value={takeProfitPrice}
                        onChange={(e) => setTakeProfitPrice(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'var(--bg-input)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          color: '#6ee7b7',
                          fontSize: '0.85rem',
                          textAlign: 'right',
                        }}
                      />
                      {parseFloat(price) > 0 && parseFloat(takeProfitPrice) > 0 && (
                        <div
                          style={{
                            fontSize: '0.72rem',
                            color: '#34d399',
                            marginTop: '4px',
                            textAlign: 'right',
                          }}
                        >
                          預期獲利：+
                          {(
                            ((parseFloat(takeProfitPrice) - parseFloat(price)) /
                              parseFloat(price)) *
                            100
                          ).toFixed(2)}
                          %
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 即時風報比 R:R 摘要卡片 */}
                  {parseFloat(price) > 0 &&
                    parseFloat(stopLossPrice) > 0 &&
                    parseFloat(takeProfitPrice) > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                          fontSize: '0.8rem',
                        }}
                      >
                        <span style={{ color: '#93c5fd' }}>⚡ 預期風報酬比 (Risk : Reward)：</span>
                        <span style={{ fontWeight: 700, color: '#60a5fa' }}>
                          1 :{' '}
                          {calculatePlannedRiskRewardRatio(
                            parseFloat(price),
                            parseFloat(stopLossPrice),
                            parseFloat(takeProfitPrice)
                          ) ?? '-'}
                        </span>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

          {/* 2. 除息 (DIVIDEND) */}
          {type === 'DIVIDEND' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                  每股配息 ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="如: 3.5"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    const p = parseFloat(e.target.value);
                    if (!isNaN(p) && asOfShares > 0) {
                      setCashAmount((p * asOfShares).toString());
                    }
                  }}
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
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                  配息總金額 ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="實收總配息"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: '#10b981',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    textAlign: 'right',
                  }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                  扣繳稅費 ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
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
                />
              </div>
            </div>
          )}

          {/* 3. 除權配股 (STOCK_DIVIDEND) */}
          {type === 'STOCK_DIVIDEND' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                  配股率 (每股配股 / 0.05=每千股配50股)
                </label>
                <input
                  type="number"
                  step="0.001"
                  placeholder="如: 0.05"
                  value={ratio}
                  onChange={(e) => {
                    setRatio(e.target.value);
                    const r = parseFloat(e.target.value);
                    if (!isNaN(r) && asOfShares > 0) {
                      setShares(Math.round(asOfShares * r).toString());
                    }
                  }}
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
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                  獲配股數 (增加持有股數)
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
                    color: '#818cf8',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    textAlign: 'right',
                  }}
                  required
                />
              </div>
            </div>
          )}

          {/* 4. 股票分割 (STOCK_SPLIT) */}
          {type === 'STOCK_SPLIT' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                分割倍率 (Ratio，如 10 代表 1 拆 10；0.5 代表 2 併 1)
              </label>
              <input
                type="number"
                step="any"
                placeholder="如: 10"
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: '#38bdf8',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  textAlign: 'right',
                }}
                required
              />
              {asOfShares > 0 && ratio && (
                <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  💡 分割後預估持股數將由 {asOfShares.toLocaleString()} 股調整為{' '}
                  <strong style={{ color: '#38bdf8' }}>
                    {(asOfShares * (parseFloat(ratio) || 1)).toLocaleString()}
                  </strong>{' '}
                  股（總投入成本保持不變）。
                </div>
              )}
            </div>
          )}

          {/* 5. 現金/虧損減資 (CAPITAL_REDUCTION) */}
          {type === 'CAPITAL_REDUCTION' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                  減資比例 (如 0.2 = 減資20%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.2"
                  value={ratio}
                  onChange={(e) => {
                    setRatio(e.target.value);
                    const r = parseFloat(e.target.value);
                    if (!isNaN(r) && asOfShares > 0) {
                      setShares(Math.round(asOfShares * r).toString());
                    }
                  }}
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
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                  減資扣減股數
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
                    color: '#f59e0b',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    textAlign: 'right',
                  }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                  每股退現 / 總退款 ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="退款總額 (0為虧損減資)"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: '#10b981',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    textAlign: 'right',
                  }}
                />
              </div>
            </div>
          )}

          {/* 6. 現金增資 (CAPITAL_INCREASE) */}
          {type === 'CAPITAL_INCREASE' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                  認購股數
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
                  認購單價 ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="每股認購價"
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
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                  手續費/匯款費 ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
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
                />
              </div>
            </div>
          )}

          {/* 7. 換股合併 (STOCK_MERGER) */}
          {type === 'STOCK_MERGER' && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#ec4899', marginBottom: '6px', fontWeight: 600 }}>
                    換股目標標的代碼 *
                  </label>
                  <input
                    type="text"
                    placeholder="如: COMP_B"
                    value={targetSymbol}
                    onChange={(e) => setTargetSymbol(e.target.value)}
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
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                    目標名稱 (選填)
                  </label>
                  <input
                    type="text"
                    placeholder="如: 新合併公司"
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
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
                    換股比率 (1股換N股)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="如: 1.5"
                    value={ratio}
                    onChange={(e) => setRatio(e.target.value)}
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
                    現金補償 ({currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="如: 0"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: '#10b981',
                      fontSize: '0.875rem',
                      textAlign: 'right',
                    }}
                  />
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                💡 換股合併後，原標的持股將歸零，目標標的將增加換算股數並承接原始投入成本。
              </div>
            </div>
          )}

          {/* 8. 特別股贖回 (PREFERRED_REDEMPTION) */}
          {type === 'PREFERRED_REDEMPTION' && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '14px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                    每股收回價 ({currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="如: 50"
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value);
                      const p = parseFloat(e.target.value);
                      if (!isNaN(p) && asOfShares > 0) {
                        setCashAmount((p * asOfShares).toString());
                      }
                    }}
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
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#10b981', marginBottom: '6px', fontWeight: 600 }}>
                    贖回退還總現金 ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: '#10b981',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      textAlign: 'right',
                    }}
                    required
                  />
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                💡 特別股到期收回後持股將歸零，系統自動將贖回現金與原始成本結算已實現損益。
              </div>
            </div>
          )}

          {/* 9. 企業分拆 (SPIN_OFF) */}
          {type === 'SPIN_OFF' && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#ec4899', marginBottom: '6px', fontWeight: 600 }}>
                    分拆新公司代碼 *
                  </label>
                  <input
                    type="text"
                    placeholder="如: SUB_SYM"
                    value={targetSymbol}
                    onChange={(e) => setTargetSymbol(e.target.value)}
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
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                    新公司名稱
                  </label>
                  <input
                    type="text"
                    placeholder="如: 新分拆子公司"
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
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
                    配股率 (母1股配N股)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="如: 0.2"
                    value={ratio}
                    onChange={(e) => setRatio(e.target.value)}
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
                    成本拆分比例 (0.2=20%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="如: 0.2"
                    value={allocationRatio}
                    onChange={(e) => setAllocationRatio(e.target.value)}
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
                  />
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                💡 母公司持股數不變，成本依比例拆分；新子公司以分拆成本與獲配股數入帳。
              </div>
            </div>
          )}

          {/* 10. 可轉債換股 (CB_CONVERSION) */}
          {type === 'CB_CONVERSION' && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                    轉換價格 ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="如: 50"
                    value={conversionPrice}
                    onChange={(e) => setConversionPrice(e.target.value)}
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
                    換得普通股數 *
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
                      color: '#60a5fa',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      textAlign: 'right',
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                    債券投入本金 ({currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="如: 100000"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
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
                  />
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                💡 原始可轉債本金轉為新普通股之持股成本基準。
              </div>
            </div>
          )}

          {/* 11. 公開收購 (TENDER_OFFER) */}
          {type === 'TENDER_OFFER' && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                    收購成交單價 ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="每股收購價"
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
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                    收購賣出股數 *
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
                      color: '#f43f5e',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      textAlign: 'right',
                    }}
                    required
                  />
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                💡 依收購價全額結算賣出並結清損益。
              </div>
            </div>
          )}

          {/* Fee & Tax Calculation with Broker Discount (買賣與增資時顯示) */}
          {(type === 'BUY' || type === 'SELL' || type === 'CAPITAL_INCREASE') && (
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
          )}

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
              交易備註 (筆記與除權息說明)
            </label>
            <textarea
              placeholder="記錄買進理由、除權息說明、減資公告或市場觀察..."
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
                {continuousMode ? '儲存並繼續新增' : '確認儲存紀錄'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
