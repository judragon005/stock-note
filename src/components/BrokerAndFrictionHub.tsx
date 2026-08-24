import React, { useState } from 'react';
import { BrokerAccount, FrictionSummary, MarketType, USFeeType } from '../types/stock';
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
} from 'lucide-react';

interface BrokerAndFrictionHubProps {
  accounts: BrokerAccount[];
  onSaveAccounts: (accounts: BrokerAccount[]) => void;
  frictionSummary?: FrictionSummary;
  selectedAccountId: string;
  onSelectAccount: (id: string) => void;
}

export const BrokerAndFrictionHub: React.FC<BrokerAndFrictionHubProps> = ({
  accounts,
  onSaveAccounts,
  frictionSummary,
  selectedAccountId,
  onSelectAccount,
}) => {
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
      {/* 4 大摩擦指標發光看板 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* 1. 歷史累計買進手續費 */}
        <div className="glass-card" style={{ padding: '18px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>歷史累計買進手續費</span>
            <Coins size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#60a5fa' }} className="mono">
            NT$ {Math.round(totalBuyFee).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            買進入帳實扣之券商交易手續費
          </div>
        </div>

        {/* 2. 歷史累計賣出稅費 */}
        <div className="glass-card" style={{ padding: '18px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>歷史累計賣出稅費</span>
            <TrendingDown size={18} color="#ef4444" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f87171' }} className="mono">
            NT$ {Math.round(totalSellFee + totalSellTax).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            賣出手續費 NT$ {Math.round(totalSellFee).toLocaleString()} + 證交稅 NT$ {Math.round(totalSellTax).toLocaleString()}
          </div>
        </div>

        {/* 3. 券商折讓累計已省金額 */}
        <div
          className="glass-card"
          style={{
            padding: '18px',
            borderLeft: '4px solid #10b981',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(30, 41, 59, 0.5) 100%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>券商折讓累計已省金額</span>
            <Sparkles size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }} className="mono">
            + NT$ {Math.round(totalFeeSaved).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            相較全額牌告 (1.0) 實際節省之手續費總額
          </div>
        </div>

        {/* 4. 在庫持股預估未來出清成本 */}
        <div className="glass-card" style={{ padding: '18px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>在庫持股預估出清成本</span>
            <Zap size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fbbf24' }} className="mono">
            NT$ {Math.round(totalFutureFriction).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            預估賣出稅 NT$ {Math.round(totalFutureTax).toLocaleString()} + 手續費 NT$ {Math.round(totalFutureFee).toLocaleString()}
          </div>
        </div>
      </div>

      {/* 雙欄工作區：左側券商管理，右側摩擦影響與優化 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* 左側：券商帳戶與費率管理面板 */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} color="#3b82f6" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>券商帳戶與專屬費率清單</h3>
            </div>
            {!isAdding && !editingId && (
              <button
                className="btn btn-primary btn-sm"
                onClick={startAdd}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={14} />
                <span>新增券商</span>
              </button>
            )}
          </div>

          {/* 新增 / 編輯 表單 */}
          {(isAdding || editingId) && (
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.7)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                marginBottom: '18px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#60a5fa' }}>
                  {editingId ? '✏️ 編輯券商帳戶' : '✨ 新增券商帳戶'}
                </span>
                {/* 快速範本套用 */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'center' }}>套用範本:</span>
                  {DEFAULT_BROKER_PRESETS.slice(0, 4).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p)}
                      style={{
                        fontSize: '0.68rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(59, 130, 246, 0.2)',
                        color: '#93c5fd',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        cursor: 'pointer',
                      }}
                    >
                      {p.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    帳戶名稱
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如: 國泰證券 (2.8折)"
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    市場別
                  </label>
                  <select
                    value={market}
                    onChange={(e) => setMarket(e.target.value as MarketType)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.82rem' }}
                  >
                    <option value="TW">🇹🇼 台股帳戶</option>
                    <option value="US">🇺🇸 美股帳戶</option>
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
                      title="編輯帳戶費率"
                      style={{ padding: '5px' }}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDelete(acc.id)}
                      title="刪除帳戶"
                      style={{ padding: '5px', color: '#f87171' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 右側：摩擦成本衝擊度分析與策略建議 */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Percent size={20} color="#f59e0b" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>交易摩擦衝擊佔比與策略</h3>
          </div>

          {/* 衝擊佔比進度條 */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>摩擦成本佔資產獲利比重</span>
              <span style={{ fontWeight: 700, color: impactPercent > 5 ? '#f87171' : '#34d399' }} className="mono">
                {impactPercent.toFixed(2)}%
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '10px',
                borderRadius: '6px',
                background: 'rgba(30, 41, 59, 0.8)',
                overflow: 'hidden',
                border: '1px solid var(--border-color)',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.max(2, impactPercent))}%`,
                  height: '100%',
                  background:
                    impactPercent > 5
                      ? 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)'
                      : 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)',
                  borderRadius: '6px',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>

          {/* 深度建議方針 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                fontSize: '0.8rem',
                lineHeight: '1.5',
              }}
            >
              <span style={{ fontWeight: 700, color: '#60a5fa' }}>💡 低消保護提醒：</span>
              <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                當台股單筆交易金額小於 NT$ 14,035 元時，券商最低手續費 (如 NT$ 20 元) 會大幅拉高實質摩擦費率。建議選用「低消 1 元」券商帳戶以避免碎股手續費損耗。
              </div>
            </div>

            <div
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                fontSize: '0.8rem',
                lineHeight: '1.5',
              }}
            >
              <span style={{ fontWeight: 700, color: '#34d399' }}>🎯 複委託 vs 海外券商評估：</span>
              <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                美股海外券商免手續費適合高頻定投；國內複委託若享 0.1% 且無低消優惠，則兼具資金安全性與稅務便利性。
              </div>
            </div>

            <div
              style={{
                background: 'rgba(245, 158, 11, 0.1)',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                fontSize: '0.8rem',
                lineHeight: '1.5',
              }}
            >
              <span style={{ fontWeight: 700, color: '#fbbf24' }}>🛡️ 稅費精準核算：</span>
              <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                在「券商核帳模式」下，系統已自動扣除股票 0.3% / ETF 0.1% 之預估賣出證交稅與券商折讓手續費，庫存淨現值 100% 反映落袋金額。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
