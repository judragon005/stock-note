import React, { useState, useEffect } from 'react';
import {
  CashTransaction,
  CashFlowCategory,
  CashEntryType,
  BrokerAccount,
  Currency,
} from '../types/stock';
import { createFxTransferPair, getSettlementDate } from '../engine/cashLedgerEngine';
import {
  X,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Landmark,
  DollarSign,
  FileText,
  Percent,
  Coins,
  Receipt,
  CreditCard,
  Clock,
} from 'lucide-react';

interface CashTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BrokerAccount[];
  initialTransaction?: CashTransaction | null;
  onSaveTransaction: (tx: CashTransaction) => void;
  onSaveTransferPair?: (outflow: CashTransaction, inflow: CashTransaction) => void;
  usdToTwdRate?: number;
}

type ModalMode = 'SINGLE' | 'TRANSFER';

export const CashTransactionModal: React.FC<CashTransactionModalProps> = ({
  isOpen,
  onClose,
  accounts,
  initialTransaction,
  onSaveTransaction,
  onSaveTransferPair,
  usdToTwdRate = 32.0,
}) => {
  const [mode, setMode] = useState<ModalMode>('SINGLE');
  const [category, setCategory] = useState<CashEntryType>('DEPOSIT');
  const [accountId, setAccountId] = useState<string>('');
  const [currency, setCurrency] = useState<Currency>('TWD');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [settlementDate, setSettlementDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [settlementStatus, setSettlementStatus] = useState<'PENDING' | 'SETTLED'>('SETTLED');
  const [fee, setFee] = useState<string>('0');
  const [note, setNote] = useState<string>('');

  // 跨帳戶轉帳/換匯專用狀態
  const [targetAccountId, setTargetAccountId] = useState<string>('');
  const [fxRate, setFxRate] = useState<string>(usdToTwdRate.toString());
  const [targetAmount, setTargetAmount] = useState<string>('');

  useEffect(() => {
    if (initialTransaction) {
      const isTransfer = initialTransaction.type === 'FX_TRANSFER_IN' || initialTransaction.type === 'FX_TRANSFER_OUT';
      setMode(isTransfer ? 'TRANSFER' : 'SINGLE');
      setCategory((initialTransaction.category || initialTransaction.type) as CashFlowCategory);
      setAccountId(initialTransaction.accountId);
      setCurrency(initialTransaction.currency);
      setAmount(Math.abs(initialTransaction.amount).toString());
      setDate(initialTransaction.date);
      setSettlementDate(initialTransaction.settlementDate || initialTransaction.date);
      setSettlementStatus(initialTransaction.settlementStatus || 'SETTLED');
      setFee(initialTransaction.fee ? initialTransaction.fee.toString() : '0');
      setNote(initialTransaction.note || '');
      setTargetAccountId(initialTransaction.transferTargetAccountId || '');
      setFxRate(initialTransaction.fxRate ? initialTransaction.fxRate.toString() : usdToTwdRate.toString());
    } else {
      // 預設填入第一個帳戶
      let initialAcc = accounts[0];
      if (accounts.length > 0) {
        const defaultAcc = accounts.find((a) => a.isDefault) || accounts[0];
        initialAcc = defaultAcc;
        setAccountId(defaultAcc.id);
        setCurrency(defaultAcc.market === 'US' ? 'USD' : 'TWD');
      }
      const todayStr = new Date().toISOString().split('T')[0];
      const initialSDate = getSettlementDate(todayStr, initialAcc?.market === 'US' ? 'US' : 'TW', 'DEPOSIT');
      setMode('SINGLE');
      setCategory('DEPOSIT');
      setAmount('');
      setDate(todayStr);
      setSettlementDate(initialSDate);
      setSettlementStatus(initialSDate > todayStr ? 'PENDING' : 'SETTLED');
      setFee('0');
      setNote('');
      setTargetAccountId(accounts.length > 1 ? accounts[1].id : '');
      setFxRate(usdToTwdRate.toString());
      setTargetAmount('');
    }
  }, [initialTransaction, isOpen, accounts, usdToTwdRate]);

  // 當帳戶變更時自動同步幣別
  const handleAccountChange = (accId: string) => {
    setAccountId(accId);
    const acc = accounts.find((a) => a.id === accId);
    if (acc) {
      setCurrency(acc.market === 'US' ? 'USD' : 'TWD');
    }
  };

  // 當來源金額或匯率變動時自動試算目標金額
  const handleAmountChange = (val: string) => {
    setAmount(val);
    const numAmount = parseFloat(val);
    const numFx = parseFloat(fxRate);
    if (!isNaN(numAmount) && !isNaN(numFx) && numFx > 0) {
      const srcAcc = accounts.find((a) => a.id === accountId);
      if (srcAcc?.market === 'TW') {
        // 台幣換美金
        setTargetAmount((numAmount / numFx).toFixed(2));
      } else {
        // 美金換台幣
        setTargetAmount(Math.round(numAmount * numFx).toString());
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      alert('請輸入大於 0 的有效金額！');
      return;
    }

    if (mode === 'TRANSFER') {
      if (!targetAccountId || targetAccountId === accountId) {
        alert('請選擇不同的目標轉入帳戶！');
        return;
      }
      const numTargetAmount = parseFloat(targetAmount);
      const numFx = parseFloat(fxRate) || usdToTwdRate;
      const numFee = parseFloat(fee) || 0;

      if (onSaveTransferPair) {
        const pair = createFxTransferPair({
          sourceAccountId: accountId,
          targetAccountId,
          sourceAmount: numAmount,
          targetAmount: !isNaN(numTargetAmount) && numTargetAmount > 0 ? numTargetAmount : numAmount,
          fxRate: numFx,
          fee: numFee,
          date,
          note: note.trim() || '跨帳戶資金調撥',
        });
        onSaveTransferPair(pair.outflow, pair.inflow);
      }
      onClose();
      return;
    }

    // 一般單筆流水 (流出類別取負值，流入類別取正值)
    const isOutflow =
      category === 'WITHDRAWAL' ||
      category === 'FINANCING_FEE' ||
      category === 'WIRE_FEE' ||
      category === 'STOCK_BUY' ||
      category === 'LOAN_REPAYMENT' ||
      category === 'TAX' ||
      category === 'FEE';

    const finalAmount = isOutflow ? -numAmount : numAmount;

    const tx: CashTransaction = {
      id: initialTransaction ? initialTransaction.id : `tx-manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      accountId,
      currency,
      type: category,
      category: category as CashFlowCategory,
      amount: finalAmount,
      date,
      tradeDate: date,
      settlementDate: settlementDate || date,
      settlementStatus,
      relatedTradeId: initialTransaction?.relatedTradeId,
      relatedLoanId: initialTransaction?.relatedLoanId,
      fee: parseFloat(fee) || 0,
      note: note.trim() || undefined,
      createdAt: initialTransaction ? initialTransaction.createdAt : Date.now(),
    };

    onSaveTransaction(tx);
    onClose();
  };

  const categories: { key: CashFlowCategory | 'TAX'; label: string; icon: React.ReactNode }[] = [
    { key: 'DEPOSIT', label: '外部入金', icon: <ArrowDownRight size={14} color="#34d399" /> },
    { key: 'WITHDRAWAL', label: '外部出金', icon: <ArrowUpRight size={14} color="#f87171" /> },
    { key: 'INTEREST_INCOME', label: '活存利息', icon: <Percent size={14} color="#fbbf24" /> },
    { key: 'DIVIDEND_PAYOUT', label: '現金股息', icon: <Coins size={14} color="#10b981" /> },
    { key: 'STOCK_BUY', label: '買進扣款', icon: <ArrowUpRight size={14} color="#ef4444" /> },
    { key: 'STOCK_SELL', label: '賣出入帳', icon: <ArrowDownRight size={14} color="#38bdf8" /> },
    { key: 'CAPITAL_RETURN', label: '減資退款', icon: <DollarSign size={14} color="#c084fc" /> },
    { key: 'WIRE_FEE', label: '電匯/手續費', icon: <DollarSign size={14} color="#94a3b8" /> },
    { key: 'FINANCING_FEE', label: '融資/借貸息', icon: <Percent size={14} color="#e879f9" /> },
    { key: 'TAX', label: '稅費扣除', icon: <Receipt size={14} color="#f43f5e" /> },
    { key: 'LOAN_DISBURSEMENT', label: '借貸撥款', icon: <CreditCard size={14} color="#22d3ee" /> },
    { key: 'LOAN_REPAYMENT', label: '借貸還本', icon: <CreditCard size={14} color="#fb923c" /> },
    { key: 'OTHER', label: '其他收支', icon: <FileText size={14} color="#60a5fa" /> },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-card modal-content"
        style={{ maxWidth: '540px', padding: '24px', borderRadius: '18px', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(51, 65, 85, 0.8)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(51, 65, 85, 0.5)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399' }}>
              <Landmark size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                {initialTransaction ? '編輯現金流水' : '記錄現金收支 / 換匯調撥'}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                管理出入金、活存利息、換匯與手續費
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 自動連動提示橫條 */}
        {initialTransaction?.relatedTradeId && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: '#60a5fa',
              fontSize: '0.75rem',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>💡 此筆為股票/股息自動連動交易，修改實收金額後將同步更新原始紀錄與全域總淨值。</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Mode Switcher */}
          {!initialTransaction && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'rgba(30, 41, 59, 0.6)', padding: '4px', borderRadius: '10px' }}>
              <button
                type="button"
                className={`btn btn-sm ${mode === 'SINGLE' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setMode('SINGLE')}
                style={{ borderRadius: '8px', fontSize: '0.8rem', padding: '6px' }}
              >
                單筆收支紀錄
              </button>
              <button
                type="button"
                className={`btn btn-sm ${mode === 'TRANSFER' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setMode('TRANSFER')}
                style={{ borderRadius: '8px', fontSize: '0.8rem', padding: '6px' }}
              >
                <ArrowLeftRight size={14} /> 跨帳戶換匯/調撥
              </button>
            </div>
          )}

          {mode === 'SINGLE' ? (
            /* 單筆模式 */
            <>
              {/* Category Grid */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
                  金流類別
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {categories.map((c) => {
                    const isSelected = category === c.key;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => {
                          setCategory(c.key as CashEntryType);
                          const targetAcc = accounts.find((a) => a.id === accountId) || accounts[0];
                          const autoSDate = getSettlementDate(date, targetAcc?.market === 'US' ? 'US' : 'TW', c.key);
                          setSettlementDate(autoSDate);
                          setSettlementStatus(autoSDate > date ? 'PENDING' : 'SETTLED');
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 4px',
                          borderRadius: '8px',
                          fontSize: '0.72rem',
                          fontWeight: isSelected ? 700 : 500,
                          background: isSelected ? 'rgba(59, 130, 246, 0.25)' : 'rgba(30, 41, 59, 0.4)',
                          border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(51, 65, 85, 0.5)',
                          color: isSelected ? '#ffffff' : '#94a3b8',
                          cursor: 'pointer',
                        }}
                      >
                        {c.icon}
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Account & Currency */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                    入帳/扣款帳戶
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => handleAccountChange(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.85rem', outline: 'none' }}
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.market === 'US' ? 'USD' : 'TWD'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                    計價幣別
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as Currency)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.85rem', outline: 'none' }}
                  >
                    <option value="TWD">TWD 新台幣</option>
                    <option value="USD">USD 美元</option>
                  </select>
                </div>
              </div>

              {/* Amount & Trade Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                    變動金額 ({currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mono"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.95rem', fontWeight: 700, outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                    成交/記錄日期
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setDate(newDate);
                      const targetAcc = accounts.find((a) => a.id === accountId) || accounts[0];
                      const autoSDate = getSettlementDate(newDate, targetAcc?.market === 'US' ? 'US' : 'TW', category);
                      setSettlementDate(autoSDate);
                      setSettlementStatus(autoSDate > newDate ? 'PENDING' : 'SETTLED');
                    }}
                    className="mono"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Settlement Date & Status Override */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', background: 'rgba(30, 41, 59, 0.4)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(51, 65, 85, 0.5)' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: '#60a5fa', marginBottom: '4px' }}>
                    <Clock size={12} /> 預計交割日 (可自訂覆寫)
                  </label>
                  <input
                    type="date"
                    required
                    value={settlementDate}
                    onChange={(e) => setSettlementDate(e.target.value)}
                    className="mono"
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#60a5fa', marginBottom: '4px' }}>
                    交割狀態
                  </label>
                  <select
                    value={settlementStatus}
                    onChange={(e) => setSettlementStatus(e.target.value as 'PENDING' | 'SETTLED')}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: settlementStatus === 'PENDING' ? '#fbbf24' : '#34d399', fontSize: '0.82rem', fontWeight: 600, outline: 'none' }}
                  >
                    <option value="SETTLED">✅ 已交割 (入帳/扣款)</option>
                    <option value="PENDING">⏳ 待交割 (在途鎖定)</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            /* 換匯/調撥模式 */
            <>
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', fontSize: '0.78rem', color: '#93c5fd' }}>
                💡 跨帳戶換匯將同時生成一筆<b>轉出扣款</b>與一筆<b>轉入入帳</b>流水，支援記錄成交匯率與手續費。
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                    轉出來源帳戶
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => handleAccountChange(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.85rem', outline: 'none' }}
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.market === 'US' ? 'USD' : 'TWD'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                    轉入目標帳戶
                  </label>
                  <select
                    value={targetAccountId}
                    onChange={(e) => setTargetAccountId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.85rem', outline: 'none' }}
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id} disabled={acc.id === accountId}>
                        {acc.name} ({acc.market === 'US' ? 'USD' : 'TWD'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                    轉出金額 ({currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="mono"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                    換匯匯率 (USD/TWD)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="32.0"
                    value={fxRate}
                    onChange={(e) => {
                      setFxRate(e.target.value);
                      handleAmountChange(amount);
                    }}
                    className="mono"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                    目標入帳金額
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="mono"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                    手續費/電匯費 (TWD)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={fee}
                    onChange={(e) => setFee(e.target.value)}
                    className="mono"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                  調撥日期
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mono"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>
            </>
          )}

          {/* 備註 */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
              備註說明 (選填)
            </label>
            <input
              type="text"
              placeholder="如：定期定額入金、閒置資金換匯、利息發放..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.85rem', outline: 'none' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              確認儲存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
