import React, { useState, useEffect } from 'react';
import {
  BrokerAccount,
  FrictionSummary,
  MarketType,
  USFeeType,
  ApiKeysConfig,
  TradeRecord,
  CashTransaction,
  LoanRecord,
} from '../types/stock';
import { DEFAULT_BROKER_PRESETS } from '../utils/storage';
import {
  getSystemSnapshots,
  createSystemSnapshot,
  restoreSystemSnapshot,
  deleteSystemSnapshot,
  toggleLockSystemSnapshot,
  exportFullDatabaseJSON,
  importFullDatabaseJSON,
  getLocalStorageInspectionStats,
  clearHistoricalPricesCache,
  clearHistoricalFxCache,
  clearPriceMetadataCache,
  clearCorporateActionsCache,
  clearInstitutionalChipsCache,
  SystemSnapshot,
  DB_VERSION,
  DB_NAME,
} from '../utils/db';
import { syncOfficialTaiwanStockList } from '../engine/stockDictionarySync';
import { getStockDictionaryStats, clearCustomStockNames } from '../engine/stockNameResolver';
import { StockDictionaryStats } from '../types/stockDictionary';
import { LocalStorageInspectionStats } from '../types/stock';
import {
  Zap,
  Building2,
  Plus,
  Trash2,
  Edit2,
  Check,
  Sparkles,
  Coins,
  TrendingDown,
  Percent,
  KeyRound,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Landmark,
  Receipt,
  History,
  Lock,
  Unlock,
  RotateCcw,
  Download,
  Upload,
  Camera,
  AlertTriangle,
  BookOpen,
  RefreshCw,
  HardDrive,
  Layers,
  Activity,
} from 'lucide-react';

interface SettingsWorkspaceProps {
  accounts: BrokerAccount[];
  onSaveAccounts: (accounts: BrokerAccount[]) => void;
  frictionSummary?: FrictionSummary;
  selectedAccountId: string;
  onSelectAccount: (id: string) => void;
  apiKeys: ApiKeysConfig;
  onSaveApiKeys: (apiKeys: ApiKeysConfig) => void;
  trades?: TradeRecord[];
  cashTransactions?: CashTransaction[];
  loanRecords?: LoanRecord[];
  onRepairTaxAndFee?: () => void;
  onDataRestored?: () => void;
  currentMarket?: MarketType | 'ALL';
  usdRate?: number;
}

