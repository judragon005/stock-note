import React, { useState } from 'react';
import { BrokerAccount, MarketType, USFeeType } from '../types/stock';
import { DEFAULT_BROKER_PRESETS } from '../utils/storage';
import { X, Plus, Trash2, Edit2, Check, Sparkles, Building2 } from 'lucide-react';
import { ModalShell } from './common/ModalShell';

interface BrokerAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BrokerAccount[];
  onSaveAccounts: (accounts: BrokerAccount[]) => void;
}

export const BrokerAccountsModal: React.FC<BrokerAccountsModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onSaveAccounts,
}) => {
  const [editingAccount, setEditingAccount] = useState<BrokerAccount | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const handleApplyPreset = (preset: BrokerAccount) => {
    const newAcc: BrokerAccount = {
      ...preset,
      id: `broker-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
    };
    setEditingAccount(newAcc);
    setIsAddingNew(true);
  };

  const handleSaveEditing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editingAccount.name.trim()) return;

    let updated: BrokerAccount[];
    if (isAddingNew) {
      updated = [...accounts, editingAccount];
    } else {
      updated = accounts.map((a) => (a.id === editingAccount.id ? editingAccount : a));
    }

    onSaveAccounts(updated);
    setEditingAccount(null);
    setIsAddingNew(false);
  };

  const handleDeleteAccount = (id: string) => {
    if (accounts.length <= 1) {
      alert('至少需保留一個券商帳戶！');
      return;
    }
    if (confirm('確定要刪除此券商帳戶嗎？（既有交易將自動歸入預設帳戶）')) {
      const updated = accounts.filter((a) => a.id !== id);
      onSaveAccounts(updated);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      layout="flex-fixed"
      dirty={Boolean(editingAccount)}
      maxWidth="768px"
      ariaLabelledBy="broker-accounts-modal-title"
      contentStyle={{
        backgroundColor: '#0f172a',
        border: '1px solid rgba(51, 65, 85, 0.8)',
        borderRadius: '16px',
        color: '#f1f5f9',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid rgba(30, 41, 59, 0.9)',
          background: 'rgba(15, 23, 42, 0.9)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              padding: '8px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#60a5fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Building2 size={20} />
          </div>
          <div>
            <h2
              id="broker-accounts-modal-title"
              style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, letterSpacing: '0.02em', color: '#f8fafc' }}
            >
              券商帳戶與摩擦成本費率管理
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              自訂台股/美股各券商手續費折讓率、低消限制與計費規則
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉視窗"
          style={{
            padding: '6px',
            borderRadius: '8px',
            background: 'transparent',
            border: '1px solid transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Content Body */}
      <div
        style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {editingAccount ? (
          /* 編輯或新增帳戶表單 */
          <form
            onSubmit={handleSaveEditing}
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(51, 65, 85, 0.8)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(51, 65, 85, 0.8)',
                paddingBottom: '12px',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#60a5fa',
                }}
              >
                <Edit2 size={16} /> {isAddingNew ? '新增券商帳戶' : '編輯券商帳戶'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingAccount(null);
                  setIsAddingNew(false);
                }}
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px',
              }}
            >
              <div>
                <label style={labelStyle}>帳戶名稱 / 券商簡稱</label>
                <input
                  type="text"
                  required
                  value={editingAccount.name}
                  onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                  style={inputStyle}
                  placeholder="例：國泰證券 (2.8折)"
                />
              </div>

              <div>
                <label style={labelStyle}>交易市場</label>
                <select
                  value={editingAccount.market}
                  onChange={(e) => setEditingAccount({ ...editingAccount, market: e.target.value as MarketType })}
                  style={inputStyle}
                >
                  <option value="TW">🇹🇼 台股市場 (TWD)</option>
                  <option value="US">🇺🇸 美股市場 (USD)</option>
                </select>
              </div>

              {editingAccount.market === 'TW' ? (
                <>
                  <div>
                    <label style={labelStyle}>手續費折讓率 (1.0全額 / 0.28即2.8折 / 0.2即2折)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      required
                      value={editingAccount.discountRate}
                      onChange={(e) =>
                        setEditingAccount({ ...editingAccount, discountRate: parseFloat(e.target.value) || 1.0 })
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>最低手續費門檻 (NT$ 低消，如 1 或 20 元)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editingAccount.minFee}
                      onChange={(e) =>
                        setEditingAccount({ ...editingAccount, minFee: parseInt(e.target.value, 10) || 0 })
                      }
                      style={inputStyle}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={labelStyle}>美股計費模式</label>
                    <select
                      value={editingAccount.usFeeType || 'ZERO_COMMISSION'}
                      onChange={(e) =>
                        setEditingAccount({ ...editingAccount, usFeeType: e.target.value as USFeeType })
                      }
                      style={inputStyle}
                    >
                      <option value="ZERO_COMMISSION">海外券商 (嘉信/Firstrade/IB 免手續費)</option>
                      <option value="SUB_BROKERAGE">國內複委託 (按成交金額抽成)</option>
                    </select>
                  </div>
                  {editingAccount.usFeeType === 'SUB_BROKERAGE' && (
                    <div>
                      <label style={labelStyle}>複委託手續費率 (如 0.001 代表 0.1%)</label>
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={editingAccount.feeRate || 0.001}
                        onChange={(e) =>
                          setEditingAccount({ ...editingAccount, feeRate: parseFloat(e.target.value) || 0 })
                        }
                        style={inputStyle}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setEditingAccount(null);
                  setIsAddingNew(false);
                }}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Check size={14} /> 儲存帳戶
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* 主流券商一鍵套用模板 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Sparkles size={16} color="#fbbf24" />
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1' }}>
                  快速套用主流券商費率模板
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '8px',
                }}
              >
                {DEFAULT_BROKER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    style={{
                      padding: '10px',
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(51, 65, 85, 0.8)',
                      borderRadius: '12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: '#e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {preset.name}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {preset.market === 'TW'
                        ? `${(preset.discountRate * 10).toFixed(1)}折 · 低消 NT$ ${preset.minFee}`
                        : preset.usFeeType === 'ZERO_COMMISSION'
                        ? '海外免手續費'
                        : `複委託 ${((preset.feeRate || 0) * 100).toFixed(2)}%`}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 現有帳戶清單 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1' }}>
                  我的券商帳戶清單 ({accounts.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAccount({
                      id: `broker-${Date.now()}`,
                      name: '',
                      market: 'TW',
                      feeRate: 0.001425,
                      discountRate: 0.28,
                      minFee: 1,
                      taxRate: 0.003,
                      createdAt: Date.now(),
                    });
                    setIsAddingNew(true);
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: 'rgba(37, 99, 235, 0.2)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} /> 自訂新券商
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px',
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: '1px solid rgba(51, 65, 85, 0.7)',
                      borderRadius: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '999px',
                          flexShrink: 0,
                          backgroundColor: acc.color || (acc.market === 'TW' ? '#3b82f6' : '#38bdf8'),
                        }}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          {acc.name}
                          {acc.isDefault && (
                            <span
                              style={{
                                padding: '2px 6px',
                                fontSize: '0.65rem',
                                background: 'rgba(51, 65, 85, 0.9)',
                                color: '#cbd5e1',
                                borderRadius: '4px',
                                fontWeight: 400,
                              }}
                            >
                              預設
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {acc.market === 'TW'
                            ? `手續費 ${(acc.discountRate * 10).toFixed(1)} 折 · 低消 NT$ ${acc.minFee} · 證交稅 ${acc.taxRate * 100}%`
                            : acc.usFeeType === 'ZERO_COMMISSION'
                            ? '美股海外免手續費 (SEC/TAF 實扣)'
                            : `美股複委託 ${((acc.feeRate || 0) * 100).toFixed(2)}% · 低消 $${acc.minFee} USD`}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAccount(acc);
                          setIsAddingNew(false);
                        }}
                        style={{
                          padding: '6px',
                          color: 'var(--text-secondary)',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="編輯費率"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAccount(acc.id)}
                        style={{
                          padding: '6px',
                          color: '#f87171',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="刪除帳戶"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '12px 24px',
          borderTop: '1px solid rgba(30, 41, 59, 0.9)',
          background: 'rgba(15, 23, 42, 0.9)',
          display: 'flex',
          justifyContent: 'flex-end',
          flexShrink: 0,
        }}
      >
        <button type="button" className="btn-secondary" onClick={onClose}>
          完成
        </button>
      </div>
    </ModalShell>
  );
};
