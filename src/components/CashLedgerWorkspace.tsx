import React, { useState, useMemo, useEffect } from 'react';
import {
  BrokerAccount,
  CashTransaction,
  LoanRecord,
  HoldingPosition,
  PriceQuote,
  TradeRecord,
  Currency,
  MarketType,
} from '../types/stock';
import {
  calculateAccountBalances,
  calculateOverallLeverageMetrics,
  calculatePledgeMaintenanceRatio,
  syncTradesWithCashTransactions,
  reconcileAccountBalance,
  calculateLoanInterestAndPayoff,
  sortCashTransactions,
  calculateTotalBuyingPower,
  groupPendingSettlementsByTimeline,
} from '../engine/cashLedgerEngine';
import { CashTransactionModal } from './CashTransactionModal';
import { LoanModal } from './LoanModal';
import { PendingSettlementCard } from './PendingSettlementCard';
import {
  Wallet,
  Building2,
  Plus,
  ArrowLeftRight,
  Percent,
  Search,
  Trash2,
  Edit2,
  RefreshCw,
  Landmark,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  Coins,
  Sparkles,
  Zap,
  CheckCircle2,
  X,
  CreditCard,
  Receipt,
  Clock,
} from 'lucide-react';

interface CashLedgerWorkspaceProps {
  accounts: BrokerAccount[];
  transactions: CashTransaction[];
  onSaveTransactions: (txs: CashTransaction[]) => void;
  loans: LoanRecord[];
  onSaveLoans: (loans: LoanRecord[]) => void;
  holdings: HoldingPosition[];
  quotes: Record<string, PriceQuote>;
  usdToTwdRate?: number;
  trades?: TradeRecord[];
  onUpdateTrade?: (trade: TradeRecord) => void;
  currentMarket?: MarketType | 'ALL';
  selectedAccountId?: string;
}

