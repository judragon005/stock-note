import React, { useState } from 'react';
import { BrokerAccount, MarketType, USFeeType } from '../types/stock';
import { DEFAULT_BROKER_PRESETS } from '../utils/storage';
import { X, Plus, Trash2, Edit2, Check, Sparkles, Building2 } from 'lucide-react';

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

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wide">券商帳戶與摩擦成本費率管理</h2>
              <p className="text-xs text-slate-400">自訂台股/美股各券商手續費折讓率、低消限制與計費規則</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {editingAccount ? (
            /* 編輯或新增帳戶表單 */
            <form onSubmit={handleSaveEditing} className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-blue-400">
                  <Edit2 className="w-4 h-4" /> {isAddingNew ? '新增券商帳戶' : '編輯券商帳戶'}
                </h3>
                <button
                  type="button"
                  onClick={() => { setEditingAccount(null); setIsAddingNew(false); }}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  取消
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">帳戶名稱 / 券商簡稱</label>
                  <input
                    type="text"
                    required
                    value={editingAccount.name}
                    onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-white"
                    placeholder="例：國泰證券 (2.8折)"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">交易市場</label>
                  <select
                    value={editingAccount.market}
                    onChange={(e) => setEditingAccount({ ...editingAccount, market: e.target.value as MarketType })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-white"
                  >
                    <option value="TW">🇹🇼 台股市場 (TWD)</option>
                    <option value="US">🇺🇸 美股市場 (USD)</option>
                  </select>
                </div>

                {editingAccount.market === 'TW' ? (
                  <>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">手續費折讓率 (1.0全額 / 0.28即2.8折 / 0.2即2折)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        required
                        value={editingAccount.discountRate}
                        onChange={(e) => setEditingAccount({ ...editingAccount, discountRate: parseFloat(e.target.value) || 1.0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">最低手續費門檻 (NT$ 低消，如 1 或 20 元)</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={editingAccount.minFee}
                        onChange={(e) => setEditingAccount({ ...editingAccount, minFee: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-white"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">美股計費模式</label>
                      <select
                        value={editingAccount.usFeeType || 'ZERO_COMMISSION'}
                        onChange={(e) => setEditingAccount({ ...editingAccount, usFeeType: e.target.value as USFeeType })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-white"
                      >
                        <option value="ZERO_COMMISSION">海外券商 (嘉信/Firstrade/IB 免手續費)</option>
                        <option value="SUB_BROKERAGE">國內複委託 (按成交金額抽成)</option>
                      </select>
                    </div>
                    {editingAccount.usFeeType === 'SUB_BROKERAGE' && (
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">複委託手續費率 (如 0.001 代表 0.1%)</label>
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={editingAccount.feeRate || 0.001}
                          onChange={(e) => setEditingAccount({ ...editingAccount, feeRate: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-white"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setEditingAccount(null); setIsAddingNew(false); }}
                  className="px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> 儲存帳戶
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* 主流券商一鍵套用模板 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-slate-300">快速套用主流券商費率模板</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {DEFAULT_BROKER_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset)}
                      className="p-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/50 rounded-xl text-left transition-all group"
                    >
                      <div className="text-xs font-medium text-slate-200 group-hover:text-blue-300 truncate">
                        {preset.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {preset.market === 'TW'
                          ? `${(preset.discountRate * 10).toFixed(1)}折 · 低消 NT$ ${preset.minFee}`
                          : preset.usFeeType === 'ZERO_COMMISSION' ? '海外免手續費' : `複委託 ${((preset.feeRate || 0) * 100).toFixed(2)}%`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 現有帳戶清單 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">我的券商帳戶清單 ({accounts.length})</span>
                  <button
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
                    className="px-3 py-1.5 text-xs font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> 自訂新券商
                  </button>
                </div>

                <div className="space-y-2">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between p-3.5 bg-slate-800/50 border border-slate-700/70 rounded-xl hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: acc.color || (acc.market === 'TW' ? '#3b82f6' : '#38bdf8') }}
                        />
                        <div>
                          <div className="text-sm font-semibold text-white flex items-center gap-2">
                            {acc.name}
                            {acc.isDefault && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-slate-700 text-slate-300 rounded font-normal">
                                預設
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {acc.market === 'TW'
                              ? `手續費 ${(acc.discountRate * 10).toFixed(1)} 折 · 低消 NT$ ${acc.minFee} · 證交稅 ${acc.taxRate * 100}%`
                              : acc.usFeeType === 'ZERO_COMMISSION'
                              ? '美股海外免手續費 (SEC/TAF 實扣)'
                              : `美股複委託 ${((acc.feeRate || 0) * 100).toFixed(2)}% · 低消 $${acc.minFee} USD`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditingAccount(acc); setIsAddingNew(false); }}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
                          title="編輯費率"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(acc.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                          title="刪除帳戶"
                        >
                          <Trash2 className="w-4 h-4" />
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
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
