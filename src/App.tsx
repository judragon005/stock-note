import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  TradeRecord,
  MarketType,
  TradeType,
  ColorThemeMode,
  AccountingView,
  ApiKeysConfig,
  PositionFilter,
  HistoricalDailyPriceMap,
  HistoricalFxRateMap,
  CashTransaction,
  LoanRecord,
} from './types/stock';
import { AccountingMethod } from './types/lot';
import { calculateHoldingsAndSummary, repairLedgerTaxAndFee } from './engine/calculator';
import { calculateHistoricalNavSeries } from './engine/historicalNav';
import { fetchSymbolHistoricalPrices, fetchHistoricalFxRates } from './engine/historicalPriceFetcher';
import {
  loadTradesFromStorage,
  saveTradesToStorage,
  loadExchangeRate,
  saveExchangeRate,
  loadCustomPricesFromStorage,
  saveCustomPricesToStorage,
  loadAccountingViewFromStorage,
  saveAccountingViewToStorage,
  exportTradesToJSON,
  exportTradesToCSV,
  loadBrokerAccountsFromStorage,
  saveBrokerAccountsToStorage,
  loadApiKeysConfigFromStorage,
  saveApiKeysConfigToStorage,
  loadHistoricalPricesFromStorage,
  saveHistoricalPricesToStorage,
  loadHistoricalFxFromStorage,
  saveHistoricalFxToStorage,
  loadCashTransactionsFromStorage,
  saveCashTransactionsToStorage,
  loadLoanRecordsFromStorage,
  saveLoanRecordsToStorage,
} from './utils/storage';

import { usePriceAutoRefresh } from './hooks/usePriceAutoRefresh';

import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { AllocationChart } from './components/AllocationChart';
import { PortfolioGrowthChart } from './components/PortfolioGrowthChart';
import { HoldingsTable } from './components/HoldingsTable';
import { TradeHistoryTable } from './components/TradeHistoryTable';
import { CashLedgerWorkspace } from './components/CashLedgerWorkspace';
import { DividendLogView } from './components/DividendLogView';
import { TradeModal } from './components/TradeModal';
import { EnhancedImportModal } from './components/EnhancedImportModal';
import { ImportDeduplicationMode } from './engine/tradeDeduplicator';
import { CorporateActionScannerModal } from './components/CorporateActionScannerModal';
import { BrokerAccountsModal } from './components/BrokerAccountsModal';
import { FrictionCenterModal } from './components/FrictionCenterModal';
import { XirrDetailModal } from './components/XirrDetailModal';
import { MarginStressModal } from './components/MarginStressModal';
import { WorkspaceTabs, WorkspaceTabKey } from './components/WorkspaceTabs';
import { SettingsWorkspace } from './components/SettingsWorkspace';
import { syncTradesWithCashTransactions, calculateAccountBalances, aggregateInterestIncomeDetails } from './engine/cashLedgerEngine';
import { calculatePortfolioXirr, calculateSecurityXirr, XirrResult, CashFlowEvent } from './engine/xirrCalculator';
import { calculatePortfolioExposure } from './engine/riskExposureEngine';
import { calculateReceivableDividends } from './engine/receivableDividendEngine';
import { buildTaxComplianceStatus } from './engine/taxComplianceEngine';
import { CorporateActionSessionCache, scanCorporateActions } from './engine/corporateActionScanner';
import { initializeStorageAsync } from './utils/storage';
import { createSystemSnapshot } from './utils/db';