export const SettingsWorkspace: React.FC<SettingsWorkspaceProps> = ({
  accounts,
  onSaveAccounts,
  frictionSummary,
  selectedAccountId,
  onSelectAccount,
  apiKeys,
  onSaveApiKeys,
  trades = [],
  cashTransactions = [],
  loanRecords = [],
  onRepairTaxAndFee,
  onDataRestored,
  currentMarket = 'ALL',
  usdRate = 32.0,
}) => {
  // --- 券商帳戶表單狀態 ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [market, setMarket] = useState<MarketType>('TW');
  const [feeRate, setFeeRate] = useState('0.001425');
  const [discountRate, setDiscountRate] = useState('0.28');
  const [minFee, setMinFee] = useState('1');
  const [taxRate, setTaxRate] = useState('0.003');
  const [usFeeType, setUsFeeType] = useState<USFeeType>('ZERO_COMMISSION');
  const [color, setColor] = useState('#10b981');
  const [isAdding, setIsAdding] = useState(false);

  // --- API Key 設定狀態 ---
  const [finmindToken, setFinmindToken] = useState(apiKeys.finmindToken || '');
  const [fmpApiKey, setFmpApiKey] = useState(apiKeys.fmpApiKey || '');
  const [alphaVantageKey, setAlphaVantageKey] = useState(apiKeys.alphaVantageKey || '');
  const [customProxyUrl, setCustomProxyUrl] = useState(apiKeys.customProxyUrl || '');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [keySavedToast, setKeySavedToast] = useState(false);

  const toggleShowKey = (field: string) => {
    setShowKeys((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSaveApiKeys = () => {
    onSaveApiKeys({
      finmindToken: finmindToken.trim() || undefined,
      fmpApiKey: fmpApiKey.trim() || undefined,
      alphaVantageKey: alphaVantageKey.trim() || undefined,
      customProxyUrl: customProxyUrl.trim() || undefined,
    });
    setKeySavedToast(true);
    setTimeout(() => setKeySavedToast(false), 3000);
  };

  const startEdit = (acc: BrokerAccount) => {
    setEditingId(acc.id);
    setName(acc.name);
    setMarket(acc.market);
    setFeeRate(acc.feeRate.toString());
    setDiscountRate(acc.discountRate.toString());
    setMinFee(acc.minFee.toString());
    setTaxRate(acc.taxRate.toString());
    setUsFeeType(acc.usFeeType || 'ZERO_COMMISSION');
    setColor(acc.color || '#10b981');
    setIsAdding(false);
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setName('');
    setMarket('TW');
    setFeeRate('0.001425');
    setDiscountRate('0.28');
    setMinFee('1');
    setTaxRate('0.003');
    setUsFeeType('ZERO_COMMISSION');
    setColor('#3b82f6');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
  };

  const applyPreset = (preset: BrokerAccount) => {
    setName(preset.name);
    setMarket(preset.market);
    setFeeRate(preset.feeRate.toString());
    setDiscountRate(preset.discountRate.toString());
    setMinFee(preset.minFee.toString());
    setTaxRate(preset.taxRate.toString());
    setUsFeeType(preset.usFeeType || 'ZERO_COMMISSION');
    setColor(preset.color || '#10b981');
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('請輸入帳戶名稱');
      return;
    }

    const updatedAccount: BrokerAccount = {
      id: editingId || `broker-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
      market,
      feeRate: parseFloat(feeRate) || (market === 'TW' ? 0.001425 : 0.001),
      discountRate: parseFloat(discountRate) || 1.0,
      minFee: parseFloat(minFee) || 0,
      taxRate: parseFloat(taxRate) || (market === 'TW' ? 0.003 : 0),
      usFeeType: market === 'US' ? usFeeType : undefined,
      color,
    };

    if (editingId) {
      onSaveAccounts(accounts.map((a) => (a.id === editingId ? updatedAccount : a)));
    } else {
      onSaveAccounts([...accounts, updatedAccount]);
    }
    cancelEdit();
  };

  const handleDelete = (id: string) => {
    if (accounts.length <= 1) {
      alert('系統必須保留至少一個券商帳戶！');
      return;
    }
    if (confirm('確定要刪除此券商帳戶嗎？既有綁定此帳戶之歷史紀錄將改由預設帳戶計費。')) {
      onSaveAccounts(accounts.filter((a) => a.id !== id));
      if (selectedAccountId === id) {
        onSelectAccount('ALL');
      }
    }
  };

  // 摩擦看板計算
  const totalBuyFee = frictionSummary?.totalBuyFee ?? 0;
  const totalSellFee = frictionSummary?.totalSellFee ?? 0;
  const totalSellTax = frictionSummary?.totalSellTax ?? 0;
  const totalFeeSaved = frictionSummary?.totalFeeSavedByDiscount ?? 0;
  const totalFutureTax = frictionSummary?.totalEstimatedFutureTax ?? 0;
  const totalFutureFee = frictionSummary?.totalEstimatedFutureFee ?? 0;
  const totalFutureFriction = frictionSummary?.totalEstimatedFutureFriction ?? 0;
  const impactPercent = frictionSummary?.frictionImpactPercent ?? 0;
  const totalTWDividendTax = frictionSummary?.totalTWDividendTax ?? 0;
  const totalUSDividendTax = frictionSummary?.totalUSDividendTax ?? 0;
  const totalUSDividendTaxInTWD = frictionSummary?.totalUSDividendTaxInTWD ?? Math.round(totalUSDividendTax * usdRate);
  const totalDividendFrictionInTWD = totalTWDividendTax + totalUSDividendTaxInTWD;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 頂部：5 大摩擦指標發光卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        {/* 卡片 1: 累計手續費 */}
        <div
          className="glass-card"
          style={{
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#93c5fd', fontSize: '0.8rem', fontWeight: 600 }}>
            <Coins size={16} /> 累計實付手續費 (買+賣)
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', margin: '8px 0 4px 0' }}>
            NT$ {Math.round(totalBuyFee + totalSellFee).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            買進手續費 NT$ {Math.round(totalBuyFee).toLocaleString()} · 賣出 NT$ {Math.round(totalSellFee).toLocaleString()}
          </div>
        </div>

        {/* 卡片 2: 累計證交稅 */}
        <div
          className="glass-card"
          style={{
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fca5a5', fontSize: '0.8rem', fontWeight: 600 }}>
            <TrendingDown size={16} /> 累計已繳證交稅
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f87171', margin: '8px 0 4px 0' }}>
            NT$ {Math.round(totalSellTax).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>股票 0.3% · 當沖 0.15% · 股票ETF 0.1% · 債券ETF 免稅</div>
        </div>

        {/* 卡片 3: 券商折讓已省金額 */}
        <div
          className="glass-card"
          style={{
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6ee7b7', fontSize: '0.8rem', fontWeight: 600 }}>
            <Sparkles size={16} color="#10b981" /> 券商折讓已為您省下
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399', margin: '8px 0 4px 0' }}>
            NT$ {Math.round(totalFeeSaved).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>基準：法定牌告手續費 (低消 20 元 + 0.1425%)</div>
        </div>

        {/* 卡片 4: 股息摩擦稅負 (依市場模式動態切換：台股二代健保 / 美股30%預扣 / 全部市場) */}
        {currentMarket === 'TW' ? (
          <div
            className="glass-card"
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc', fontSize: '0.8rem', fontWeight: 600 }}>
              <Landmark size={16} color="#c084fc" /> 累計二代健保補充保費
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#e879f9', margin: '8px 0 4px 0' }}>
              NT$ {Math.round(totalTWDividendTax).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              單筆達 2 萬課 2.11% · 累計已自台股股息扣繳
            </div>
          </div>
        ) : currentMarket === 'US' ? (
          <div
            className="glass-card"
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid rgba(244, 63, 94, 0.35)',
              background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fb7185', fontSize: '0.8rem', fontWeight: 600 }}>
              <Receipt size={16} color="#fb7185" /> 美股 30% 股息預扣稅
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f43f5e', margin: '8px 0 4px 0' }}>
              $ {totalUSDividendTax.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#fda4af' }}>USD</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              折合 NT$ {totalUSDividendTaxInTWD.toLocaleString()} · 美國國稅局 30% 預扣
            </div>
          </div>
        ) : (
          <div
            className="glass-card"
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc', fontSize: '0.8rem', fontWeight: 600 }}>
              <Landmark size={16} color="#c084fc" /> 除權息摩擦稅負總計
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#e879f9', margin: '8px 0 4px 0' }}>
              NT$ {totalDividendFrictionInTWD.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              台股健保 NT$ {totalTWDividendTax.toLocaleString()} · 美股預扣 ${totalUSDividendTax.toLocaleString()} USD
            </div>
          </div>
        )}

        {/* 卡片 5: 在庫預估出清摩擦成本 */}
        <div
          className="glass-card"
          style={{
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fcd34d', fontSize: '0.8rem', fontWeight: 600 }}>
            <Percent size={16} /> 在庫持股預估出清摩擦成本
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fbbf24', margin: '8px 0 4px 0' }}>
            NT$ {Math.round(totalFutureFriction).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            預估稅金 NT$ {Math.round(totalFutureTax).toLocaleString()} (債券ETF 0%) · 手續費 NT$ {Math.round(totalFutureFee).toLocaleString()}
          </div>
        </div>
      </div>

      {/* 主體雙欄：左側券商管理與右側摩擦分析 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* 左側：券商帳戶與費率管理 */}
        <div className="glass-card" style={{ padding: '20px', borderRadius: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={18} color="#3b82f6" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                🏛️ 券商帳戶與費率管理
              </h3>
            </div>
            {!isAdding && !editingId && (
              <button className="btn btn-primary btn-sm" onClick={startAdd} style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
                <Plus size={14} /> 新增帳戶
              </button>
            )}
          </div>

          {/* 新增 / 編輯 表單 */}
          {(isAdding || editingId) && (
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#60a5fa', marginBottom: '12px' }}>
                {editingId ? '✏️ 編輯券商帳戶' : '✨ 新增券商帳戶'}
              </div>

              {/* 快速範本按鈕 */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  快速套用主流券商範本：
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {DEFAULT_BROKER_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                    >
                      {preset.market === 'TW' ? '🇹🇼' : '🇺🇸'} {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    帳戶名稱
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例: 國泰證券、Firstrade"
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    適用市場
                  </label>
                  <select
                    value={market}
                    onChange={(e) => setMarket(e.target.value as MarketType)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.82rem' }}
                  >
                    <option value="TW">🇹🇼 台灣市場 (台股)</option>
                    <option value="US">🇺🇸 美國市場 (美股)</option>
                  </select>
                </div>
              </div>

              {market === 'TW' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      折讓率 (例: 0.28折)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={discountRate}
                      onChange={(e) => setDiscountRate(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      最低手續費 (NT$)
                    </label>
                    <input
                      type="number"
                      value={minFee}
                      onChange={(e) => setMinFee(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.82rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      證交稅率 (0.003)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.82rem' }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      美股手續費模式
                    </label>
                    <select
                      value={usFeeType}
                      onChange={(e) => setUsFeeType(e.target.value as USFeeType)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.82rem' }}
                    >
                      <option value="ZERO_COMMISSION">海外券商 ($0 免手續費)</option>
                      <option value="SUB_BROKERAGE">國內複委託 (依費率與低消)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      {usFeeType === 'SUB_BROKERAGE' ? '複委託費率 (例 0.001 = 0.1%)' : '最低手續費 (USD)'}
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={usFeeType === 'SUB_BROKERAGE' ? feeRate : minFee}
                      onChange={(e) => (usFeeType === 'SUB_BROKERAGE' ? setFeeRate(e.target.value) : setMinFee(e.target.value))}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.82rem' }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={cancelEdit}>
                  取消
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleSave}>
                  <Check size={14} />
                  <span>儲存帳戶</span>
                </button>
              </div>
            </div>
          )}

          {/* 券商帳戶清單列表 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {accounts.map((acc) => {
              const isSelected = selectedAccountId === acc.id;
              return (
                <div
                  key={acc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(30, 41, 59, 0.4)',
                    border: isSelected ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: acc.color || '#10b981',
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{acc.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {acc.market === 'TW'
                          ? `台股 · 折讓率 ${(acc.discountRate * 10).toFixed(1)}折 · 低消 NT$ ${acc.minFee}`
                          : `美股 · ${acc.usFeeType === 'ZERO_COMMISSION' ? '免手續費 ($0)' : `複委託費率 ${(acc.feeRate * 100).toFixed(2)}% · 低消 $${acc.minFee}`}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onSelectAccount(isSelected ? 'ALL' : acc.id)}
                      style={{
                        fontSize: '0.72rem',
                        padding: '3px 8px',
                        background: isSelected ? '#3b82f6' : 'rgba(255, 255, 255, 0.05)',
                        color: '#ffffff',
                      }}
                    >
                      {isSelected ? '✓ 篩選中' : '切換此帳戶'}
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => startEdit(acc)}
                      style={{ padding: '3px 6px', fontSize: '0.72rem' }}
                      title="編輯費率"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDelete(acc.id)}
                      style={{ padding: '3px 6px', fontSize: '0.72rem', color: '#f87171' }}
                      title="刪除帳戶"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 右側：摩擦成本深度分析與優化對策 */}
        <div className="glass-card" style={{ padding: '20px', borderRadius: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Zap size={18} color="#f59e0b" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
              💸 交易摩擦成本深度分析
            </h3>
          </div>

          {/* 摩擦衝擊佔比進度條 */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>摩擦成本佔獲利總衝擊比率</span>
              <span style={{ color: impactPercent > 10 ? '#f87171' : '#34d399', fontWeight: 700 }}>
                {impactPercent.toFixed(2)}%
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, Math.max(0, impactPercent))}%`,
                  height: '100%',
                  background: impactPercent > 15 ? '#ef4444' : impactPercent > 8 ? '#f59e0b' : '#10b981',
                  borderRadius: '4px',
                }}
              />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              {impactPercent < 5
                ? '🟢 摩擦衝擊極低，折讓率優異且交易成本控制得宜。'
                : impactPercent < 15
                ? '🟡 摩擦衝擊適中，建議維持定期定額與低頻交易。'
                : '🔴 摩擦衝擊偏高，請檢視低消限制或爭取更低折讓率。'}
            </div>
          </div>

          {/* 歷史帳本稅費未拆分警示與一鍵修復 */}
          {trades.filter((t) => {
            if (t.type !== 'SELL' || (t.market !== 'TW' && t.market) || t.shares <= 0 || t.price <= 0) return false;
            if (t.tax && t.tax > 0) return false;
            const cleanSym = (t.symbol || '').trim().toUpperCase();
            if (cleanSym.endsWith('B')) return false;
            return true;
          }).length > 0 && onRepairTaxAndFee && (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="#f59e0b" />
                <div style={{ fontSize: '0.75rem', color: '#fef3c7' }}>
                  偵測到歷史賣出稅費未拆分（已繳證交稅為 0）
                </div>
              </div>
              <button
                onClick={onRepairTaxAndFee}
                className="btn btn-primary btn-sm"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                }}
              >
                🛠️ 一鍵智慧拆分
              </button>
            </div>
          )}

          {/* 券商費率與省費效益清單 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8' }}>各券商費率與省費效益配置</div>
            {accounts.map((acc) => {
              const isTw = acc.market === 'TW';
              const discountStr = isTw ? `${(acc.discountRate * 10).toFixed(1)}折` : (acc.usFeeType === 'ZERO_COMMISSION' ? '$0 免手續費' : `${(acc.feeRate * 100).toFixed(2)}%`);
              const minFeeStr = isTw ? `低消 NT$ ${acc.minFee}` : `低消 $${acc.minFee} USD`;
              return (
                <div
                  key={acc.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(30, 41, 59, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#e2e8f0' }}>{acc.name}</span>
                    <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
                      {discountStr}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>市場: {isTw ? '🇹🇼 台股' : '🇺🇸 美股'}</span>
                    <span>{minFeeStr}</span>
                    <span>證交稅: {isTw ? `${(acc.taxRate * 100).toFixed(1)}%` : '免稅'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 底部第三模組：外部金融資料 API 金鑰管理 */}
      <div
        className="glass-card"
        style={{
          padding: '22px',
          borderRadius: '14px',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.7) 100%)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                padding: '6px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2))',
                border: '1px solid rgba(139, 92, 246, 0.4)',
              }}
            >
              <KeyRound size={18} color="#a78bfa" />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                🔑 外部金融資料 API 金鑰管理 (API Keys Configuration)
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                支援日後擴充台美股高階即時報價、官方除權息與歷史回測端點。金鑰將安全隔離於本機 LocalStorage。
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {keySavedToast && (
              <span style={{ fontSize: '0.78rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={14} /> 金鑰設定已儲存！
              </span>
            )}
            <button className="btn btn-primary btn-sm" onClick={handleSaveApiKeys} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Save size={14} /> 儲存金鑰設定
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {/* FinMind Token */}
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#93c5fd' }}>
                🇹🇼 FinMind API Token (台股)
              </label>
              <button
                type="button"
                onClick={() => toggleShowKey('finmind')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                {showKeys['finmind'] ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <input
              type={showKeys['finmind'] ? 'text' : 'password'}
              value={finmindToken}
              onChange={(e) => setFinmindToken(e.target.value)}
              placeholder="輸入 FinMind Token (選填，每日 600 次免費額度)"
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.82rem' }}
            />
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              用於台股歷史 10 年除權息與減資事件深度回填 (支援免費 Token，每日 600 次額度，可至 <a href="https://finmind.github.io/" target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>FinMind 官網</a> 免費申請)。
            </div>
          </div>


          {/* FMP (Financial Modeling Prep) API Key */}
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#a78bfa' }}>
                🇺🇸 FMP API Key (美股)
              </label>
              <button
                type="button"
                onClick={() => toggleShowKey('fmp')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                {showKeys['fmp'] ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <input
              type={showKeys['fmp'] ? 'text' : 'password'}
              value={fmpApiKey}
              onChange={(e) => setFmpApiKey(e.target.value)}
              placeholder="輸入 FMP API Key (選填)"
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.82rem' }}
            />
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Financial Modeling Prep 全市場美股歷史股利與分割資料。
            </div>
          </div>

          {/* Alpha Vantage API Key */}
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fcd34d' }}>
                🌐 Alpha Vantage API Key (外匯/總經)
              </label>
              <button
                type="button"
                onClick={() => toggleShowKey('alphavantage')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                {showKeys['alphavantage'] ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <input
              type={showKeys['alphavantage'] ? 'text' : 'password'}
              value={alphaVantageKey}
              onChange={(e) => setAlphaVantageKey(e.target.value)}
              placeholder="輸入 Alpha Vantage Key (選填)"
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.82rem' }}
            />
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              全球匯率、貨幣對與大盤總經數據備援端點。
            </div>
          </div>

          {/* 自訂 Proxy 端點 */}
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6ee7b7' }}>
                🔌 自訂代理伺服器端點 (Proxy URL)
              </label>
              <button
                type="button"
                onClick={() => toggleShowKey('proxy')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                {showKeys['proxy'] ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <input
              type="text"
              value={customProxyUrl}
              onChange={(e) => setCustomProxyUrl(e.target.value)}
              placeholder="例: https://my-custom-proxy.workers.dev (選填)"
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.82rem' }}
            />
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              自建 Cloudflare Worker 或私人反向代理轉發通道。
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <ShieldAlert size={13} color="#94a3b8" />
          <span>隱私保護保證：所有 API 金鑰均儲存在您瀏覽器的本機 LocalStorage / IndexedDB 中，絕不傳送至任何中央伺服器。</span>
        </div>
      </div>

      {/* --- 第三區塊：🗄️ IndexedDB 資料庫狀態與時光機快照管理 --- */}
      <DatabaseAndSnapshotsSection
        trades={trades}
        accounts={accounts}
        cashTransactions={cashTransactions}
        loanRecords={loanRecords}
        apiKeys={apiKeys}
        onDataRestored={onDataRestored}
      />

      {/* --- 第四區塊：📚 官方股票名稱字典庫與自動補齊管理 --- */}
      <StockDictionaryManagementSection />
    </div>
  );
};

// -------------------------------------------------------------
// 輔助函式：位元組格式化
// -------------------------------------------------------------
function formatBytes(bytes: number, decimals: number = 2): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, safeI)).toFixed(dm)) + ' ' + sizes[safeI];
}

// -------------------------------------------------------------
// 本地數據與儲存空間總覽子元件 (Local Storage Inspector)
// -------------------------------------------------------------

interface DatabaseAndSnapshotsSectionProps {
  trades: TradeRecord[];
  accounts: BrokerAccount[];
  cashTransactions?: CashTransaction[];
  loanRecords?: LoanRecord[];
  apiKeys: ApiKeysConfig;
  onDataRestored?: () => void;
}

const DatabaseAndSnapshotsSection: React.FC<DatabaseAndSnapshotsSectionProps> = ({
  trades,
  accounts,
  cashTransactions = [],
  loanRecords = [],
  apiKeys,
  onDataRestored,
}) => {
  const [snapshots, setSnapshots] = useState<SystemSnapshot[]>([]);
  const [inspectionStats, setInspectionStats] = useState<LocalStorageInspectionStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [customSnapshotName, setCustomSnapshotName] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [restoreConfirmSnap, setRestoreConfirmSnap] = useState<SystemSnapshot | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const [activePurging, setActivePurging] = useState<string | null>(null);

  const loadAllData = async () => {
    try {
      setIsLoadingStats(true);
      const [snapList, stats] = await Promise.all([
        getSystemSnapshots(),
        getLocalStorageInspectionStats(),
      ]);
      setSnapshots(snapList);
      setInspectionStats(stats);
    } catch (err) {
      console.error('Failed to load storage inspection stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [trades.length, accounts.length, cashTransactions.length, loanRecords.length]);

  const showToast = (text: string, isError: boolean = false) => {
    setActionFeedback({ text, isError });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // 快取清除操作
  const handleClearCache = async (
    type: 'PRICES' | 'FX' | 'PRICE_META' | 'CORP_ACTIONS' | 'CHIPS',
    title: string,
    clearFn: () => Promise<void>
  ) => {
    if (!window.confirm(`確定要清除「${title}」嗎？\n\n此操作僅會清空本機快取與暫存資料，完全不會刪除您的個人交易與帳本紀錄。`)) {
      return;
    }

    try {
      setActivePurging(type);
      await clearFn();
      await loadAllData();
      showToast(`🧹 已成功清除「${title}」，可點擊重新同步或於各頁面自動拉取最新資料。`);
    } catch (err: any) {
      showToast(`⚠️ 清除快取失敗: ${err?.message || String(err)}`, true);
    } finally {
      setActivePurging(null);
    }
  };

  // 建立自訂快照
  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSnapshotName.trim()) return;

    try {
      setIsCreatingSnapshot(true);
      await createSystemSnapshot(
        customSnapshotName.trim(),
        'MANUAL',
        {
          trades,
          brokerAccounts: accounts,
          cashTransactions,
          loanRecords,
          historicalPrices: {},
          historicalFx: {},
          priceMetadata: { quotes: {}, lockedSymbols: [] },
          apiKeys,
          accountingView: 'BROKER',
        },
        false
      );
      setCustomSnapshotName('');
      await loadAllData();
      showToast('📸 自訂快照已成功建立！');
    } catch (err) {
      showToast(`建立快照失敗: ${err instanceof Error ? err.message : String(err)}`, true);
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  // 切換鎖定
  const handleToggleLock = async (snapId: string) => {
    try {
      await toggleLockSystemSnapshot(snapId);
      await loadAllData();
    } catch (err) {
      showToast(`切換鎖定失敗: ${err instanceof Error ? err.message : String(err)}`, true);
    }
  };

  // 刪除快照
  const handleDeleteSnapshot = async (snap: SystemSnapshot) => {
    if (snap.isLocked) {
      alert('🔒 此快照已受鎖定保護，請先解鎖後再刪除。');
      return;
    }
    if (!window.confirm(`確定要刪除快照「${snap.name}」嗎？`)) {
      return;
    }

    try {
      await deleteSystemSnapshot(snap.id);
      await loadAllData();
      showToast('🗑️ 快照已成功刪除');
    } catch (err) {
      showToast(`刪除快照失敗: ${err instanceof Error ? err.message : String(err)}`, true);
    }
  };

  // 執行還原
  const handleConfirmRestore = async () => {
    if (!restoreConfirmSnap) return;
    try {
      await restoreSystemSnapshot(restoreConfirmSnap.id);
      setRestoreConfirmSnap(null);
      alert(`🎉 系統已成功還原至快照【${restoreConfirmSnap.name}】時點！`);
      if (onDataRestored) {
        onDataRestored();
      } else {
        window.location.reload();
      }
    } catch (err) {
      alert(`還原失敗: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // 匯出全庫 JSON
  const handleExportFullDB = async () => {
    try {
      const json = await exportFullDatabaseJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock-tracker-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('📦 全庫 JSON 備份檔案已成功導出！');
    } catch (err) {
      showToast(`匯出失敗: ${err instanceof Error ? err.message : String(err)}`, true);
    }
  };

  // 匯入全庫 JSON
  const handleImportFullDB = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('⚠️ 匯入全庫備份將會覆寫現有全部資料，確定要繼續嗎？')) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const content = ev.target?.result as string;
        await importFullDatabaseJSON(content);
        alert('🎉 全庫備份資料已成功匯入！');
        if (onDataRestored) {
          onDataRestored();
        } else {
          window.location.reload();
        }
      } catch (err) {
        alert(`匯入失敗: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const formatSnapshotReason = (reason: SystemSnapshot['reason']) => {
    switch (reason) {
      case 'AUTO_BEFORE_IMPORT':
        return { text: 'CSV 匯入前自動備份', bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' };
      case 'AUTO_BEFORE_RESET':
        return { text: '清空重置前自動備份', bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' };
      case 'AUTO_BEFORE_CORP_ACTION':
        return { text: '公司行動補登前備份', bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' };
      case 'MANUAL':
      default:
        return { text: '手動建立快照', bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399' };
    }
  };

  const stats = inspectionStats;

  return (
    <div
      style={{
        marginTop: '24px',
        background: 'var(--card-bg, #1e293b)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid var(--border-color)',
      }}
    >
      {/* 1. 頂部資安與 100% 離線隱私保證橫幅 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 78, 59, 0.25))',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              padding: '10px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#34d399' }}>
                100% 本地離線存儲 · 極致隱私安全保證
              </h3>
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.25)',
                  color: '#6ee7b7',
                  fontWeight: 600,
                }}
              >
                Local-First
              </span>
            </div>
            <p
              style={{
                margin: '3px 0 0',
                fontSize: '0.78rem',
                color: 'rgba(255, 255, 255, 0.75)',
                lineHeight: 1.5,
              }}
            >
              本系統的所有個人交易、交割帳戶、現金流帳本與 API 金鑰，均 100% 儲存在您的瀏覽器本地環境（IndexedDB 與 LocalStorage），絕不上傳任何私有雲端伺服器。
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.72rem',
              padding: '4px 10px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981',
              }}
            />
            IndexedDB 引擎正常 ({DB_NAME} v{DB_VERSION})
          </span>
          <button
            type="button"
            onClick={loadAllData}
            title="重新整理本機資料庫統計"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 10px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={12} className={isLoadingStats ? 'animate-spin' : ''} />
            整理統計
          </button>
        </div>
      </div>

      {/* 2. 磁碟儲存配額與引擎健康度 (Storage Quota Dashboard) */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.7)',
          padding: '16px 20px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HardDrive size={18} color="#38bdf8" />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              瀏覽器儲存空間佔用與配額 (Storage Quota)
            </span>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            已使用{' '}
            <strong style={{ color: '#38bdf8' }}>
              {stats ? formatBytes(stats.storageUsageBytes) : '計算中...'}
            </strong>{' '}
            / 配額上限{' '}
            <span style={{ color: 'var(--text-muted)' }}>
              {stats && stats.isStorageEstimateSupported && stats.storageQuotaBytes > 0
                ? formatBytes(stats.storageQuotaBytes)
                : '瀏覽器動態配額'}
            </span>
            {stats && stats.isStorageEstimateSupported && (
              <span
                style={{
                  marginLeft: '8px',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                }}
              >
                佔用率 {stats.usagePercentage.toFixed(3)}%
              </span>
            )}
          </div>
        </div>

        {/* 進度條 */}
        <div
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '4px',
            background: 'rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.max(1, Math.min(100, stats?.usagePercentage || 1))}%`,
              height: '100%',
              borderRadius: '4px',
              background: 'linear-gradient(90deg, #10b981, #38bdf8)',
              transition: 'width 0.5s ease',
            }}
          />
        </div>
      </div>

      {/* 3. 三大維度本地資料明細卡片群 (Categorized Datasets) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* 卡片 1：🛡️ 核心個人資產數據 */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    padding: '6px',
                    borderRadius: '8px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: '#60a5fa',
                  }}
                >
                  <Receipt size={16} />
                </div>
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#93c5fd' }}>
                  1. 核心個人資產數據
                </h4>
              </div>
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa',
                  fontWeight: 600,
                }}
              >
                高防護層
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>歷史交易紀錄 (trades)</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {(stats?.coreAssets ? (stats.coreAssets.totalTrades || trades.length) : trades.length).toLocaleString()} 筆
                </strong>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', paddingLeft: '8px' }}>
                • 買進: {stats?.coreAssets?.buyTrades || trades.filter(t => t.type === 'BUY' || t.type === 'MARGIN_BUY').length} | 賣出: {stats?.coreAssets?.sellTrades || trades.filter(t => t.type === 'SELL' || t.type === 'MARGIN_SELL').length} | 配息: {stats?.coreAssets?.dividendTrades || trades.filter(t => t.type === 'DIVIDEND' || t.type === 'STOCK_DIVIDEND').length}
              </div>
              {(stats?.coreAssets?.earliestTradeDate || trades.length > 0) && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', paddingLeft: '8px' }}>
                  • 期間: {stats?.coreAssets?.earliestTradeDate || (trades.map(t => t.date).filter(Boolean).sort()[0] || '-')} ~ {stats?.coreAssets?.latestTradeDate || (trades.map(t => t.date).filter(Boolean).sort().slice(-1)[0] || '-')}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>證券交割帳戶 (brokerAccounts)</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {stats?.coreAssets ? (stats.coreAssets.totalAccounts || accounts.length) : accounts.length} 個
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>現金流水記帳 (cashTransactions)</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {(stats?.coreAssets ? (stats.coreAssets.totalCashTransactions || cashTransactions.length) : cashTransactions.length).toLocaleString()} 筆
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>質押信貸紀錄 (loanRecords)</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {stats?.coreAssets ? (stats.coreAssets.totalLoanRecords || loanRecords.length) : loanRecords.length} 筆
                </strong>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <button
              type="button"
              onClick={handleExportFullDB}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#93c5fd',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Download size={13} />
              匯出全庫 JSON
            </button>
            <label
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              <Upload size={13} />
              匯入備份
              <input type="file" accept=".json" onChange={handleImportFullDB} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        {/* 卡片 2：⚡ 行情與市場快取 */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    padding: '6px',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#fbbf24',
                  }}
                >
                  <Activity size={16} />
                </div>
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#fde68a' }}>
                  2. 行情與市場快取
                </h4>
              </div>
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#fbbf24',
                  fontWeight: 600,
                }}
              >
                可安全重置
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
                <span>歷史每日收盤價 (historicalPrices)</span>
                <span style={{ color: 'var(--text-primary)' }}>
                  {stats?.marketCache.historicalPricesSymbols ?? 0} 檔 ({stats?.marketCache.historicalPricesDataPoints.toLocaleString() ?? 0} 點)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
                <span>歷史外匯匯率 (historicalFx)</span>
                <span style={{ color: 'var(--text-primary)' }}>
                  {stats?.marketCache.historicalFxPairs ?? 0} 對 ({stats?.marketCache.historicalFxDataPoints.toLocaleString() ?? 0} 點)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
                <span>即時報價中繼快取 (priceMetadata)</span>
                <span style={{ color: 'var(--text-primary)' }}>
                  {stats?.marketCache.priceMetadataSymbols ?? 0} 檔
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
                <span>公司行動資料庫 (corporateActions)</span>
                <span style={{ color: 'var(--text-primary)' }}>
                  {stats?.marketCache.corporateActionsSymbols ?? 0} 檔 ({stats?.marketCache.corporateActionsTotal ?? 0} 筆)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
                <span>三大法人籌碼日報 (institutionalChips)</span>
                <span style={{ color: 'var(--text-primary)' }}>
                  {stats?.marketCache.institutionalChipsDays ?? 0} 天 ({stats?.marketCache.institutionalChipsTotalRecords?.toLocaleString() ?? 0} 筆)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
                <span>台美股官方字典 (stockDictionary)</span>
                <span style={{ color: 'var(--text-primary)' }}>
                  {(stats?.marketCache.stockDictionaryTotalCount ?? stats?.marketCache.stockDictionaryOfficialCount ?? 0).toLocaleString()} 檔
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))',
              gap: '6px',
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <button
              type="button"
              onClick={() => handleClearCache('PRICES', '歷史收盤價快取', clearHistoricalPricesCache)}
              disabled={activePurging === 'PRICES'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '5px 8px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: '0.72rem',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={11} />
              清空股價快取
            </button>
            <button
              type="button"
              onClick={() => handleClearCache('FX', '歷史外匯快取', clearHistoricalFxCache)}
              disabled={activePurging === 'FX'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '5px 8px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: '0.72rem',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={11} />
              清空匯率快取
            </button>
            <button
              type="button"
              onClick={() => handleClearCache('PRICE_META', '即時行情快取', clearPriceMetadataCache)}
              disabled={activePurging === 'PRICE_META'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '5px 8px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: '0.72rem',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={11} />
              清空即時報價
            </button>
            <button
              type="button"
              onClick={() => handleClearCache('CORP_ACTIONS', '公司行動資料庫', clearCorporateActionsCache)}
              disabled={activePurging === 'CORP_ACTIONS'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '5px 8px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: '0.72rem',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={11} />
              清空行動庫
            </button>
            <button
              type="button"
              onClick={() => handleClearCache('CHIPS', '三大法人籌碼快取', clearInstitutionalChipsCache)}
              disabled={activePurging === 'CHIPS'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '5px 8px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: '0.72rem',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={11} />
              清空籌碼快取
            </button>
          </div>
        </div>

        {/* 卡片 3：⚙️ 系統快照與偏好配置 */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    padding: '6px',
                    borderRadius: '8px',
                    background: 'rgba(168, 85, 247, 0.15)',
                    color: '#c084fc',
                  }}
                >
                  <Layers size={16} />
                </div>
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#e9d5ff' }}>
                  3. 系統快照與偏好配置
                </h4>
              </div>
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: 'rgba(168, 85, 247, 0.2)',
                  color: '#c084fc',
                  fontWeight: 600,
                }}
              >
                自動保護
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>時光機快照 (snapshots)</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {stats?.systemConfig ? (stats.systemConfig.totalSnapshots || snapshots.length) : snapshots.length} 份 (已鎖定 {stats?.systemConfig ? (stats.systemConfig.lockedSnapshots || snapshots.filter(s => s.isLocked).length) : snapshots.filter(s => s.isLocked).length} 份)
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>FinMind API Token</span>
                <span style={{ color: stats?.systemConfig.hasFinMindKey ? '#34d399' : 'var(--text-muted)' }}>
                  {stats?.systemConfig.hasFinMindKey ? '✓ 已配置' : '未設定'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>FMP API Key</span>
                <span style={{ color: stats?.systemConfig.hasFmpKey ? '#34d399' : 'var(--text-muted)' }}>
                  {stats?.systemConfig.hasFmpKey ? '✓ 已配置' : '未設定'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>臺灣證券交易所 OpenAPI</span>
                <span style={{ color: '#34d399' }}>✓ 官方免 Key 直連</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>券商手續費預設折數</span>
                <span style={{ color: 'var(--text-primary)' }}>
                  {((stats?.systemConfig.brokerFeeDiscount || 0.28) * 10).toFixed(1)} 折
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              💡 重大操作（如全庫重置、CSV 覆寫匯入）前，系統皆會強制自動建立安全快照。
            </div>
          </div>
        </div>
      </div>

      {/* 回饋訊息 Toast */}
      {actionFeedback && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: actionFeedback.isError
              ? 'rgba(239, 68, 68, 0.15)'
              : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${
              actionFeedback.isError ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'
            }`,
            color: actionFeedback.isError ? '#f87171' : '#34d399',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
          }}
        >
          {actionFeedback.isError ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
          <span>{actionFeedback.text}</span>
        </div>
      )}

      {/* 4. 時光機手動建立與還原管理清單 */}
      <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(15, 23, 42, 0.85)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={16} color="#818cf8" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              時光機歷史還原點管理 (最多保留 10 份自動快照，鎖定項目永久保留)
            </span>
          </div>

          {/* 手動建立快照輸入列 */}
          <form onSubmit={handleCreateSnapshot} style={{ display: 'flex', gap: '6px', flex: '1 1 300px', maxWidth: '420px' }}>
            <input
              type="text"
              value={customSnapshotName}
              onChange={(e) => setCustomSnapshotName(e.target.value)}
              placeholder="自訂快照名稱（如：年度結算備份）"
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: '6px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                fontSize: '0.78rem',
              }}
            />
            <button
              type="submit"
              disabled={isCreatingSnapshot || !customSnapshotName.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                border: 'none',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.78rem',
                cursor: customSnapshotName.trim() ? 'pointer' : 'not-allowed',
                opacity: customSnapshotName.trim() ? 1 : 0.6,
              }}
            >
              <Camera size={13} />
              {isCreatingSnapshot ? '建立中...' : '建立快照'}
            </button>
          </form>
        </div>

        {snapshots.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            目前尚無快照記錄。在您進行 CSV 匯入或手動備份時，系統將自動於此處建立還原點。
          </div>
        ) : (
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {snapshots.map((snap) => {
              const reasonInfo = formatSnapshotReason(snap.reason);
              const dateStr = new Date(snap.createdAt).toLocaleString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={snap.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    background: snap.isLocked ? 'rgba(99, 102, 241, 0.03)' : 'transparent',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleLock(snap.id)}
                      title={snap.isLocked ? '已鎖定（點擊解鎖）' : '未鎖定（點擊鎖定防刪）'}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: snap.isLocked ? '#fbbf24' : '#64748b',
                        padding: '4px',
                      }}
                    >
                      {snap.isLocked ? <Lock size={15} /> : <Unlock size={15} />}
                    </button>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {snap.name}
                        </span>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            padding: '1px 6px',
                            borderRadius: '6px',
                            background: reasonInfo.bg,
                            color: reasonInfo.color,
                            fontWeight: 500,
                          }}
                        >
                          {reasonInfo.text}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        📅 {dateStr} · 包含 {snap.metricsSummary?.totalTrades || 0} 筆交易 · {snap.metricsSummary?.totalAccounts || 0} 個帳戶 · {snap.metricsSummary?.totalCashTransactions || 0} 筆現金流水
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setRestoreConfirmSnap(snap)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: '#a5b4fc',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <RotateCcw size={12} />
                      還原此時點
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSnapshot(snap)}
                      disabled={snap.isLocked}
                      title={snap.isLocked ? '鎖定項目無法刪除' : '刪除快照'}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: snap.isLocked ? '#475569' : '#ef4444',
                        cursor: snap.isLocked ? 'not-allowed' : 'pointer',
                        padding: '4px',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 二次確認還原彈窗 */}
      {restoreConfirmSnap && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f59e0b', marginBottom: '14px' }}>
              <AlertTriangle size={24} />
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>確認執行時光機還原？</h4>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 16px' }}>
              即將將全站資料庫回滾至快照：
              <strong style={{ color: '#818cf8', display: 'block', margin: '4px 0' }}>
                【{restoreConfirmSnap.name}】
              </strong>
              此操作將以該快照內容全量覆寫當前交易與帳本，請確認是否繼續。
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setRestoreConfirmSnap(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                確定還原
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// 官方股票名稱字典管理子元件
// -------------------------------------------------------------

export const StockDictionaryManagementSection: React.FC = () => {
  const [stats, setStats] = useState<StockDictionaryStats>(() => getStockDictionaryStats());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  const refreshStats = () => {
    setStats(getStockDictionaryStats());
  };

  useEffect(() => {
    refreshStats();
  }, []);

  const handleSyncOfficialList = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const result = await syncOfficialTaiwanStockList();
      if (result.success) {
        refreshStats();
        setSyncFeedback({
          text: `🎉 官方清單同步成功！共更新 ${result.totalSynced.toLocaleString()} 檔標的 (TWSE 上市: ${result.twseCount} 檔, TPEx 上櫃: ${result.tpexCount} 檔)。`,
        });
      } else {
        setSyncFeedback({
          text: `⚠️ 同步失敗: ${result.error || '無法連線至官方 API'}`,
          isError: true,
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        text: `⚠️ 同步發生異常: ${err?.message || String(err)}`,
        isError: true,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCustom = () => {
    if (!window.confirm('確定要清除所有自訂股票名稱並恢復至預設官方字典嗎？')) {
      return;
    }
    clearCustomStockNames();
    refreshStats();
    setSyncFeedback({ text: '🧹 已重設自訂股票名稱快取為預設官方字典。' });
  };

  return (
    <div
      style={{
        marginTop: '24px',
        background: 'var(--card-bg, #1e293b)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid var(--border-color)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '8px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
            }}
          >
            <BookOpen size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              >
                官方股票名稱字典庫與智慧自動補齊
              </h3>
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#60a5fa',
                  fontWeight: 600,
                }}
              >
                離線優先 · 雙向檢索
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              內建台股全量官方掛牌清單與美股主要成分股，輸入代碼或中文名稱即時雙向搜尋，自動補全標的名稱。
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={handleClearCustom}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '0.78rem',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={13} />
            重設自訂快取
          </button>
          <button
            type="button"
            onClick={handleSyncOfficialList}
            disabled={isSyncing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              background: isSyncing
                ? 'rgba(59, 130, 246, 0.5)'
                : 'linear-gradient(135deg, #3b82f6, #2563eb)',
              border: 'none',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.78rem',
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            }}
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? '同步官方清單中...' : '一鍵同步證交所與櫃買清單'}
          </button>
        </div>
      </div>

      {/* 字典統計指標卡片 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '12px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            總收錄標的數
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#38bdf8' }}>
            {stats.totalCount.toLocaleString()} 檔
          </div>
        </div>
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '12px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            🇹🇼 台股官方收錄
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#34d399' }}>
            {stats.twCount.toLocaleString()} 檔
          </div>
        </div>
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '12px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            🇺🇸 美股精選繁中
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#a78bfa' }}>
            {stats.usCount.toLocaleString()} 檔
          </div>
        </div>
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '12px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            ⚙️ 自訂與同步增量
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fbbf24' }}>
            {stats.customCount.toLocaleString()} 檔
          </div>
        </div>
      </div>

      {/* 同步回饋訊息 */}
      {syncFeedback && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: syncFeedback.isError
              ? 'rgba(239, 68, 68, 0.15)'
              : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${
              syncFeedback.isError ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'
            }`,
            color: syncFeedback.isError ? '#f87171' : '#34d399',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {syncFeedback.isError ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
          <span>{syncFeedback.text}</span>
        </div>
      )}
    </div>
  );
};

