import React, { useState } from 'react';
import { BrokerAccount, FrictionSummary, MarketType, USFeeType, ApiKeysConfig, TradeRecord } from '../types/stock';
import { DEFAULT_BROKER_PRESETS } from '../utils/storage';
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
  onRepairTaxAndFee?: () => void;
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
  onRepairTaxAndFee,
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 頂部：4 大摩擦指標發光卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
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

        {/* 卡片 4: 在庫預估出清摩擦成本 */}
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
              placeholder="輸入 FinMind Token (選填)"
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.82rem' }}
            />
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              用於查詢台股高階個股籌碼、還原股價與即時行情。
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
          <span>隱私保護保證：所有 API 金鑰均儲存在您瀏覽器的本機 LocalStorage 中，絕不傳送至任何中央伺服器。</span>
        </div>
      </div>
    </div>
  );
};