export const App: React.FC = () => {
  const [isStorageInitialized, setIsStorageInitialized] = useState(false);
  const [trades, setTrades] = useState<TradeRecord[]>(() => loadTradesFromStorage());
  const [accounts, setAccounts] = useState(() => loadBrokerAccountsFromStorage());
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [apiKeys, setApiKeys] = useState<ApiKeysConfig>(() => loadApiKeysConfigFromStorage());
  const [usdToTwdRate, setUsdToTwdRate] = useState<number>(() => loadExchangeRate());
  const [currentMarket, setCurrentMarket] = useState<'ALL' | MarketType>('ALL');
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>(() => loadCustomPricesFromStorage());
  const [accountingView, setAccountingView] = useState<AccountingView>(() => loadAccountingViewFromStorage());
  const [historicalPrices, setHistoricalPrices] = useState<HistoricalDailyPriceMap>(() => loadHistoricalPricesFromStorage());
  const [historicalFx, setHistoricalFx] = useState<HistoricalFxRateMap>(() => loadHistoricalFxFromStorage());
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(() => {
    const storedCash = loadCashTransactionsFromStorage();
    const storedTrades = loadTradesFromStorage();
    return syncTradesWithCashTransactions(storedTrades, storedCash);
  });
  const [loanRecords, setLoanRecords] = useState<LoanRecord[]>(() => loadLoanRecordsFromStorage());
  const [isHistoricalSyncing, setIsHistoricalSyncing] = useState(false);
  const [historicalSyncProgress, setHistoricalSyncProgress] = useState('');
  const [activeTab, setActiveTab] = useState<WorkspaceTabKey>(() => {
    return (localStorage.getItem('stock_tracker_active_tab') as WorkspaceTabKey) || 'portfolio';
  });
  const [colorTheme, setColorTheme] = useState<ColorThemeMode>(() => {
    return (localStorage.getItem('stock_tracker_color_theme') as ColorThemeMode) || 'taiwan';
  });
  const [accountingMethod, setAccountingMethod] = useState<AccountingMethod>(() => {
    return (localStorage.getItem('stock_tracker_accounting_method') as AccountingMethod) || 'MOVING_AVERAGE';
  });

  useEffect(() => {
    localStorage.setItem('stock_tracker_accounting_method', accountingMethod);
  }, [accountingMethod]);

  // 非同步初始化 IndexedDB 與狀態同步
  const loadAllFromDB = useCallback(async () => {
    try {
      const data = await initializeStorageAsync();
      setTrades(data.trades);
      setAccounts(data.brokerAccounts);
      setCashTransactions(syncTradesWithCashTransactions(data.trades, data.cashTransactions));
      setLoanRecords(data.loanRecords);
      setApiKeys(data.apiKeys);
      setAccountingView(data.accountingView);
      if (data.historicalPrices && Object.keys(data.historicalPrices).length > 0) {
        setHistoricalPrices(data.historicalPrices);
      }
      if (data.historicalFx && Object.keys(data.historicalFx).length > 0) {
        setHistoricalFx(data.historicalFx);
      }
    } finally {
      setIsStorageInitialized(true);
    }
  }, []);

  useEffect(() => {
    loadAllFromDB();
  }, [loadAllFromDB]);

  // 監聽並持久化 activeTab
  useEffect(() => {
    localStorage.setItem('stock_tracker_active_tab', activeTab);
  }, [activeTab]);

  // 監聽並持久化 historicalPrices 與 fx
  useEffect(() => {
    if (isStorageInitialized) saveHistoricalPricesToStorage(historicalPrices);
  }, [historicalPrices, isStorageInitialized]);

  useEffect(() => {
    if (isStorageInitialized) saveHistoricalFxToStorage(historicalFx);
  }, [historicalFx, isStorageInitialized]);

  useEffect(() => {
    if (isStorageInitialized) saveCashTransactionsToStorage(cashTransactions);
  }, [cashTransactions, isStorageInitialized]);

  useEffect(() => {
    if (isStorageInitialized) saveLoanRecordsToStorage(loanRecords);
  }, [loanRecords, isStorageInitialized]);

  // 監聽並持久化 broker accounts
  useEffect(() => {
    if (isStorageInitialized) saveBrokerAccountsToStorage(accounts);
  }, [accounts, isStorageInitialized]);

  // 監聽並持久化 apiKeys
  const handleSaveApiKeys = (keys: ApiKeysConfig) => {
    setApiKeys(keys);
    saveApiKeysConfigToStorage(keys);
  };

  // 監聽並持久化 accountingView
  useEffect(() => {
    saveAccountingViewToStorage(accountingView);
  }, [accountingView]);

  // 監聽並將色彩主題套用到 DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-color-theme', colorTheme);
    localStorage.setItem('stock_tracker_color_theme', colorTheme);
  }, [colorTheme]);

  const handleToggleColorTheme = () => {
    setColorTheme((prev) => (prev === 'taiwan' ? 'international' : 'taiwan'));
  };

  // 彈窗狀態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<TradeRecord | null>(null);
  const [modalInitialSymbol, setModalInitialSymbol] = useState('');
  const [modalInitialType, setModalInitialType] = useState<TradeType>('BUY');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isBrokerAccountsOpen, setIsBrokerAccountsOpen] = useState(false);
  const [isFrictionCenterOpen, setIsFrictionCenterOpen] = useState(false);
  const [isMarginStressOpen, setIsMarginStressOpen] = useState(false);

  // 增強型匯入精靈彈窗狀態
  const [isEnhancedImportModalOpen, setIsEnhancedImportModalOpen] = useState(false);

  // 持久化交易紀錄
  useEffect(() => {
    saveTradesToStorage(trades);
  }, [trades]);

  // 持久化自訂市價快照
  useEffect(() => {
    saveCustomPricesToStorage(currentPrices);
  }, [currentPrices]);

  const [positionFilter, setPositionFilter] = useState<PositionFilter>('ACTIVE');

  // 篩選市場交易紀錄
  const displayedTrades = useMemo(() => {
    if (currentMarket === 'ALL') return trades;
    return trades.filter((t) => t.market === currentMarket);
  }, [trades, currentMarket]);

  // 報價與匯率自動輪詢更新回呼
  const handlePricesCalculated = useCallback((newPrices: Record<string, number>) => {
    setCurrentPrices((prev) => ({ ...prev, ...newPrices }));
  }, []);

  const handleExchangeRateCalculated = useCallback((newRate: number) => {
    setUsdToTwdRate(newRate);
    saveExchangeRate(newRate);
  }, []);

  // 智慧報價與匯率自動輪詢 Hook
  const {
    quotes,
    exchangeRateQuote,
    lockedSymbols,
    isRefreshing,
    lastUpdated,
    marketStatus,
    refreshAll,
    refreshSymbol,
    toggleSymbolLock,
  } = usePriceAutoRefresh({
    trades: displayedTrades,
    onPricesCalculated: handlePricesCalculated,
    onExchangeRateCalculated: handleExchangeRateCalculated,
  });

  // 執行損益與持倉計算（傳入 accountingView, accounts, selectedAccountId, quotes, accountingMethod）
  const { holdings, summary, frictionSummary, closedSummary } = useMemo(() => {
    return calculateHoldingsAndSummary(
      displayedTrades,
      currentPrices,
      usdToTwdRate,
      accountingView,
      accounts,
      selectedAccountId,
      quotes,
      accountingMethod
    );
  }, [displayedTrades, currentPrices, usdToTwdRate, accountingView, accounts, selectedAccountId, quotes, accountingMethod]);

  // 整戶總體 XIRR 計算 (考慮外部出入金與期末淨資產)
  const portfolioXirr = useMemo(() => {
    const scopedTrades = currentMarket === 'ALL'
      ? trades
      : trades.filter((t) => t.market === currentMarket);

    const scopedCash = currentMarket === 'ALL'
      ? cashTransactions
      : cashTransactions.filter((c) => (currentMarket === 'US' ? c.currency === 'USD' : c.currency === 'TWD'));

    const terminalNAV = currentMarket === 'US'
      ? summary.usd.marketValue
      : currentMarket === 'TW'
      ? summary.twd.marketValue
      : summary.combinedTWD.netAssetValue || (summary.twd.marketValue + summary.usd.marketValue * usdToTwdRate);

    return calculatePortfolioXirr({
      cashTransactions: scopedCash,
      trades: scopedTrades,
      terminalNAV,
      baseCurrency: currentMarket === 'US' ? 'USD' : 'TWD',
    });
  }, [trades, cashTransactions, summary, currentMarket, usdToTwdRate]);

  // 整戶現金帳本與可用餘額匯總
  const cashLedgerSummary = useMemo(() => {
    return calculateAccountBalances(accounts, cashTransactions, usdToTwdRate);
  }, [accounts, cashTransactions, usdToTwdRate]);

  // 整戶/分市場總曝險與淨槓桿率 (Net Leverage) 計算（依當前市場隔離持股、現金與負債）
  const exposureMetrics = useMemo(() => {
    const scopedLoans = currentMarket === 'ALL'
      ? loanRecords
      : loanRecords.filter((l) => (currentMarket === 'US' ? l.currency === 'USD' : l.currency === 'TWD'));

    const scopedCashBalances = {
      TWD: currentMarket === 'US' ? 0 : cashLedgerSummary.totalTWD,
      USD: currentMarket === 'TW' ? 0 : cashLedgerSummary.totalUSD,
    };

    return calculatePortfolioExposure({
      holdings,
      cashBalances: scopedCashBalances,
      loans: scopedLoans,
      usdToTwdRate,
    });
  }, [holdings, cashLedgerSummary, loanRecords, usdToTwdRate, currentMarket]);

  // 各項利息收入明細與總額聚合 (依當前市場過濾)
  const interestIncomeSummary = useMemo(() => {
    return aggregateInterestIncomeDetails(cashTransactions, currentMarket, usdToTwdRate);
  }, [cashTransactions, currentMarket, usdToTwdRate]);

  // 公司行動除息事件快取版本與同步狀態
  const [caVersion, setCaVersion] = useState(0);
  const [isCaSyncing, setIsCaSyncing] = useState(false);

  const handleSyncCorporateActions = useCallback(async (force: boolean = false) => {
    if (isCaSyncing || trades.length === 0) return;
    setIsCaSyncing(true);
    try {
      const activeSymbols = Array.from(new Set(holdings.filter((h) => h.shares > 0).map((h) => h.symbol.toUpperCase())));
      if (activeSymbols.length > 0) {
        await scanCorporateActions(trades, undefined, {
          symbolsToScan: activeSymbols,
          concurrency: 3,
          forceRefresh: force,
        });
        setCaVersion((v) => v + 1);
      }
    } catch {
      // ignore
    } finally {
      setIsCaSyncing(false);
    }
  }, [isCaSyncing, trades, holdings]);

  // 待發放應收現金股利 (除息日至發放日之間平滑)
  const receivableDividends = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const cachedEvents = CorporateActionSessionCache.getAllEvents();
    return calculateReceivableDividends(holdings, cachedEvents, trades, todayStr, usdToTwdRate);
  }, [holdings, trades, usdToTwdRate, caVersion]);

  // 應用程式初始載入就緒時，自動在背景靜默預載在庫持股除息日曆公告 (保留手動強制同步按鈕)
  const hasTriggeredAutoSyncRef = useRef(false);
  useEffect(() => {
    if (!hasTriggeredAutoSyncRef.current && !isCaSyncing && holdings.length > 0) {
      hasTriggeredAutoSyncRef.current = true;
      handleSyncCorporateActions(false);
    }
  }, [isCaSyncing, holdings, handleSyncCorporateActions]);

  // 稅階合規預警狀態 (台股二代健保 20,000 與美股海外所得 100萬/750萬)
  const taxComplianceStatus = useMemo(() => {
    return buildTaxComplianceStatus(receivableDividends, trades, new Date().getFullYear(), usdToTwdRate);
  }, [receivableDividends, trades, usdToTwdRate]);

  // 股利交易筆數
  const dividendTradesCount = useMemo(() => {
    return trades.filter((t) => t.type === 'DIVIDEND').length;
  }, [trades]);

  // XIRR 現金流透視彈窗狀態
  const [xirrModalState, setXirrModalState] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    result: XirrResult;
    cashFlows: CashFlowEvent[];
    currency: 'TWD' | 'USD';
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    result: {
      rate: 0,
      ratePercent: 0,
      isAnnualized: false,
      durationDays: 0,
      iterations: 0,
      method: 'TRIVIAL',
      totalInflow: 0,
      totalOutflow: 0,
      simpleReturnPercent: 0,
    },
    cashFlows: [],
    currency: 'TWD',
  });

  // 整戶 XIRR 透視
  const handleInspectPortfolioXirr = useCallback(() => {
    setXirrModalState({
      isOpen: true,
      title: `整戶總體 XIRR 年化現金流分析 (${currentMarket === 'US' ? '美股市場' : currentMarket === 'TW' ? '台股市場' : '全市場總體'})`,
      subtitle: `彙整歷史外部入金(+)/出金(-)與期末總淨資產 (NAV)，折現加權衡量真實年化投資回報率`,
      result: portfolioXirr,
      cashFlows: portfolioXirr.cashFlows || [],
      currency: currentMarket === 'US' ? 'USD' : 'TWD',
    });
  }, [portfolioXirr, currentMarket]);

  // 個股 XIRR 透視
  const handleInspectSecurityXirr = useCallback((symbol: string) => {
    const symbolTrades = trades.filter((t) => t.symbol.toUpperCase() === symbol.toUpperCase());
    const holding = holdings.find((h) => h.symbol.toUpperCase() === symbol.toUpperCase());
    const currentPrice = currentPrices[symbol] || holding?.currentPrice || 0;
    const currentMarketValue = holding ? (holding.marketValue || (holding.shares * currentPrice) || 0) : 0;

    const res = calculateSecurityXirr({
      symbol,
      trades: symbolTrades,
      currentMarketValue,
      currency: holding?.currency,
    });

    setXirrModalState({
      isOpen: true,
      title: `【${symbol} ${holding?.name || ''}】含息 XIRR 年化報酬分析`,
      subtitle: `逐筆追蹤歷史買進加碼、分批賣出、現金股利與期末在倉持股市值折現`,
      result: res,
      cashFlows: res.cashFlows || [],
      currency: (holding?.currency as 'TWD' | 'USD') || (symbolTrades[0]?.market === 'US' ? 'USD' : 'TWD'),
    });
  }, [trades, holdings, currentPrices]);

  // 資產成長週期 XIRR 透視
  const handleInspectGrowthXirr = useCallback(() => {
    handleInspectPortfolioXirr();
  }, [handleInspectPortfolioXirr]);


  // 新增或編輯交易
  const handleSaveTrade = (
    tradeData: Omit<TradeRecord, 'id' | 'createdAt'>,
    existingTradeId?: string
  ) => {
    let updatedTrades: TradeRecord[];
    if (existingTradeId) {
      updatedTrades = trades.map((t) =>
        t.id === existingTradeId
          ? {
              ...tradeData,
              id: t.id,
              createdAt: t.createdAt,
            }
          : t
      );
    } else {
      const newTrade: TradeRecord = {
        ...tradeData,
        id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        createdAt: Date.now(),
      };
      updatedTrades = [newTrade, ...trades];
    }
    setTrades(updatedTrades);
    setCashTransactions((prev) => syncTradesWithCashTransactions(updatedTrades, prev));

    // 更新市價預設為本次成交價
    if (tradeData.price > 0) {
      setCurrentPrices((prev) => ({
        ...prev,
        [tradeData.symbol]: tradeData.price,
      }));
    }

    setEditingTrade(null);
    setIsModalOpen(false);
  };

  // 單筆 Trade 更新 (供現金流水帳雙向同步回寫)
  const handleUpdateTrade = (updatedTrade: TradeRecord) => {
    const updatedTrades = trades.map((t) => (t.id === updatedTrade.id ? updatedTrade : t));
    setTrades(updatedTrades);
  };

  // 批次補登公司行動
  const handleApplyCorporateActions = (newActions: TradeRecord[]) => {
    const updatedTrades = [...newActions, ...trades];
    setTrades(updatedTrades);
    setCashTransactions((prev) => syncTradesWithCashTransactions(updatedTrades, prev));
    alert(`✨ 成功補登 ${newActions.length} 筆公司行動紀錄！`);
  };

  // 刪除交易
  const handleDeleteTrade = (id: string) => {
    const updatedTrades = trades.filter((t) => t.id !== id);
    setTrades(updatedTrades);
    setCashTransactions((prev) => syncTradesWithCashTransactions(updatedTrades, prev));
  };

  // 手動更新市價（自動套用鎖定保護）
  const handleUpdatePrice = (symbol: string, price: number) => {
    setCurrentPrices((prev) => ({
      ...prev,
      [symbol]: price,
    }));
    // 手動修改時強制標記為自訂鎖定（冪等操作，不會意外解鎖）
    if (!lockedSymbols.some((s) => s.trim().toUpperCase() === symbol.trim().toUpperCase())) {
      toggleSymbolLock(symbol);
    }
  };

  // 快速加碼或平倉
  const handleQuickTrade = (symbol: string, type: 'BUY' | 'SELL') => {
    setEditingTrade(null);
    setModalInitialSymbol(symbol);
    setModalInitialType(type);
    setIsModalOpen(true);
  };

  // 開啟空白交易彈窗
  const handleOpenNewTrade = () => {
    setEditingTrade(null);
    setModalInitialSymbol('');
    setModalInitialType('BUY');
    setIsModalOpen(true);
  };

  // JSON 匯出
  const handleExportJSON = () => {
    exportTradesToJSON(trades);
  };

  // CSV 匯出
  const handleExportCSV = () => {
    exportTradesToCSV(trades);
  };

  // 執行增強型匯入確認 (自動建立時光機快照防呆)
  const handleConfirmEnhancedImport = async (
    finalTrades: TradeRecord[],
    mode: ImportDeduplicationMode,
    rawIncomingCount: number
  ) => {
    try {
      await createSystemSnapshot(
        `自動備份 (增強型匯入前: ${mode === 'OVERWRITE' ? '全量覆蓋' : mode === 'SMART_MERGE' ? '智慧追加去重' : '強制追加'})`,
        'AUTO_BEFORE_IMPORT',
        {
          trades,
          brokerAccounts: accounts,
          cashTransactions,
          loanRecords,
          historicalPrices,
          historicalFx,
          priceMetadata: { quotes: {}, lockedSymbols: [] },
          apiKeys,
          accountingView,
        }
      );
    } catch (e) {
      console.warn('Failed to take auto snapshot before import:', e);
    }

    setTrades(finalTrades);
    saveTradesToStorage(finalTrades);
    setCashTransactions((prev) => syncTradesWithCashTransactions(finalTrades, prev));
    setIsEnhancedImportModalOpen(false);

    const modeText =
      mode === 'OVERWRITE'
        ? `全量覆蓋完成 (共 ${finalTrades.length} 筆)`
        : mode === 'SMART_MERGE'
        ? `智慧追加去重完成 (現有總筆數: ${finalTrades.length} 筆)`
        : `全數追加完成 (現有總筆數: ${finalTrades.length} 筆)`;

    alert(`🎉 ${modeText}！\n\n• 原始檔案共解析出 ${rawIncomingCount} 筆\n• 系統已為您自動建立還原點快照`);
  };

  // 執行歷史賣出紀錄稅費智慧拆分修復 (保持損益與淨額 100% 恆等)
  const handleRepairLedgerTaxAndFee = useCallback(() => {
    const { repairedTrades, fixedCount, totalTaxSeparated } = repairLedgerTaxAndFee(trades);
    if (fixedCount > 0) {
      setTrades(repairedTrades);
      saveTradesToStorage(repairedTrades);
      alert(
        `🎉 成功修復 ${fixedCount} 筆歷史賣出紀錄！\n\n` +
        `• 已精準拆分出證券交易稅：NT$ ${totalTaxSeparated.toLocaleString()}\n` +
        `• 實付手續費與券商折讓金額已即時還原\n` +
        `• 已實現損益與交割總金額 100% 保持恆等！`
      );
    } else {
      alert('歷史帳本格式良好，無未拆分之稅費紀錄。');
    }
  }, [trades]);

  // 歷史每日日 K 與匯率增量同步處理器
  const handleSyncHistoricalPrices = useCallback(async () => {
    if (isHistoricalSyncing || trades.length === 0) return;
    setIsHistoricalSyncing(true);
    setHistoricalSyncProgress('準備同步歷史日 K...');

    try {
      const allDates = trades.map((t) => t.date).sort();
      const earliestTradeDate = allDates[0] || '2020-01-01';
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. 同步 USD/TWD 歷史匯率
      setHistoricalSyncProgress('同步歷史匯率 (USD/TWD)...');
      const updatedFx = await fetchHistoricalFxRates(earliestTradeDate, todayStr, historicalFx);
      setHistoricalFx(updatedFx);
      saveHistoricalFxToStorage(updatedFx);

      // 2. 逐一同步各標的歷史日 K
      const uniqueSymbols = Array.from(
        new Map(trades.map((t) => [t.symbol.toUpperCase(), { symbol: t.symbol.toUpperCase(), market: t.market }])).values()
      );

      let updatedPriceMap = { ...historicalPrices };
      for (let i = 0; i < uniqueSymbols.length; i++) {
        const item = uniqueSymbols[i];
        setHistoricalSyncProgress(`同步日 K (${i + 1}/${uniqueSymbols.length})：${item.symbol}...`);

        const symbolTrades = trades.filter((t) => t.symbol.toUpperCase() === item.symbol).sort((a, b) => a.date.localeCompare(b.date));
        const symbolStartDate = symbolTrades[0]?.date || earliestTradeDate;

        const prices = await fetchSymbolHistoricalPrices(
          item.symbol,
          item.market,
          symbolStartDate,
          todayStr,
          updatedPriceMap[item.symbol] || {}
        );
        updatedPriceMap[item.symbol] = prices;
      }

      setHistoricalPrices(updatedPriceMap);
      saveHistoricalPricesToStorage(updatedPriceMap);
      setHistoricalSyncProgress('同步完成');
    } catch (err) {
      console.error('Failed to sync historical prices:', err);
    } finally {
      setIsHistoricalSyncing(false);
      setHistoricalSyncProgress('');
    }
  }, [isHistoricalSyncing, trades, historicalPrices, historicalFx]);

  // 全歷史資產淨值 (NAV) 每日序列計算 (支援單一市場精確過濾與即時市價保底)
  const historicalNavSeries = useMemo(() => {
    const scopedTrades = currentMarket === 'ALL'
      ? trades
      : trades.filter((t) => t.market === currentMarket);

    const scopedCash = currentMarket === 'ALL'
      ? cashTransactions
      : cashTransactions.filter((c) => (currentMarket === 'US' ? c.currency === 'USD' : c.currency === 'TWD'));

    const scopedLoans = currentMarket === 'ALL'
      ? loanRecords
      : loanRecords.filter((l) => (currentMarket === 'US' ? l.currency === 'USD' : l.currency === 'TWD' || !l.currency));

    return calculateHistoricalNavSeries({
      trades: scopedTrades,
      cashTransactions: scopedCash,
      loanRecords: scopedLoans,
      priceMap: historicalPrices,
      fxMap: historicalFx,
      currentPrices,
      baseCurrency: currentMarket === 'US' ? 'USD' : 'TWD',
    });
  }, [trades, cashTransactions, loanRecords, historicalPrices, historicalFx, currentPrices, currentMarket]);

  // 當使用者切換至「資產成長 (NAV)」分頁且缺少歷史日 K 時，自動觸發背景平滑補抓
  useEffect(() => {
    if (activeTab === 'growth' && !isHistoricalSyncing && trades.length > 0) {
      const activeSymbols = Array.from(new Set(trades.map((t) => t.symbol.toUpperCase())));
      const hasMissingHistory = activeSymbols.some((sym) => !historicalPrices[sym] || Object.keys(historicalPrices[sym]).length === 0);
      if (hasMissingHistory) {
        handleSyncHistoricalPrices();
      }
    }
  }, [activeTab, isHistoricalSyncing, trades, historicalPrices, handleSyncHistoricalPrices]);

  return (
    <div className="app-container">
      {/* 頂部導航與功能列 */}
      <Header
        currentMarket={currentMarket}
        onSelectMarket={setCurrentMarket}
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        onSelectAccount={setSelectedAccountId}
        usdToTwdRate={usdToTwdRate}
        exchangeRateQuote={exchangeRateQuote}
        colorTheme={colorTheme}
        onToggleColorTheme={handleToggleColorTheme}
        accountingView={accountingView}
        onChangeAccountingView={setAccountingView}
        isRefreshing={isRefreshing}
        lastUpdated={lastUpdated}
        marketStatus={marketStatus}
        onRefreshAll={refreshAll}
        onOpenTradeModal={handleOpenNewTrade}
        onOpenScannerModal={() => setIsScannerOpen(true)}
        onExportJSON={handleExportJSON}
        onExportCSV={handleExportCSV}
        onOpenImportModal={() => setIsEnhancedImportModalOpen(true)}
      />

      {/* 活頁本標籤導覽列 */}
      <WorkspaceTabs
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        holdingsCount={holdings.length}
        tradesCount={trades.length}
        accountsCount={accounts.length}
        dividendTradesCount={dividendTradesCount}
        receivableDividendsCount={receivableDividends.length}
        cashTransactionsCount={cashTransactions.length}
        totalSavedFriction={frictionSummary?.totalFeeSavedByDiscount}
      />

      {/* 活頁 1: 📊 投資組合總覽與庫存 */}
      {activeTab === 'portfolio' && (
        <>
          <AllocationChart
            holdings={holdings}
            usdToTwdRate={usdToTwdRate}
            cashBalanceTwd={cashLedgerSummary.totalCashInTWD}
            colorTheme={colorTheme}
          />
          <SummaryCards
            summary={summary}
            currentMarket={currentMarket}
            accountingView={accountingView}
            positionFilter={positionFilter}
            closedSummary={closedSummary}
            frictionSummary={frictionSummary}
            portfolioXirr={portfolioXirr}
            onInspectPortfolioXirr={handleInspectPortfolioXirr}
            exposureMetrics={exposureMetrics}
            onOpenMarginStressModal={() => setIsMarginStressOpen(true)}
            interestIncomeSummary={interestIncomeSummary}
          />
          <HoldingsTable
            holdings={holdings}
            trades={trades}
            quotes={quotes}
            lockedSymbols={lockedSymbols}
            accountingView={accountingView}
            accountingMethod={accountingMethod}
            onChangeAccountingMethod={setAccountingMethod}
            positionFilter={positionFilter}
            onChangePositionFilter={setPositionFilter}
            onUpdatePrice={handleUpdatePrice}
            onToggleLock={toggleSymbolLock}
            onRefreshSymbol={refreshSymbol}
            onQuickTrade={handleQuickTrade}
            onInspectSecurityXirr={handleInspectSecurityXirr}
            receivableDividends={receivableDividends}
            usdToTwdRate={usdToTwdRate}
          />
        </>
      )}

      {/* 活頁: 📈 資產成長與全歷史淨值 (NAV) */}
      {activeTab === 'growth' && (
        <PortfolioGrowthChart
          series={historicalNavSeries}
          cashTransactions={cashTransactions}
          baseCurrency={currentMarket === 'US' ? 'USD' : 'TWD'}
          isSyncing={isHistoricalSyncing}
          syncProgressText={historicalSyncProgress}
          onRefreshHistory={handleSyncHistoricalPrices}
          onInspectXirr={handleInspectGrowthXirr}
        />
      )}

      {/* 活頁: 💰 股利日誌與被動現金流全景 */}
      {activeTab === 'dividend' && (
        <DividendLogView
          trades={trades}
          receivableDividends={receivableDividends}
          usdToTwdRate={usdToTwdRate}
          market={currentMarket}
          selectedAccountId={selectedAccountId}
          onSyncCorporateActions={() => handleSyncCorporateActions(true)}
          isSyncingCorporateActions={isCaSyncing}
        />
      )}

      {/* 活頁: 💰 現金帳本與借貸質押管理中心 */}
      {activeTab === 'cash' && (
        <CashLedgerWorkspace
          accounts={accounts}
          transactions={cashTransactions}
          onSaveTransactions={setCashTransactions}
          loans={loanRecords}
          onSaveLoans={setLoanRecords}
          holdings={holdings}
          quotes={quotes}
          usdToTwdRate={usdToTwdRate}
          trades={trades}
          onUpdateTrade={handleUpdateTrade}
          currentMarket={currentMarket}
          selectedAccountId={selectedAccountId}
        />
      )}

      {/* 活頁 2: 📜 交易歷史明細帳本 */}
      {activeTab === 'ledger' && (
        <TradeHistoryTable
          trades={displayedTrades}
          totalTradesCount={trades.length}
          onResetGlobalFilters={() => {
            setCurrentMarket('ALL');
            setSelectedAccountId('ALL');
          }}
          onDeleteTrade={handleDeleteTrade}
          onRepairTaxAndFee={handleRepairLedgerTaxAndFee}
          onEditTrade={(trade) => {
            setEditingTrade(trade);
            setIsModalOpen(true);
          }}
        />
      )}

      {/* 活頁 3: ⚙️ 設定中心 (券商、摩擦分析、外部 API Key、時光機資料庫) */}
      {(activeTab === 'settings' || activeTab === 'friction') && (
        <SettingsWorkspace
          accounts={accounts}
          onSaveAccounts={setAccounts}
          frictionSummary={frictionSummary}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
          apiKeys={apiKeys}
          onSaveApiKeys={handleSaveApiKeys}
          trades={trades}
          cashTransactions={cashTransactions}
          loanRecords={loanRecords}
          onRepairTaxAndFee={handleRepairLedgerTaxAndFee}
          onDataRestored={loadAllFromDB}
          currentMarket={currentMarket}
          usdRate={usdToTwdRate}
        />
      )}

      {/* 交易錄入與編輯彈窗 */}
      <TradeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTrade(null);
        }}
        onSaveTrade={handleSaveTrade}
        editingTrade={editingTrade}
        initialSymbol={modalInitialSymbol}
        initialType={modalInitialType}
        initialMarket={currentMarket === 'ALL' ? 'TW' : currentMarket}
        initialAccountId={selectedAccountId === 'ALL' ? undefined : selectedAccountId}
        trades={trades}
        accounts={accounts}
      />

      {/* 券商帳戶與費率管理彈窗 */}
      <BrokerAccountsModal
        isOpen={isBrokerAccountsOpen}
        onClose={() => setIsBrokerAccountsOpen(false)}
        accounts={accounts}
        onSaveAccounts={setAccounts}
      />

      {/* 交易摩擦成本深度分析儀彈窗 */}
      <FrictionCenterModal
        isOpen={isFrictionCenterOpen}
        onClose={() => setIsFrictionCenterOpen(false)}
        frictionSummary={frictionSummary}
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        taxComplianceStatus={taxComplianceStatus}
      />

      {/* 智慧掃描公司行動彈窗 */}
      <CorporateActionScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        trades={trades}
        onApplyActions={handleApplyCorporateActions}
      />

      {/* 增強型 CSV / JSON 智慧匯入精靈彈窗 */}
      <EnhancedImportModal
        isOpen={isEnhancedImportModalOpen}
        onClose={() => setIsEnhancedImportModalOpen(false)}
        accounts={accounts}
        existingTrades={trades}
        onConfirmImport={handleConfirmEnhancedImport}
      />

      {/* XIRR 現金流明細與收斂診斷透視彈窗 */}
      <XirrDetailModal
        isOpen={xirrModalState.isOpen}
        onClose={() => setXirrModalState((prev) => ({ ...prev, isOpen: false }))}
        title={xirrModalState.title}
        subtitle={xirrModalState.subtitle}
        result={xirrModalState.result}
        cashFlows={xirrModalState.cashFlows}
        currency={xirrModalState.currency}
      />

      {/* 質押維持率極端壓力測試與追繳逆運算模擬器彈窗 */}
      <MarginStressModal
        isOpen={isMarginStressOpen}
        onClose={() => setIsMarginStressOpen(false)}
        holdings={holdings}
        loans={loanRecords}
        usdToTwdRate={usdToTwdRate}
      />
    </div>
  );
};
