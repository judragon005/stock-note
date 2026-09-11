import React, { useState, useEffect } from 'react';
import {
  LoanRecord,
  LoanType,
  BrokerAccount,
  Currency,
  HoldingPosition,
  CollateralItem,
} from '../types/stock';
import { X, ShieldAlert, Plus, Trash2, ShieldCheck, Receipt } from 'lucide-react';

interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BrokerAccount[];
  holdings: HoldingPosition[];
  initialLoan?: LoanRecord | null;
  onSaveLoan: (loan: LoanRecord, shouldRecordFee?: boolean, shouldRecordDisbursement?: boolean) => void;
}

export const LoanModal: React.FC<LoanModalProps> = ({
  isOpen,
  onClose,
  accounts,
  holdings,
  initialLoan,
  onSaveLoan,
}) => {
  const [name, setName] = useState('');
  const [loanType, setLoanType] = useState<LoanType>('PLEDGE');
  const [accountId, setAccountId] = useState('');
  const [currency, setCurrency] = useState<Currency>('TWD');
  const [principal, setPrincipal] = useState('');
  const [annualInterestRate, setAnnualInterestRate] = useState('4.0');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [maturityDate, setMaturityDate] = useState('');
  const [warningRatio, setWarningRatio] = useState('130');
  const [safeRatio, setSafeRatio] = useState('166');
  const [collaterals, setCollaterals] = useState<CollateralItem[]>([]);
  
  // 股票質押三大規費
  const [transferFee, setTransferFee] = useState<string>('100'); // 撥券費
  const [pledgeRegistryFee, setPledgeRegistryFee] = useState<string>('100'); // 設質費
  const [handlingFee, setHandlingFee] = useState<string>('0'); // 開辦手續費
  const [autoRecordFee, setAutoRecordFee] = useState<boolean>(true);
  const [autoRecordDisbursement, setAutoRecordDisbursement] = useState<boolean>(true);
  const [closedDate, setClosedDate] = useState<string>('');
  const [lastInterestPaymentDate, setLastInterestPaymentDate] = useState<string>('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (initialLoan) {
      setName(initialLoan.name);
      setLoanType(initialLoan.loanType || 'PLEDGE');
      setAccountId(initialLoan.accountId || (accounts[0]?.id || ''));
      setCurrency(initialLoan.currency || 'TWD');
      setPrincipal(initialLoan.principal.toString());
      setAnnualInterestRate(
        initialLoan.annualInterestRate
          ? initialLoan.annualInterestRate.toString()
          : initialLoan.interestRate
          ? (initialLoan.interestRate * 100).toString()
          : '4.0'
      );
      setStartDate(initialLoan.startDate || initialLoan.date || new Date().toISOString().split('T')[0]);
      setLastInterestPaymentDate(initialLoan.lastInterestPaymentDate || '');
      setMaturityDate(initialLoan.maturityDate || '');
      setWarningRatio((initialLoan.warningRatio || 130).toString());
      setSafeRatio((initialLoan.safeRatio || 166).toString());
      setCollaterals(initialLoan.pledgedCollateral || []);
      
      const collCount = initialLoan.pledgedCollateral?.length || 1;
      setTransferFee((initialLoan.transferFee !== undefined ? initialLoan.transferFee : collCount * 100).toString());
      setPledgeRegistryFee((initialLoan.pledgeRegistryFee !== undefined ? initialLoan.pledgeRegistryFee : 100).toString());
      setHandlingFee((initialLoan.handlingFee !== undefined ? initialLoan.handlingFee : 0).toString());
      setAutoRecordFee(false);
      setAutoRecordDisbursement(false);
      setClosedDate(initialLoan.closedDate || '');
      setNote(initialLoan.note || '');
    } else {
      setName('');
      setLoanType('PLEDGE');
      setAccountId(accounts[0]?.id || '');
      setCurrency('TWD');
      setPrincipal('');
      setAnnualInterestRate('4.0');
      setStartDate(new Date().toISOString().split('T')[0]);
      setLastInterestPaymentDate('');
      setMaturityDate('');
      setWarningRatio('130');
      setSafeRatio('166');
      setCollaterals([]);
      setTransferFee('100');
      setPledgeRegistryFee('100');
      setHandlingFee('0');
      setAutoRecordFee(true);
      setAutoRecordDisbursement(true);
      setClosedDate('');
      setNote('');
    }
  }, [initialLoan, isOpen, accounts]);

  if (!isOpen) return null;

  const handleAddCollateral = () => {
    let nextCollaterals: CollateralItem[];
    if (holdings.length === 0) {
      nextCollaterals = [...collaterals, { symbol: '2330', shares: 1000 }];
    } else {
      const defaultHolding = holdings[0];
      nextCollaterals = [...collaterals, { symbol: defaultHolding.symbol, shares: defaultHolding.shares }];
    }
    setCollaterals(nextCollaterals);
    // 自動更新撥券費（每檔 NT$100）
    setTransferFee((nextCollaterals.length * 100).toString());
  };

  const handleRemoveCollateral = (idx: number) => {
    const nextCollaterals = collaterals.filter((_, i) => i !== idx);
    setCollaterals(nextCollaterals);
    setTransferFee((Math.max(1, nextCollaterals.length) * 100).toString());
  };

  const handleCollateralChange = (idx: number, field: keyof CollateralItem, val: string | number) => {
    const updated = [...collaterals];
    if (field === 'shares') {
      updated[idx].shares = parseFloat(val.toString()) || 0;
    } else {
      updated[idx].symbol = val.toString();
    }
    setCollaterals(updated);
  };

  // 計算規費總計
  const totalFees = (parseFloat(transferFee) || 0) + (parseFloat(pledgeRegistryFee) || 0) + (parseFloat(handlingFee) || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numPrincipal = parseFloat(principal);
    if (!numPrincipal || isNaN(numPrincipal) || numPrincipal <= 0) {
      alert('請輸入大於 0 的未還本金金額！');
      return;
    }
    if (!name.trim()) {
      alert('請輸入貸款項目名稱！');
      return;
    }

    const numTransferFee = parseFloat(transferFee) || 0;
    const numPledgeRegistryFee = parseFloat(pledgeRegistryFee) || 0;
    const numHandlingFee = parseFloat(handlingFee) || 0;
    const numPledgeFee = numTransferFee + numPledgeRegistryFee + numHandlingFee;

    const loan: LoanRecord = {
      id: initialLoan ? initialLoan.id : `loan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      accountId: accountId || undefined,
      name: name.trim(),
      loanType,
      type: 'BORROW',
      principal: numPrincipal,
      initialPrincipal: initialLoan?.initialPrincipal || numPrincipal,
      annualInterestRate: parseFloat(annualInterestRate) || 0,
      currency,
      startDate,
      date: startDate,
      lastInterestPaymentDate: (lastInterestPaymentDate.trim() && lastInterestPaymentDate.trim() !== startDate) ? lastInterestPaymentDate.trim() : undefined,
      maturityDate: maturityDate.trim() || undefined,
      pledgedCollateral: loanType === 'PLEDGE' ? collaterals.filter((c) => c.shares > 0) : undefined,
      transferFee: loanType === 'PLEDGE' ? numTransferFee : undefined,
      pledgeRegistryFee: loanType === 'PLEDGE' ? numPledgeRegistryFee : undefined,
      handlingFee: loanType === 'PLEDGE' ? numHandlingFee : undefined,
      pledgeFee: loanType === 'PLEDGE' ? numPledgeFee : undefined,
      closedDate: (numPrincipal === 0 && closedDate.trim()) ? closedDate.trim() : (initialLoan?.closedDate || undefined),
      warningRatio: parseFloat(warningRatio) || 130,
      safeRatio: parseFloat(safeRatio) || 166,
      note: note.trim() || undefined,
      createdAt: initialLoan ? initialLoan.createdAt : Date.now(),
    };

    onSaveLoan(loan, !initialLoan && autoRecordFee && numPledgeFee > 0, !initialLoan && autoRecordDisbursement);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-card modal-content"
        style={{ maxWidth: '560px', padding: '24px', borderRadius: '18px', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(168, 85, 247, 0.4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(51, 65, 85, 0.5)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#c084fc' }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                {initialLoan ? '編輯借貸 / 質押項目' : '新增借貸 / 股票質押'}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                監控未還本金、年利息、設質撥券規費與即時擔保維持率
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* 名稱與類型 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                貸款/質押名稱
              </label>
              <input
                type="text"
                required
                placeholder="如：永豐金 00878+00919 股票質押..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                貸款類型
              </label>
              <select
                value={loanType}
                onChange={(e) => setLoanType(e.target.value as LoanType)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.85rem', outline: 'none' }}
              >
                <option value="PLEDGE">股票質押借款</option>
                <option value="MARGIN">券商融資</option>
                <option value="CREDIT">個人信用貸款</option>
                <option value="MORTGAGE">房屋抵押貸款</option>
                <option value="OTHER">其他借款</option>
              </select>
            </div>
          </div>

          {/* 未還本金、幣別與利率 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                未還借款本金
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="495000"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                className="mono"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                幣別
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.85rem', outline: 'none' }}
              >
                <option value="TWD">TWD</option>
                <option value="USD">USD</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                借款年利率 (%)
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="4.0"
                value={annualInterestRate}
                onChange={(e) => setAnnualInterestRate(e.target.value)}
                className="mono"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>
          </div>

          {/* 關聯帳戶與起日 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                關聯券商/銀行戶
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.85rem', outline: 'none' }}
              >
                <option value="">(無特定關聯)</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                借款起日
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mono"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>
          </div>

          {/* 前次繳息/還款基準日手動維護通道 (Spec 0118 Ticket 04) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
              前次繳息/還款基準日 (選填，留空預設為借款起日)
            </label>
            <input
              type="date"
              value={lastInterestPaymentDate}
              onChange={(e) => setLastInterestPaymentDate(e.target.value)}
              min={startDate}
              className="mono"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#38bdf8', fontSize: '0.85rem', outline: 'none' }}
            />
            <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>
              💡 系統利息計算之起算點。若曾於特定日期還款或繳息，可於此校正以對齊真實起息日。
            </span>
          </div>

          {/* 若本金為 0 (已結清借貸)，提供結清還款日編輯 */}
          {parseFloat(principal) === 0 && (
            <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#34d399', marginBottom: '4px' }}>
                ✅ 結清還款日 / 終止日 (已結清借貸)
              </label>
              <input
                type="date"
                value={closedDate}
                onChange={(e) => setClosedDate(e.target.value)}
                className="mono"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', fontSize: '0.85rem', outline: 'none' }}
              />
              <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>
                此借貸未還本金為 0，設定結清還款日後將精確計算借款歷時天數與總借貸成本。
              </span>
            </div>
          )}

          {/* 自動於關聯交割戶記錄撥款入帳 */}
          {!initialLoan && (
            <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.3)' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.75rem', color: '#7dd3fc', cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={autoRecordDisbursement}
                  onChange={(e) => setAutoRecordDisbursement(e.target.checked)}
                  style={{ accentColor: '#0ea5e9', marginTop: '2px' }}
                />
                <span>
                  🏦 建立時自動於關聯帳戶記錄<b>借款撥款入帳 (LOAN_DISBURSEMENT)</b>
                  <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                    入帳金額為 +{currency === 'USD' ? '$' : 'NT$'} {parseFloat(principal) || 0}，日期對齊借款起日，確保現金帳本平衡。
                  </span>
                </span>
              </label>
            </div>
          )}

          {/* 股票質押專屬：質押擔保品明細、三大規費與警戒線 */}
          {loanType === 'PLEDGE' && (
            <div
              style={{
                padding: '14px',
                borderRadius: '10px',
                background: 'rgba(3, 7, 18, 0.6)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} /> 質押股票擔保品明細 (動態試算維持率)
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddCollateral}
                  style={{ padding: '3px 8px', fontSize: '0.72rem', color: '#c084fc' }}
                >
                  <Plus size={12} /> 新增擔保品
                </button>
              </div>

              {collaterals.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', padding: '10px 0' }}>
                  尚無擔保品。點擊上方按鈕綁定在庫持股。
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                  {collaterals.map((c, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select
                        value={c.symbol}
                        onChange={(e) => handleCollateralChange(idx, 'symbol', e.target.value)}
                        style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.78rem', outline: 'none' }}
                      >
                        {holdings.map((h) => (
                          <option key={h.symbol} value={h.symbol}>
                            {h.symbol} {h.name} (庫存: {h.shares.toLocaleString()} 股)
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="質押股數"
                        value={c.shares}
                        onChange={(e) => handleCollateralChange(idx, 'shares', e.target.value)}
                        className="mono"
                        style={{ width: '90px', padding: '6px 8px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.8rem', outline: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCollateral(idx)}
                        style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 股票質押三大規費細項 (撥券費、設質費、手續費) */}
              <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(51, 65, 85, 0.5)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Receipt size={14} /> 股票質押三大規費明細 (合計: NT$ {totalFees.toLocaleString()}):
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '2px' }}>
                      撥券費 (每檔$100)
                    </label>
                    <input
                      type="number"
                      value={transferFee}
                      onChange={(e) => setTransferFee(e.target.value)}
                      className="mono"
                      style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fbbf24', fontSize: '0.8rem', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '2px' }}>
                      設質登記費
                    </label>
                    <input
                      type="number"
                      value={pledgeRegistryFee}
                      onChange={(e) => setPledgeRegistryFee(e.target.value)}
                      className="mono"
                      style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fbbf24', fontSize: '0.8rem', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '2px' }}>
                      開辦/徵信手續費
                    </label>
                    <input
                      type="number"
                      value={handlingFee}
                      onChange={(e) => setHandlingFee(e.target.value)}
                      className="mono"
                      style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fbbf24', fontSize: '0.8rem', outline: 'none' }}
                    />
                  </div>
                </div>

                {!initialLoan && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#cbd5e1', cursor: 'pointer', marginTop: '2px' }}>
                    <input
                      type="checkbox"
                      checked={autoRecordFee}
                      onChange={(e) => setAutoRecordFee(e.target.checked)}
                      style={{ accentColor: '#a855f7' }}
                    />
                    建立時自動在關聯交割戶記錄上述規費扣款 (合計 NT$ {totalFees})
                  </label>
                )}
              </div>

              {/* 警戒線 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingTop: '8px', borderTop: '1px solid rgba(51, 65, 85, 0.4)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '2px' }}>
                    追繳警戒線 (%)
                  </label>
                  <input
                    type="number"
                    value={warningRatio}
                    onChange={(e) => setWarningRatio(e.target.value)}
                    className="mono"
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.8rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '2px' }}>
                    安全維持線 (%)
                  </label>
                  <input
                    type="number"
                    value={safeRatio}
                    onChange={(e) => setSafeRatio(e.target.value)}
                    className="mono"
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.8rem', outline: 'none' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 備註 */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
              備註說明 (選填)
            </label>
            <input
              type="text"
              placeholder="如：借款目的、還款計畫..."
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
            <button
              type="submit"
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)' }}
            >
              確認儲存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