export const CashLedgerWorkspace: React.FC<CashLedgerWorkspaceProps> = ({
  accounts,
  transactions,
  onSaveTransactions,
  loans,
  onSaveLoans,
  holdings,
  quotes,
  usdToTwdRate = 32.0,
  trades = [],
  onUpdateTrade,
  currentMarket = 'ALL',
  selectedAccountId: globalSelectedAccountId = 'ALL',
}) => {
  // --- 狀態管理 ---
  const [selectedAccountId, setSelectedAccountId] = useState<string>(globalSelectedAccountId);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedSettlementFilter, setSelectedSettlementFilter] = useState<'ALL' | 'PENDING' | 'SETTLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');

  // 同步全域帳戶篩選
  useEffect(() => {
    if (globalSelectedAccountId) {
      setSelectedAccountId(globalSelectedAccountId);
    }
  }, [globalSelectedAccountId]);

  // 依據頂部市場 (ALL / TW / US) 隔離過濾資產、借貸與流水範疇
  const scopedAccounts = useMemo(() => {
    if (currentMarket === 'ALL') return accounts;
    return accounts.filter((a) => a.market === currentMarket);
  }, [accounts, currentMarket]);

  const scopedHoldings = useMemo(() => {
    if (currentMarket === 'ALL') return holdings;
    if (currentMarket === 'TW') return holdings.filter((h) => h.currency === 'TWD');
    return holdings.filter((h) => h.currency === 'USD');
  }, [holdings, currentMarket]);

  const scopedLoans = useMemo(() => {
    if (currentMarket === 'ALL') return loans;
    if (currentMarket === 'TW') return loans.filter((l) => l.currency === 'TWD' || !l.currency);
    return loans.filter((l) => l.currency === 'USD');
  }, [loans, currentMarket]);

  const scopedTransactions = useMemo(() => {
    if (currentMarket === 'ALL') return transactions;
    if (currentMarket === 'TW') return transactions.filter((t) => t.currency === 'TWD');
    return transactions.filter((t) => t.currency === 'USD');
  }, [transactions, currentMarket]);

  // 彈窗狀態
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<CashTransaction | null>(null);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanRecord | null>(null);

  // 餘額校正彈窗狀態
  const [reconcileTarget, setReconcileTarget] = useState<{
    accountId: string;
    accountName: string;
    currentBalance: number;
    currency: Currency;
  } | null>(null);
  const [reconcileTargetAmount, setReconcileTargetAmount] = useState<string>('0');
  const [reconcileDate, setReconcileDate] = useState<string>('');

  // 借貸快速繳息 / 還款 / 一鍵結清彈窗
  const [payLoanTarget, setPayLoanTarget] = useState<{
    loan: LoanRecord;
    actionType: 'PAY_INTEREST' | 'REPAY_PRINCIPAL' | 'FULL_PAYOFF';
  } | null>(null);
  const [payAmountInput, setPayAmountInput] = useState<string>('');
  const [payAccountId, setPayAccountId] = useState<string>('');

  // 找出最早交易日期作為預設初始入金日
  const earliestTradeDate = useMemo(() => {
    if (trades.length === 0) return new Date().toISOString().split('T')[0];
    const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
    return sorted[0].date;
  }, [trades]);

  // 1. 核心計算 (依市場過濾範疇計算)
  const balancesSummary = useMemo(() => {
    return calculateAccountBalances(scopedAccounts, scopedTransactions, usdToTwdRate);
  }, [scopedAccounts, scopedTransactions, usdToTwdRate]);

  // 在途時序排程群組
  const pendingTimelineGroup = useMemo(() => {
    return groupPendingSettlementsByTimeline(scopedTransactions, scopedAccounts, usdToTwdRate);
  }, [scopedTransactions, scopedAccounts, usdToTwdRate]);

  // 全市場即時交易購買力 (折算 TWD)
  const totalBuyingPowerInTWD = useMemo(() => {
    return calculateTotalBuyingPower(balancesSummary, scopedTransactions, usdToTwdRate);
  }, [balancesSummary, scopedTransactions, usdToTwdRate]);

  // 是否展開在途時序排程看板
  const [isTimelineDrawerOpen, setIsTimelineDrawerOpen] = useState(true);

  // 總股票市值 (折算 TWD)
  const totalStockMarketValueInTWD = useMemo(() => {
    return scopedHoldings.reduce((sum, h) => {
      const rate = h.currency === 'USD' ? usdToTwdRate : 1;
      return sum + h.marketValue * rate;
    }, 0);
  }, [scopedHoldings, usdToTwdRate]);

  // 整體槓桿與負債風控
  const leverageMetrics = useMemo(() => {
    return calculateOverallLeverageMetrics(
      scopedLoans,
      totalStockMarketValueInTWD,
      balancesSummary.totalCashInTWD,
      usdToTwdRate
    );
  }, [scopedLoans, totalStockMarketValueInTWD, balancesSummary.totalCashInTWD, usdToTwdRate]);

  // 一鍵切換交割狀態 (⏳ 待交割 ➔ ✅ 已交割)
  const handleToggleSettlementStatus = (txId: string) => {
    const updated = transactions.map((t) => {
      if (t.id === txId) {
        const nextStatus: 'PENDING' | 'SETTLED' = t.settlementStatus === 'PENDING' ? 'SETTLED' : 'PENDING';
        return {
          ...t,
          settlementStatus: nextStatus,
        };
      }
      return t;
    });
    onSaveTransactions(updated);
  };

  // 2. 單筆流水操作 (支援雙向回寫關聯股票交易 / 股息紀錄)
  const handleSaveTransaction = (tx: CashTransaction) => {
    const existingIdx = transactions.findIndex((t) => t.id === tx.id);
    let updated: CashTransaction[];
    if (existingIdx >= 0) {
      updated = [...transactions];
      updated[existingIdx] = tx;
    } else {
      updated = [tx, ...transactions];
    }
    onSaveTransactions(updated);

    // 若該筆流水關聯股票交易或股息 (relatedTradeId)，雙向同步回寫 Trade 原始紀錄
    if (tx.relatedTradeId && onUpdateTrade && trades && trades.length > 0) {
      const targetTrade = trades.find((t) => t.id === tx.relatedTradeId);
      if (targetTrade) {
        let updatedTrade: TradeRecord = {
          ...targetTrade,
          date: tx.tradeDate || tx.date,
        };

        if (targetTrade.type === 'DIVIDEND') {
          // 股息：依實收金額與稅額回算每股股息 price
          const tax = targetTrade.tax || 0;
          const grossAmount = Math.abs(tx.amount) + tax;
          if (targetTrade.shares > 0) {
            updatedTrade.price = grossAmount / targetTrade.shares;
          } else {
            updatedTrade.price = grossAmount;
            updatedTrade.shares = 1;
          }
        } else if (targetTrade.type === 'CAPITAL_REDUCTION') {
          updatedTrade.cashAmount = Math.abs(tx.amount);
        }

        onUpdateTrade(updatedTrade);
      }
    }
  };

  const handleSaveTransferPair = (outflow: CashTransaction, inflow: CashTransaction) => {
    onSaveTransactions([outflow, inflow, ...transactions]);
  };

  const handleDeleteTransaction = (id: string) => {
    const target = transactions.find((t) => t.id === id);
    if (!target) return;
    if (target.relatedTradeId) {
      if (!confirm('此筆為股票交易自動連動交割款，刪除後將於下次對齊時重新產生。確定要刪除嗎？')) {
        return;
      }
    } else {
      if (!confirm('確定要刪除此筆現金流水紀錄嗎？')) {
        return;
      }
    }
    onSaveTransactions(transactions.filter((t) => t.id !== id));
  };

  // 3. 借貸項目操作 (支援三大規費手續費自動連動)
  const handleSaveLoan = (loan: LoanRecord, shouldRecordFee?: boolean) => {
    const existingIdx = loans.findIndex((l) => l.id === loan.id);
    let updatedLoans: LoanRecord[];
    if (existingIdx >= 0) {
      updatedLoans = [...loans];
      updatedLoans[existingIdx] = loan;
    } else {
      updatedLoans = [loan, ...loans];
    }
    onSaveLoans(updatedLoans);

    // 若為新建立質押且勾選自動記錄三大規費
    const totalFeeAmount = loan.pledgeFee || ((loan.transferFee || 0) + (loan.pledgeRegistryFee || 0) + (loan.handlingFee || 0));
    if (shouldRecordFee && totalFeeAmount > 0) {
      const now = Date.now();
      const feeTx: CashTransaction = {
        id: `tx-pledge-fee-${loan.id}-${now}`,
        accountId: loan.accountId || (accounts[0]?.id || ''),
        currency: loan.currency || 'TWD',
        type: 'WIRE_FEE',
        category: 'WIRE_FEE',
        amount: -totalFeeAmount,
        date: loan.startDate || loan.date || new Date().toISOString().split('T')[0],
        relatedLoanId: loan.id,
        note: `股票質押規費 (撥券 $${loan.transferFee || 0} + 設質 $${loan.pledgeRegistryFee || 0} + 手續費 $${loan.handlingFee || 0}): ${loan.name}`,
        createdAt: now,
      };
      onSaveTransactions([feeTx, ...transactions]);
    }
  };

  const handleDeleteLoan = (id: string) => {
    if (confirm('確定要刪除此借貸/質押項目嗎？')) {
      onSaveLoans(loans.filter((l) => l.id !== id));
    }
  };

  // 4. 一鍵與股票交易對齊 (含 T+2 / T+1 交割日試算)
  const handleSyncWithTrades = () => {
    if (trades.length === 0) {
      alert('目前尚無股票交易紀錄可供對齊。');
      return;
    }
    const synced = syncTradesWithCashTransactions(trades, transactions);
    onSaveTransactions(synced);
    alert(`🎉 成功完成交割流水對齊！已依台股 (T+2) 與美股 (T+1) 規則從 ${trades.length} 筆股票交易同步產生 ${synced.length} 筆現金收支明細。`);
  };

  // 5. 開啟餘額校正
  const handleOpenReconcile = (acc: BrokerAccount) => {
    const summary = balancesSummary.byAccount[acc.id] || { balance: 0 };
    setReconcileTarget({
      accountId: acc.id,
      accountName: acc.name,
      currentBalance: summary.balance,
      currency: acc.market === 'US' ? 'USD' : 'TWD',
    });
    setReconcileTargetAmount(summary.balance < 0 ? '0' : summary.balance.toString());
    setReconcileDate(earliestTradeDate);
  };

  // 執行餘額校正
  const handleConfirmReconcile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileTarget) return;

    const targetVal = parseFloat(reconcileTargetAmount);
    if (isNaN(targetVal)) {
      alert('請輸入有效的真實現金金額！');
      return;
    }

    const tx = reconcileAccountBalance({
      accountId: reconcileTarget.accountId,
      currentBalance: reconcileTarget.currentBalance,
      targetBalance: targetVal,
      currency: reconcileTarget.currency,
      date: reconcileDate || earliestTradeDate,
    });

    if (tx) {
      onSaveTransactions([tx, ...transactions]);
      alert(`✅ 已成功校正！已自動補登一筆初始本金入金 NT$ ${Math.abs(Math.round(tx.amount)).toLocaleString()}，當前可用餘額已精確對齊為 ${reconcileTarget.currency === 'USD' ? '$' : 'NT$'} ${targetVal.toLocaleString()}！`);
    } else {
      alert('餘額已完全一致，無需額外校正。');
    }

    setReconcileTarget(null);
  };

  // 6. 開啟借貸快速繳息 / 還款 / 一鍵結清
  const handleOpenPayLoan = (loan: LoanRecord, actionType: 'PAY_INTEREST' | 'REPAY_PRINCIPAL' | 'FULL_PAYOFF') => {
    const metrics = calculateLoanInterestAndPayoff(loan);
    const defaultAmount = actionType === 'PAY_INTEREST'
      ? (metrics.accruedInterest > 0 ? metrics.accruedInterest : metrics.monthlyEstimatedInterest).toString()
      : actionType === 'FULL_PAYOFF'
      ? metrics.totalPayoffAmount.toString()
      : loan.principal.toString();

    setPayLoanTarget({ loan, actionType });
    setPayAmountInput(defaultAmount);
    setPayAccountId(loan.accountId || (scopedAccounts[0]?.id || accounts[0]?.id || ''));
  };

  // 執行繳息、還本或一鍵結清
  const handleConfirmPayLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payLoanTarget) return;

    const numAmount = parseFloat(payAmountInput);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('請輸入大於 0 的有效金額！');
      return;
    }

    const { loan, actionType } = payLoanTarget;
    const todayStr = new Date().toISOString().split('T')[0];
    const now = Date.now();
    const currencySymbol = loan.currency === 'USD' ? '$' : 'NT$';
    const targetAccountId = payAccountId || (loan.accountId || accounts[0]?.id || '');

    if (actionType === 'PAY_INTEREST') {
      const interestTx: CashTransaction = {
        id: `tx-interest-${loan.id}-${now}`,
        accountId: targetAccountId,
        currency: loan.currency || 'TWD',
        type: 'FINANCING_FEE',
        category: 'FINANCING_FEE',
        amount: -numAmount,
        date: todayStr,
        relatedLoanId: loan.id,
        note: `支付質押借款利息: ${loan.name}`,
        createdAt: now,
      };

      const updatedLoans = loans.map((l) =>
        l.id === loan.id ? { ...l, lastInterestPaymentDate: todayStr } : l
      );

      onSaveTransactions([interestTx, ...transactions]);
      onSaveLoans(updatedLoans);
      alert(`✅ 成功支付利息 ${currencySymbol} ${numAmount.toLocaleString()}，已記錄於現金帳本並更新付息日！`);
    } else if (actionType === 'FULL_PAYOFF') {
      // 一鍵全額結清 (本利和 + 規費，自動拆分精準流水)
      const metrics = calculateLoanInterestAndPayoff(loan);
      const splitTxs: CashTransaction[] = [];

      // 1. 本金還款流水
      if (loan.principal > 0) {
        splitTxs.push({
          id: `tx-repay-${loan.id}-${now}-1`,
          accountId: targetAccountId,
          currency: loan.currency || 'TWD',
          type: 'LOAN_REPAYMENT',
          category: 'LOAN_REPAYMENT',
          amount: -loan.principal,
          date: todayStr,
          relatedLoanId: loan.id,
          note: `結清償還質押本金: ${loan.name}`,
          createdAt: now,
        });
      }

      // 2. 融資利息支出流水
      if (metrics.accruedInterest > 0) {
        splitTxs.push({
          id: `tx-interest-${loan.id}-${now}-2`,
          accountId: targetAccountId,
          currency: loan.currency || 'TWD',
          type: 'FINANCING_FEE',
          category: 'FINANCING_FEE',
          amount: -metrics.accruedInterest,
          date: todayStr,
          relatedLoanId: loan.id,
          note: `結清質押利息 (計息 ${metrics.daysElapsed} 天): ${loan.name}`,
          createdAt: now + 1,
        });
      }

      // 3. 設質規費扣除流水 (若有規費)
      if (metrics.pledgeFees > 0) {
        splitTxs.push({
          id: `tx-fee-${loan.id}-${now}-3`,
          accountId: targetAccountId,
          currency: loan.currency || 'TWD',
          type: 'WIRE_FEE',
          category: 'WIRE_FEE',
          amount: -metrics.pledgeFees,
          date: todayStr,
          relatedLoanId: loan.id,
          note: `結清設質規費 (撥券/設質/手續費): ${loan.name}`,
          createdAt: now + 2,
        });
      }

      // 若使用者自訂了結清總金額且與預估總額不同，以 LOAN_REPAYMENT 補足差額
      if (splitTxs.length === 0) {
        splitTxs.push({
          id: `tx-repay-${loan.id}-${now}-fallback`,
          accountId: targetAccountId,
          currency: loan.currency || 'TWD',
          type: 'LOAN_REPAYMENT',
          category: 'LOAN_REPAYMENT',
          amount: -numAmount,
          date: todayStr,
          relatedLoanId: loan.id,
          note: `結清借款: ${loan.name}`,
          createdAt: now,
        });
      }

      const updatedLoans = loans.map((l) =>
        l.id === loan.id
          ? { ...l, principal: 0, lastInterestPaymentDate: todayStr }
          : l
      );

      onSaveTransactions([...splitTxs, ...transactions]);
      onSaveLoans(updatedLoans);
      alert(`⚡ 成功一鍵全額結清 ${loan.name}！共扣款 ${currencySymbol} ${numAmount.toLocaleString()}（已拆分 ${splitTxs.length} 筆帳本流水：本金/利息/規費），本金已歸零！`);
    } else {
      const repayTx: CashTransaction = {
        id: `tx-repay-${loan.id}-${now}`,
        accountId: targetAccountId,
        currency: loan.currency || 'TWD',
        type: 'LOAN_REPAYMENT',
        category: 'LOAN_REPAYMENT',
        amount: -numAmount,
        date: todayStr,
        relatedLoanId: loan.id,
        note: `償還質押本金: ${loan.name}`,
        createdAt: now,
      };

      const updatedLoans = loans.map((l) =>
        l.id === loan.id
          ? { ...l, principal: Math.max(0, l.principal - numAmount), lastInterestPaymentDate: todayStr }
          : l
      );

      onSaveTransactions([repayTx, ...transactions]);
      onSaveLoans(updatedLoans);
      alert(`✅ 成功償還本金 ${currencySymbol} ${numAmount.toLocaleString()}！`);
    }

    setPayLoanTarget(null);
  };

  // 7. 流水清單過濾與排序 (支援市場過濾)
  const filteredTransactions = useMemo(() => {
    const filtered = scopedTransactions.filter((tx) => {
      // 帳戶篩選
      if (selectedAccountId !== 'ALL' && tx.accountId !== selectedAccountId) {
        return false;
      }
      // 交割狀態篩選
      if (selectedSettlementFilter === 'PENDING' && tx.settlementStatus !== 'PENDING') {
        return false;
      }
      if (selectedSettlementFilter === 'SETTLED' && tx.settlementStatus === 'PENDING') {
        return false;
      }

      // 類別篩選
      const cat = tx.category || tx.type;
      if (selectedCategoryFilter === 'DEPOSIT_WITHDRAWAL') {
        if (cat !== 'DEPOSIT' && cat !== 'WITHDRAWAL') return false;
      } else if (selectedCategoryFilter === 'STOCK_SETTLEMENT') {
        if (cat !== 'STOCK_BUY' && cat !== 'STOCK_SELL') return false;
      } else if (selectedCategoryFilter === 'DIVIDEND_INCOME') {
        if (cat !== 'DIVIDEND_PAYOUT' && cat !== 'DIVIDEND' && cat !== 'CAPITAL_RETURN') return false;
      } else if (selectedCategoryFilter === 'FEES_INTEREST') {
        if (cat !== 'INTEREST_INCOME' && cat !== 'INTEREST' && cat !== 'FINANCING_FEE' && cat !== 'WIRE_FEE' && cat !== 'FEE' && cat !== 'TAX') return false;
      } else if (selectedCategoryFilter === 'TRANSFER') {
        if (cat !== 'FX_TRANSFER_IN' && cat !== 'FX_TRANSFER_OUT') return false;
      } else if (selectedCategoryFilter === 'LOAN') {
        if (cat !== 'LOAN_DISBURSEMENT' && cat !== 'LOAN_REPAYMENT') return false;
      }

      // 關鍵字搜尋
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const noteMatch = tx.note?.toLowerCase().includes(q) || false;
        const catMatch = cat.toLowerCase().includes(q);
        const amountMatch = tx.amount.toString().includes(q);
        const dateMatch = tx.date.includes(q) || (tx.settlementDate && tx.settlementDate.includes(q));
        if (!noteMatch && !catMatch && !amountMatch && !dateMatch) return false;
      }

      return true;
    });

    return sortCashTransactions(filtered, sortOrder);
  }, [scopedTransactions, selectedAccountId, selectedSettlementFilter, selectedCategoryFilter, searchQuery, sortOrder]);

  // 取得類別標籤與徽章
  const renderCategoryBadge = (tx: CashTransaction) => {
    const cat = tx.category || tx.type;
    const isTaxNote = tx.note && (tx.note.includes('預扣稅') || tx.note.includes('扣除') || tx.note.includes('利息預扣'));

    if (cat === 'TAX' || isTaxNote) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
          <Receipt size={12} /> 預扣稅費
        </span>
      );
    }

    switch (cat) {
      case 'DEPOSIT':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <ArrowDownRight size={12} /> 外部入金
          </span>
        );
      case 'WITHDRAWAL':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <ArrowUpRight size={12} /> 外部出金
          </span>
        );
      case 'STOCK_BUY':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            ⚡ 買進交割扣款
          </span>
        );
      case 'STOCK_SELL':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
            ⚡ 賣出交割入帳
          </span>
        );
      case 'DIVIDEND_PAYOUT':
      case 'DIVIDEND':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            💰 股息入帳
          </span>
        );
      case 'CAPITAL_RETURN':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
            📦 減資退款
          </span>
        );
      case 'INTEREST_INCOME':
      case 'INTEREST':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(20, 184, 166, 0.15)', color: '#2dd4bf', border: '1px solid rgba(20, 184, 166, 0.3)' }}>
            📈 活存利息
          </span>
        );
      case 'FINANCING_FEE':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
            📉 融資/借款利息
          </span>
        );
      case 'WIRE_FEE':
      case 'FEE':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(100, 116, 139, 0.2)', color: '#cbd5e1', border: '1px solid rgba(100, 116, 139, 0.3)' }}>
            🏷️ 規費/手續費
          </span>
        );
      case 'FX_TRANSFER_IN':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(6, 182, 212, 0.15)', color: '#67e8f9', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
            <ArrowLeftRight size={12} /> 換匯/調撥轉入
          </span>
        );
      case 'FX_TRANSFER_OUT':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8', border: '1px solid rgba(100, 116, 139, 0.3)' }}>
            <ArrowLeftRight size={12} /> 換匯/調撥轉出
          </span>
        );
      case 'LOAN_DISBURSEMENT':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(147, 51, 234, 0.15)', color: '#c084fc', border: '1px solid rgba(147, 51, 234, 0.3)' }}>
            🏦 借款撥款
          </span>
        );
      case 'LOAN_REPAYMENT':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
            💳 還本扣款
          </span>
        );
      default:
        return <span className="badge badge-secondary">其他</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. 快捷一鍵對齊橫幅 (Sync Hero Banner) */}
      {transactions.length === 0 && trades.length > 0 && (
        <div
          className="glass-card"
          style={{
            padding: '20px 24px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              <Zap size={24} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                尚未建立交割流水？一鍵自動生成 (支援台股 T+2 / 美股 T+1)！
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.4 }}>
                系統偵測到您在庫有 <b>{trades.length} 筆歷史股票交易</b>。點擊右側按鈕，系統將自動依買進、賣出、現金股利與真實交割週期生成精準流水！
              </p>
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleSyncWithTrades}
            style={{ padding: '10px 20px', fontSize: '0.9rem', whiteSpace: 'nowrap', fontWeight: 700 }}
          >
            <Sparkles size={16} /> 一鍵依 T+2 / T+1 產生流水
          </button>
        </div>
      )}

      {/* 2. 頂部券商級四核心資金可用性指標看板 (Four-Pillar Cash & Buying Power Dashboard) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        {/* 卡片 1: 實質可用現金 (可提領出金) */}
        <div
          className="glass-card"
          style={{
            padding: '18px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.85) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Wallet size={16} /> 實質可用現金 (可提領)
            </span>
            <span style={{ fontSize: '0.68rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              ✅ 已交割到位
            </span>
          </div>
          <div
            className="mono"
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: balancesSummary.totalSettledCashInTWD < 0 ? '#f87171' : '#10b981',
              margin: '4px 0',
            }}
          >
            {currentMarket === 'US'
              ? `$${balancesSummary.totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : `NT$ ${Math.round(balancesSummary.totalSettledCashInTWD).toLocaleString()}`}
          </div>
          <div className="mono" style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', gap: '8px' }}>
            {currentMarket === 'ALL' && (
              <>
                <span>台幣 NT$ {Math.round(balancesSummary.totalTWD).toLocaleString()}</span>
                <span style={{ color: '#475569' }}>|</span>
                <span>美金 ${balancesSummary.totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </>
            )}
            {currentMarket === 'TW' && <span>隨時可出金提領回銀行</span>}
            {currentMarket === 'US' && <span>折合台幣 NT$ {Math.round(balancesSummary.totalSettledCashInTWD).toLocaleString()}</span>}
          </div>
        </div>

        {/* 卡片 2: 在途應收款項 (待入帳) */}
        <div
          className="glass-card"
          onClick={() => setIsTimelineDrawerOpen((prev) => !prev)}
          style={{
            padding: '18px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(15, 23, 42, 0.85) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(245, 158, 11, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowDownRight size={16} /> 在途應收 (待入帳)
            </span>
            <span style={{ fontSize: '0.68rem', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.15)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              ⏳ {pendingTimelineGroup.totalInflowInTWD > 0 ? `${(pendingTimelineGroup.today.length + pendingTimelineGroup.tomorrow.length + pendingTimelineGroup.thisWeek.length + pendingTimelineGroup.future.length)} 筆在途` : '無待入帳'}
            </span>
          </div>
          <div className="mono" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fbbf24', margin: '4px 0' }}>
            {currentMarket === 'US'
              ? `+$${(balancesSummary.totalPendingReceivablesInTWD / usdToTwdRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : `+NT$ ${Math.round(balancesSummary.totalPendingReceivablesInTWD).toLocaleString()}`}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
            <span>賣出待交割 + 股息預計發放</span>
            <span style={{ color: '#fbbf24' }}>{isTimelineDrawerOpen ? '點擊收合' : '點擊展開排程 ▾'}</span>
          </div>
        </div>

        {/* 卡片 3: 在途應付款項 (待扣款) */}
        <div
          className="glass-card"
          onClick={() => setIsTimelineDrawerOpen((prev) => !prev)}
          style={{
            padding: '18px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(15, 23, 42, 0.85) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(239, 68, 68, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowUpRight size={16} /> 在途應付 (待扣款)
            </span>
            <span style={{ fontSize: '0.68rem', color: '#f87171', background: 'rgba(239, 68, 68, 0.15)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              🔒 買進交割備款
            </span>
          </div>
          <div className="mono" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f87171', margin: '4px 0' }}>
            {currentMarket === 'US'
              ? `-$${(balancesSummary.totalPendingPayablesInTWD / usdToTwdRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : `-NT$ ${Math.round(balancesSummary.totalPendingPayablesInTWD).toLocaleString()}`}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
            <span>預估交割後淨額: {currentMarket === 'US' ? `$${(balancesSummary.totalProjectedCashInTWD / usdToTwdRate).toFixed(2)}` : `NT$ ${Math.round(balancesSummary.totalProjectedCashInTWD).toLocaleString()}`}</span>
            <span style={{ color: '#f87171' }}>{isTimelineDrawerOpen ? '▾' : '▸'}</span>
          </div>
        </div>

        {/* 卡片 4: 交易可用購買力 (Buying Power) */}
        <div
          className="glass-card"
          style={{
            padding: '18px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(15, 23, 42, 0.85) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            boxShadow: '0 4px 16px rgba(59, 130, 246, 0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={16} /> 交易購買力 (Buying Power)
            </span>
            <span style={{ fontSize: '0.68rem', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.2)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
              ⚡ 賣出立即釋放
            </span>
          </div>
          <div className="mono" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#3b82f6', margin: '4px 0' }}>
            {currentMarket === 'US'
              ? `$${(totalBuyingPowerInTWD / usdToTwdRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : `NT$ ${Math.round(totalBuyingPowerInTWD).toLocaleString()}`}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
            <span>可用現金 + 賣出在途 - 買進在途</span>
            <span style={{ color: '#60a5fa' }}>即時可下單額度</span>
          </div>
        </div>
      </div>

      {/* 2.1 全域淨資產 (NAV) 與槓桿負債風控列 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
        {/* 全域淨資產 */}
        <div className="glass-card" style={{ padding: '12px 18px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(51, 65, 85, 0.6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Landmark size={18} color="#60a5fa" />
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>全域淨資產 (NAV = 股市+現金-借款)</div>
              <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
                {currentMarket === 'US' ? `$${(leverageMetrics.netAssetValueInTWD / usdToTwdRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `NT$ ${Math.round(leverageMetrics.netAssetValueInTWD).toLocaleString()}`}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.72rem', color: '#94a3b8' }}>
            <div>總市值: NT$ {Math.round(totalStockMarketValueInTWD).toLocaleString()}</div>
            <div>借款負債: NT$ {Math.round(leverageMetrics.totalDebtInTWD).toLocaleString()}</div>
          </div>
        </div>

        {/* 槓桿負債比 LTV */}
        <div className="glass-card" style={{ padding: '12px 18px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(51, 65, 85, 0.6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Percent size={18} color="#fbbf24" />
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>整體槓桿負債比 (LTV)</div>
              <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 700, color: leverageMetrics.debtRatioPercent > 50 ? '#ef4444' : leverageMetrics.debtRatioPercent > 30 ? '#f59e0b' : '#10b981' }}>
                {leverageMetrics.debtRatioPercent.toFixed(2)}%
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: leverageMetrics.debtRatioPercent > 50 ? 'rgba(239, 68, 68, 0.2)' : leverageMetrics.debtRatioPercent > 30 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)', color: leverageMetrics.debtRatioPercent > 50 ? '#ef4444' : leverageMetrics.debtRatioPercent > 30 ? '#f59e0b' : '#10b981' }}>
              {leverageMetrics.debtRatioPercent <= 30 ? '🟢 槓桿安全' : leverageMetrics.debtRatioPercent <= 50 ? '🟡 槓桿適中' : '🔴 槓桿偏高'}
            </span>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>預估年息 ~NT$ {Math.round(leverageMetrics.estimatedAnnualInterestInTWD).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 2.2 在途交割時序排程看板 (Settlement Timeline Schedule Drawer - 支援一鍵核銷) */}
      {isTimelineDrawerOpen && (
        <div className="glass-card" style={{ padding: '18px 20px', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.3)', background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.9) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#fbbf24" />
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                ⏳ 在途資金交割時序排程 (Settlement Timeline)
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.78rem' }}>
              <span style={{ color: '#34d399' }}>預估入帳: +NT$ {Math.round(pendingTimelineGroup.totalInflowInTWD).toLocaleString()}</span>
              <span style={{ color: '#475569' }}>|</span>
              <span style={{ color: '#f87171' }}>預估扣款: -NT$ {Math.round(pendingTimelineGroup.totalOutflowInTWD).toLocaleString()}</span>
              <span style={{ color: '#475569' }}>|</span>
              <span style={{ color: '#fbbf24', fontWeight: 700 }}>淨現金流: {pendingTimelineGroup.netInflowInTWD >= 0 ? '+' : ''}NT$ {Math.round(pendingTimelineGroup.netInflowInTWD).toLocaleString()}</span>
            </div>
          </div>

          {/* 時序區塊清單 */}
          {pendingTimelineGroup.today.length === 0 &&
          pendingTimelineGroup.tomorrow.length === 0 &&
          pendingTimelineGroup.thisWeek.length === 0 &&
          pendingTimelineGroup.future.length === 0 &&
          pendingTimelineGroup.overdue.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              ✨ 目前無任何在途待交割款項，所有資金皆已實質交割到位！
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { title: '🔴 已逾期待核銷 (Overdue)', items: pendingTimelineGroup.overdue, bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', color: '#f87171' },
                { title: '⚡ 今日到期交割 (Today)', items: pendingTimelineGroup.today, bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.35)', color: '#fbbf24' },
                { title: '📅 明日預計交割 (Tomorrow)', items: pendingTimelineGroup.tomorrow, bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa' },
                { title: '🗓️ 本週排程 (This Week)', items: pendingTimelineGroup.thisWeek, bg: 'rgba(30, 41, 59, 0.5)', border: 'rgba(51, 65, 85, 0.5)', color: '#cbd5e1' },
                { title: '🔮 未來排程 (Future)', items: pendingTimelineGroup.future, bg: 'rgba(15, 23, 42, 0.6)', border: 'rgba(51, 65, 85, 0.4)', color: '#94a3b8' },
              ]
                .filter((group) => group.items.length > 0)
                .map((group) => (
                  <div key={group.title} style={{ background: group.bg, border: `1px solid ${group.border}`, borderRadius: '10px', padding: '10px 14px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: group.color, marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{group.title} ({group.items.length} 筆)</span>
                      <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>
                        {(() => {
                          const groupNet = group.items.reduce((sum, it) => sum + (it.currency === 'USD' ? it.amount * usdToTwdRate : it.amount), 0);
                          return (
                            <span>
                              小計: <span style={{ color: groupNet >= 0 ? '#34d399' : '#f87171' }}>{groupNet >= 0 ? '+' : '-'}NT$ {Math.abs(Math.round(groupNet)).toLocaleString()}</span>
                            </span>
                          );
                        })()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {group.items.map((item) => (
                        <PendingSettlementCard
                          key={item.transactionId}
                          item={item}
                          onToggleStatus={handleToggleSettlementStatus}
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* 3. 券商交割戶資金狀態網格 (Account Cards Grid) */}
      <div className="glass-card" style={{ padding: '20px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={18} color="#10b981" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
              🏛️ 各券商交割戶資金狀態 ({scopedAccounts.length} 帳戶)
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingTx(null);
                setIsTxModalOpen(true);
              }}
            >
              <Plus size={14} /> 記錄收支 / 換匯
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleSyncWithTrades}
              title="自動比對股票交易與股息紀錄，依台股(T+2)/美股(T+1)補齊交割款流水"
            >
              <RefreshCw size={14} color="#60a5fa" />
              自動對齊交割款 (T+2/T+1)
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {scopedAccounts.map((acc) => {
            const summary = balancesSummary.byAccount[acc.id] || {
              balance: 0,
              totalDeposits: 0,
              totalWithdrawals: 0,
              totalStockBuys: 0,
              totalStockSells: 0,
              totalDividends: 0,
            };
            const isTW = acc.market === 'TW';

            return (
              <div
                key={acc.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(51, 65, 85, 0.6)',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: acc.color || (isTW ? '#10b981' : '#3b82f6'),
                        }}
                      />
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>{acc.name}</span>
                    </div>
                    <span className={isTW ? 'badge badge-tw' : 'badge badge-us'}>
                      {isTW ? '台幣 (TWD) · T+2 交割' : '美金 (USD) · T+1 交割'}
                    </span>
                  </div>

                  {/* 帳戶結餘 */}
                  <div style={{ margin: '8px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>可用現金餘額 (已交割)</span>
                      {Boolean(summary.pendingSettlementAmount) && (
                        <span style={{ fontSize: '0.68rem', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '1px 6px', borderRadius: '4px' }}>
                          在途待交割: {summary.pendingSettlementAmount > 0 ? '+' : ''}{isTW ? `NT$ ${Math.round(summary.pendingSettlementAmount).toLocaleString()}` : `$${summary.pendingSettlementAmount.toFixed(2)}`}
                        </span>
                      )}
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: '1.45rem',
                        fontWeight: 800,
                        color: summary.balance < 0 ? '#ef4444' : '#ffffff',
                      }}
                    >
                      {isTW
                        ? `NT$ ${Math.round(summary.balance).toLocaleString()}`
                        : `$${summary.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </div>
                    {Boolean(summary.pendingSettlementAmount) && (
                      <div className="mono" style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                        預估交割後餘額: <span style={{ color: summary.projectedBalance < 0 ? '#f87171' : '#e2e8f0', fontWeight: 600 }}>{isTW ? `NT$ ${Math.round(summary.projectedBalance).toLocaleString()}` : `$${summary.projectedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
                      </div>
                    )}
                  </div>

                  {/* 明細指標 */}
                  <div
                    className="mono"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '6px',
                      fontSize: '0.72rem',
                      color: '#94a3b8',
                      paddingTop: '8px',
                      borderTop: '1px solid rgba(51, 65, 85, 0.5)',
                    }}
                  >
                    <div>累計入金: <span style={{ color: '#e2e8f0' }}>{isTW ? `NT$ ${Math.round(summary.totalDeposits).toLocaleString()}` : `$${summary.totalDeposits.toLocaleString()}`}</span></div>
                    <div>累計出金: <span style={{ color: '#e2e8f0' }}>{isTW ? `NT$ ${Math.round(summary.totalWithdrawals).toLocaleString()}` : `$${summary.totalWithdrawals.toLocaleString()}`}</span></div>
                    <div>買進扣款: <span style={{ color: '#f87171' }}>-{isTW ? `NT$ ${Math.round(summary.totalStockBuys).toLocaleString()}` : `$${summary.totalStockBuys.toLocaleString()}`}</span></div>
                    <div>賣出回款: <span style={{ color: '#34d399' }}>+{isTW ? `NT$ ${Math.round(summary.totalStockSells).toLocaleString()}` : `$${summary.totalStockSells.toLocaleString()}`}</span></div>
                  </div>
                </div>

                {/* 快捷操作列 */}
                <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(51, 65, 85, 0.4)' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleOpenReconcile(acc)}
                    style={{ flex: 1.2, justifyContent: 'center', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)' }}
                    title="輸入目前交割銀行帳戶的真實可用現金，系統將自動回推並補登初始入金！"
                  >
                    ✏️ 校正/輸入真實現金
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setEditingTx(null);
                      setIsTxModalOpen(true);
                    }}
                    style={{ flex: 0.8, justifyContent: 'center' }}
                  >
                    + 記帳
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setEditingTx(null);
                      setIsTxModalOpen(true);
                    }}
                    style={{ flex: 0.8, justifyContent: 'center', color: '#67e8f9' }}
                  >
                    <ArrowLeftRight size={12} /> 換匯
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. 股票質押借款與風控看板 (Pledge & Loans Panel - 照片一三大規費強化) */}
      <div className="glass-card" style={{ padding: '20px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} color="#a855f7" />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                🛡️ {currentMarket === 'US' ? '美股借貸項目' : currentMarket === 'TW' ? '台股股票質押與借款' : '全域股票質押借款與槓桿風控'} ({scopedLoans.length} 筆借貸)
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                動態試算擔保維持率、截至今日應計利息、本利和應還款金額與設質規費
              </p>
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)' }}
            onClick={() => {
              setEditingLoan(null);
              setIsLoanModalOpen(true);
            }}
          >
            <Plus size={14} /> 新增借貸 / 質押
          </button>
        </div>

        {scopedLoans.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '12px', border: '1px dashed rgba(51, 65, 85, 0.6)' }}>
            <ShieldCheck size={32} color="#64748b" style={{ margin: '0 auto 8px auto' }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#cbd5e1' }}>
              {currentMarket === 'US' ? '美股市場目前無任何借貸或融資負債' : '目前尚無借貸或股票質押紀錄'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              若您有使用股票質押、券商融資或信用貸款，可點擊上方按鈕建立項目以監控即時維持率。
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
            {scopedLoans.map((loan) => {
              const ratioResult = calculatePledgeMaintenanceRatio(loan, quotes);
              const interestMetrics = calculateLoanInterestAndPayoff(loan);
              const isPledge = loan.loanType === 'PLEDGE';
              const isTW = loan.currency === 'TWD' || !loan.currency;
              const totalPledgeFee = interestMetrics.pledgeFees;

              return (
                <div
                  key={loan.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(168, 85, 247, 0.35)',
                    borderRadius: '14px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {/* Title & Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>{loan.name}</span>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>
                          {loan.loanType === 'PLEDGE' ? '股票質押' : loan.loanType === 'MARGIN' ? '券商融資' : '信用貸款'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                        年利率: <b style={{ color: '#f8fafc' }}>{loan.annualInterestRate || (loan.interestRate ? loan.interestRate * 100 : 0)}%</b> · 起日: {loan.startDate || loan.date || '-'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setEditingLoan(loan);
                          setIsLoanModalOpen(true);
                        }}
                        style={{ padding: '4px 8px' }}
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDeleteLoan(loan.id)}
                        style={{ padding: '4px 8px', color: '#f87171' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* 1. 未還借款本金 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', paddingTop: '6px', borderTop: '1px solid rgba(51, 65, 85, 0.4)' }}>
                    <span style={{ color: '#94a3b8' }}>未還借款本金:</span>
                    <span className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#c084fc' }}>
                      {isTW ? `NT$ ${Math.round(loan.principal).toLocaleString()}` : `$${loan.principal.toLocaleString()}`}
                    </span>
                  </div>

                  {/* 2. 當前應返還利息、設質三大規費 與 應還款金額 (整併於黑色卡片內) */}
                  <div
                    style={{
                      background: 'rgba(3, 7, 18, 0.55)',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid rgba(168, 85, 247, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {/* 利息 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                      <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        💰 當前應返還利息 (計息 {interestMetrics.daysElapsed} 天):
                      </span>
                      <span className="mono" style={{ fontWeight: 700, color: '#fbbf24' }}>
                        {isTW ? `NT$ ${interestMetrics.accruedInterest.toLocaleString()}` : `$${interestMetrics.accruedInterest.toLocaleString()}`}
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: '4px' }}>
                          (月息 ~{isTW ? `NT$${interestMetrics.monthlyEstimatedInterest.toLocaleString()}` : `$${interestMetrics.monthlyEstimatedInterest}`})
                        </span>
                      </span>
                    </div>

                    {/* 設質三大規費 */}
                    {isPledge && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', paddingTop: '4px', borderTop: '1px dashed rgba(51, 65, 85, 0.4)' }}>
                        <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Receipt size={12} /> 設質三大規費:
                        </span>
                        <span className="mono" style={{ color: '#fcd34d', fontWeight: 600 }}>
                          NT$ {totalPledgeFee.toLocaleString()}
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginLeft: '4px' }}>
                            (撥券 ${loan.transferFee ?? 0} · 設質 ${loan.pledgeRegistryFee ?? 0} · 手續費 ${loan.handlingFee ?? 0})
                          </span>
                        </span>
                      </div>
                    )}

                    {/* 應還款總金額 (本利和 + 設質規費) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', paddingTop: '6px', borderTop: '1px solid rgba(168, 85, 247, 0.35)' }}>
                      <span style={{ color: '#f8fafc', fontWeight: 700 }}>
                        💳 當前應還款總金額 (本利和+規費):
                      </span>
                      <span className="mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>
                        {isTW ? `NT$ ${interestMetrics.totalPayoffAmount.toLocaleString()}` : `$${interestMetrics.totalPayoffAmount.toLocaleString()}`}
                      </span>
                    </div>
                  </div>

                  {/* 質押專屬：維持率與擔保品 */}
                  {isPledge && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <span style={{ color: '#94a3b8' }}>擔保品總市值:</span>
                        <span className="mono" style={{ color: '#e2e8f0', fontWeight: 600 }}>
                          NT$ {Math.round(ratioResult.collateralMarketValue).toLocaleString()}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                        <span style={{ color: '#94a3b8' }}>擔保維持率:</span>
                        <span
                          className="mono"
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            background: ratioResult.status === 'DANGER' ? 'rgba(239, 68, 68, 0.2)' : ratioResult.status === 'WARNING' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                            color: ratioResult.status === 'DANGER' ? '#ef4444' : ratioResult.status === 'WARNING' ? '#f59e0b' : '#10b981',
                            border: `1px solid ${ratioResult.status === 'DANGER' ? 'rgba(239, 68, 68, 0.4)' : ratioResult.status === 'WARNING' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                          }}
                        >
                          {ratioResult.maintenanceRatio.toFixed(1)}% (
                          {ratioResult.status === 'DANGER' ? '🔴 追繳斷頭' : ratioResult.status === 'WARNING' ? '🟡 警戒關注' : '🟢 安全'}
                          )
                        </span>
                      </div>

                      <div style={{ width: '100%', height: '6px', background: 'rgba(30, 41, 59, 0.8)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            borderRadius: '3px',
                            width: `${Math.min(100, (ratioResult.maintenanceRatio / 200) * 100)}%`,
                            background: ratioResult.status === 'DANGER' ? '#ef4444' : ratioResult.status === 'WARNING' ? '#f59e0b' : '#10b981',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>

                      {loan.pledgedCollateral && loan.pledgedCollateral.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                          {loan.pledgedCollateral.map((c, i) => (
                            <span key={i} className="mono" style={{ fontSize: '0.68rem', padding: '2px 6px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(51, 65, 85, 0.6)', borderRadius: '4px', color: '#cbd5e1' }}>
                              {c.symbol} × {c.shares.toLocaleString()} 股
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 快捷操作：繳交利息 / 本金還款 / 一鍵結清 */}
                  <div style={{ display: 'flex', gap: '6px', paddingTop: '8px', borderTop: '1px solid rgba(51, 65, 85, 0.4)' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenPayLoan(loan, 'PAY_INTEREST')}
                      style={{ flex: 1, justifyContent: 'center', color: '#fbbf24', fontSize: '0.75rem', padding: '4px 6px' }}
                    >
                      💰 繳息
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenPayLoan(loan, 'REPAY_PRINCIPAL')}
                      style={{ flex: 1, justifyContent: 'center', color: '#38bdf8', fontSize: '0.75rem', padding: '4px 6px' }}
                    >
                      💳 還本
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleOpenPayLoan(loan, 'FULL_PAYOFF')}
                      style={{ flex: 1.2, justifyContent: 'center', background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)', color: '#ffffff', fontSize: '0.75rem', fontWeight: 700, padding: '4px 6px', border: 'none' }}
                    >
                      ⚡ 一鍵結清
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. 全量現金流水帳本表格 (Transactions Ledger Table - 依市場過濾) */}
      <div className="glass-card" style={{ padding: '20px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Coins size={18} color="#34d399" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
              📜 {currentMarket === 'US' ? '美股現金流水帳本' : currentMarket === 'TW' ? '台股現金流水帳本' : '全量現金流水帳本'} ({filteredTransactions.length} 筆)
            </h3>
          </div>

          {/* 三態快速切換膠囊按鈕組 */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(30, 41, 59, 0.6)', padding: '3px', borderRadius: '10px' }}>
            <button
              type="button"
              className={`btn btn-sm ${selectedSettlementFilter === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSelectedSettlementFilter('ALL')}
              style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '7px' }}
            >
              全部 ({scopedTransactions.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${selectedSettlementFilter === 'SETTLED' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSelectedSettlementFilter('SETTLED')}
              style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '7px', color: selectedSettlementFilter === 'SETTLED' ? '#fff' : '#34d399' }}
            >
              ✅ 已交割 ({scopedTransactions.filter((t) => t.settlementStatus !== 'PENDING').length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${selectedSettlementFilter === 'PENDING' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSelectedSettlementFilter('PENDING')}
              style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '7px', color: selectedSettlementFilter === 'PENDING' ? '#fff' : '#fbbf24' }}
            >
              ⏳ 在途待交割 ({scopedTransactions.filter((t) => t.settlementStatus === 'PENDING' || (Boolean(t.settlementDate) && t.settlementDate! > new Date().toISOString().split('T')[0])).length})
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* 帳戶過濾 */}
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px', fontSize: '0.78rem', color: '#f8fafc', outline: 'none' }}
            >
              <option value="ALL">全部{currentMarket === 'US' ? '美股' : currentMarket === 'TW' ? '台股' : ''}券商帳戶</option>
              {scopedAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>

            {/* 類別過濾 */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px', fontSize: '0.78rem', color: '#f8fafc', outline: 'none' }}
            >
              <option value="ALL">全部金流類別</option>
              <option value="DEPOSIT_WITHDRAWAL">外部出入金</option>
              <option value="STOCK_SETTLEMENT">股票交割款</option>
              <option value="DIVIDEND_INCOME">股息與退稅</option>
              <option value="FEES_INTEREST">利息與手續費</option>
              <option value="TRANSFER">跨帳戶換匯調撥</option>
              <option value="LOAN">借貸與還款</option>
            </select>

            {/* 關鍵字搜尋 */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} color="#64748b" style={{ position: 'absolute', left: '8px' }} />
              <input
                type="text"
                placeholder="搜尋日期、備註..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px 6px 28px', fontSize: '0.78rem', color: '#f8fafc', outline: 'none', width: '150px' }}
              />
            </div>

            {/* 排序 */}
            <button
              className="btn btn-secondary btn-sm mono"
              onClick={() => setSortOrder((prev) => (prev === 'DESC' ? 'ASC' : 'DESC'))}
            >
              {sortOrder === 'DESC' ? '新 ➔ 舊' : '舊 ➔ 新'}
            </button>
          </div>
        </div>

        {/* 表格 */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(15, 23, 42, 0.4)', color: '#94a3b8' }}>
                <th style={{ padding: '10px 14px' }}>成交日 ➔ 預計交割日</th>
                <th style={{ padding: '10px 14px' }}>券商帳戶</th>
                <th style={{ padding: '10px 14px' }}>金流類別</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>變動金額</th>
                <th style={{ padding: '10px 14px' }}>備註說明 / 關聯</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>操作</th>
              </tr>
            </thead>
            <tbody className="mono">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    無符合條件之現金流水紀錄
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const acc = accounts.find((a) => a.id === tx.accountId);
                  const isPositive = tx.amount > 0;
                  const isTW = tx.currency === 'TWD';
                  const isPending = tx.settlementStatus === 'PENDING';
                  const hasSettlementDate = Boolean(tx.settlementDate);

                  return (
                    <tr key={tx.id} style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.3)', transition: 'background 0.2s', background: isPending ? 'rgba(245, 158, 11, 0.04)' : undefined }}>
                      <td style={{ padding: '10px 14px', color: '#cbd5e1' }}>
                        <div>
                          <span>{tx.tradeDate || tx.date}</span>
                          {hasSettlementDate && (
                            <div style={{ fontSize: '0.72rem', color: isPending ? '#fbbf24' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <span>➔ 交割: <b>{tx.settlementDate}</b></span>
                              <button
                                type="button"
                                onClick={() => handleToggleSettlementStatus(tx.id)}
                                style={{
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.65rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  background: isPending ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                                  color: isPending ? '#fbbf24' : '#34d399',
                                  border: `1px solid ${isPending ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.3)'}`,
                                }}
                                title="點擊切換交割狀態 (待交割 ↔ 已交割)"
                              >
                                {isPending ? '⏳ 待交割' : '✅ 已交割'}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#f8fafc', fontFamily: 'sans-serif' }}>
                        {acc ? acc.name : tx.accountId}
                      </td>
                      <td style={{ padding: '10px 14px' }}>{renderCategoryBadge(tx)}</td>
                      <td
                        style={{
                          padding: '10px 14px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: isPositive ? '#34d399' : '#f87171',
                        }}
                      >
                        {isPositive ? '+' : '-'}
                        {isTW
                          ? `NT$ ${Math.abs(Math.round(tx.amount)).toLocaleString()}`
                          : `$${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'sans-serif', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.note || '-'}
                        {tx.fxRate && <span style={{ marginLeft: '6px', color: '#64748b' }} className="mono">(匯率: {tx.fxRate})</span>}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 6px' }}
                            onClick={() => {
                              setEditingTx(tx);
                              setIsTxModalOpen(true);
                            }}
                            title="編輯流水明細與自訂交割日"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 6px', color: '#f87171' }}
                            onClick={() => handleDeleteTransaction(tx.id)}
                            title="刪除流水紀錄"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 餘額校正彈窗 (Reconcile Balance Modal) */}
      {reconcileTarget && (
        <div className="modal-overlay" onClick={() => setReconcileTarget(null)}>
          <div
            className="glass-card modal-content"
            style={{ maxWidth: '480px', padding: '24px', borderRadius: '18px', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(59, 130, 246, 0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(51, 65, 85, 0.5)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa' }}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                    交割戶真實現金餘額校正
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                    {reconcileTarget.accountName} ({reconcileTarget.currency})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReconcileTarget(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmReconcile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(51, 65, 85, 0.6)' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>目前系統計算結餘（扣除歷史買賣後）</div>
                <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: reconcileTarget.currentBalance < 0 ? '#f87171' : '#34d399' }}>
                  {reconcileTarget.currency === 'USD' ? '$' : 'NT$'} {reconcileTarget.currentBalance.toLocaleString()}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#60a5fa', marginBottom: '6px' }}>
                  請輸入您交割銀行目前帳戶內的「真實可用現金 ({reconcileTarget.currency})」:
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={reconcileTargetAmount}
                  onChange={(e) => setReconcileTargetAmount(e.target.value)}
                  className="mono"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-input)', border: '1px solid #3b82f6', color: '#ffffff', fontSize: '1.1rem', fontWeight: 700, outline: 'none' }}
                />
              </div>

              {/* 預估自動補登金額試算 */}
              {(() => {
                const targetVal = parseFloat(reconcileTargetAmount);
                if (isNaN(targetVal)) return null;
                const diff = targetVal - reconcileTarget.currentBalance;
                return (
                  <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.78rem', color: '#34d399' }}>
                    ✨ 系統將自動為您補登一筆 <b>初始外部入金 (Deposit)</b>：
                    <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10b981', marginTop: '2px' }}>
                      +{reconcileTarget.currency === 'USD' ? '$' : 'NT$'} {Math.abs(Math.round(diff)).toLocaleString()}
                    </div>
                  </div>
                );
              })()}

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                  入金起算基準日 (建議為最早交易日)
                </label>
                <input
                  type="date"
                  required
                  value={reconcileDate}
                  onChange={(e) => setReconcileDate(e.target.value)}
                  className="mono"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setReconcileTarget(null)}>
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
                >
                  確認校正
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 借貸快速繳息 / 還款 / 一鍵結清彈窗 */}
      {payLoanTarget && (() => {
        const isFullPayoff = payLoanTarget.actionType === 'FULL_PAYOFF';
        const payoffMetrics = calculateLoanInterestAndPayoff(payLoanTarget.loan);
        const currSym = payLoanTarget.loan.currency === 'USD' ? '$' : 'NT$';

        return (
          <div className="modal-overlay" onClick={() => setPayLoanTarget(null)}>
            <div
              className="glass-card modal-content"
              style={{ maxWidth: '480px', padding: '24px', borderRadius: '18px', background: 'rgba(15, 23, 42, 0.95)', border: `1px solid ${isFullPayoff ? 'rgba(56, 189, 248, 0.5)' : 'rgba(168, 85, 247, 0.5)'}` }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(51, 65, 85, 0.5)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ padding: '8px', borderRadius: '10px', background: isFullPayoff ? 'rgba(56, 189, 248, 0.15)' : 'rgba(168, 85, 247, 0.15)', border: `1px solid ${isFullPayoff ? 'rgba(56, 189, 248, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`, color: isFullPayoff ? '#38bdf8' : '#c084fc' }}>
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                      {isFullPayoff ? '⚡ 一鍵全額結清借款' : payLoanTarget.actionType === 'PAY_INTEREST' ? '💰 繳交借貸利息' : '💳 償還借貸本金'}
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                      {payLoanTarget.loan.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPayLoanTarget(null)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleConfirmPayLoan} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                    扣款券商/銀行帳戶
                  </label>
                  <select
                    value={payAccountId}
                    onChange={(e) => setPayAccountId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: '#f8fafc', fontSize: '0.85rem', outline: 'none' }}
                  >
                    {scopedAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.market === 'US' ? 'USD' : 'TWD'})
                      </option>
                    ))}
                  </select>
                </div>

                {isFullPayoff && (
                  <div
                    style={{
                      background: 'rgba(3, 7, 18, 0.6)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      fontSize: '0.78rem',
                    }}
                  >
                    <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '2px' }}>📊 結清應還明細拆分：</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                      <span>1. 償還本金 (LOAN_REPAYMENT):</span>
                      <span className="mono" style={{ fontWeight: 600 }}>{currSym} {payLoanTarget.loan.principal.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fbbf24' }}>
                      <span>2. 應計利息 (FINANCING_FEE · {payoffMetrics.daysElapsed}天):</span>
                      <span className="mono" style={{ fontWeight: 600 }}>{currSym} {payoffMetrics.accruedInterest.toLocaleString()}</span>
                    </div>
                    {payoffMetrics.pledgeFees > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fcd34d' }}>
                        <span>3. 設質三大規費 (HANDLING_FEE):</span>
                        <span className="mono" style={{ fontWeight: 600 }}>{currSym} {payoffMetrics.pledgeFees.toLocaleString()}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8', fontWeight: 800, fontSize: '0.85rem', paddingTop: '6px', borderTop: '1px dashed rgba(56, 189, 248, 0.4)', marginTop: '2px' }}>
                      <span>應還款總金額 (本利和+規費):</span>
                      <span className="mono">{currSym} {payoffMetrics.totalPayoffAmount.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: isFullPayoff ? '#38bdf8' : '#c084fc', marginBottom: '4px' }}>
                    {isFullPayoff ? '結清扣款總金額' : payLoanTarget.actionType === 'PAY_INTEREST' ? '繳交利息金額' : '償還本金金額'} ({payLoanTarget.loan.currency || 'TWD'}):
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={payAmountInput}
                    onChange={(e) => setPayAmountInput(e.target.value)}
                    className="mono"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-input)', border: `1px solid ${isFullPayoff ? '#38bdf8' : '#a855f7'}`, color: '#ffffff', fontSize: '1.1rem', fontWeight: 700, outline: 'none' }}
                  />
                  {isFullPayoff && (
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                      💡 確認後系統將自動於現金帳本拆分產生各項獨立流水，並將借款本金歸零。
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setPayLoanTarget(null)}>
                    取消
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ background: isFullPayoff ? 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)' : 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', boxShadow: isFullPayoff ? '0 4px 12px rgba(14, 165, 233, 0.3)' : '0 4px 12px rgba(168, 85, 247, 0.3)', border: 'none' }}
                  >
                    {isFullPayoff ? '確認一鍵結清' : '確認扣款'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* 記帳與調撥彈窗 */}
      <CashTransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTx(null);
        }}
        accounts={scopedAccounts}
        initialTransaction={editingTx}
        onSaveTransaction={handleSaveTransaction}
        onSaveTransferPair={handleSaveTransferPair}
        usdToTwdRate={usdToTwdRate}
      />

      {/* 借貸與質押彈窗 */}
      <LoanModal
        isOpen={isLoanModalOpen}
        onClose={() => {
          setIsLoanModalOpen(false);
          setEditingLoan(null);
        }}
        accounts={scopedAccounts}
        holdings={scopedHoldings}
        initialLoan={editingLoan}
        onSaveLoan={handleSaveLoan}
      />
    </div>
  );
};
