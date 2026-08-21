import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TradeRecord, MarketType, TradeType, ColorThemeMode } from './types/stock';
import { calculateHoldingsAndSummary } from './engine/calculator';
import {
  loadTradesFromStorage,
  saveTradesToStorage,
  loadExchangeRate,
  saveExchangeRate,
  loadCustomPricesFromStorage,
  saveCustomPricesToStorage,
  validateTradesSchema,
  parseCSVToTrades,
  mergeTrades,
  exportTradesToJSON,
  exportTradesToCSV,
} from './utils/storage';

import { usePriceAutoRefresh } from './hooks/usePriceAutoRefresh';

import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { AllocationChart } from './components/AllocationChart';
import { HoldingsTable } from './components/HoldingsTable';
import { TradeHistoryTable } from './components/TradeHistoryTable';
import { TradeModal } from './components/TradeModal';
import { ImportModal } from './components/ImportModal';
import { CorporateActionScannerModal } from './components/CorporateActionScannerModal';

export const App: React.FC = () => {
  const [trades, setTrades] = useState<TradeRecord[]>(() => loadTradesFromStorage());
  const [usdToTwdRate, setUsdToTwdRate] = useState<number>(() => loadExchangeRate());
  const [currentMarket, setCurrentMarket] = useState<'ALL' | MarketType>('ALL');
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>(() => loadCustomPricesFromStorage());
  const [colorTheme, setColorTheme] = useState<ColorThemeMode>(() => {
    return (localStorage.getItem('stock_tracker_color_theme') as ColorThemeMode) || 'taiwan';
  });

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
  const [modalInitialSymbol, setModalInitialSymbol] = useState('');
  const [modalInitialType, setModalInitialType] = useState<TradeType>('BUY');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // 匯入確認彈窗狀態
  const [importModal, setImportModal] = useState<{
    isOpen: boolean;
    fileName: string;
    incomingTrades: TradeRecord[];
    skippedCount: number;
  }>({
    isOpen: false,
    fileName: '',
    incomingTrades: [],
    skippedCount: 0,
  });

  // 持久化交易紀錄
  useEffect(() => {
    saveTradesToStorage(trades);
  }, [trades]);

  // 持久化自訂市價快照
  useEffect(() => {
    saveCustomPricesToStorage(currentPrices);
  }, [currentPrices]);

  // 持久化匯率
  const handleUpdateRate = (rate: number) => {
    setUsdToTwdRate(rate);
    saveExchangeRate(rate);
  };

  // 篩選市場交易紀錄
  const displayedTrades = useMemo(() => {
    if (currentMarket === 'ALL') return trades;
    return trades.filter((t) => t.market === currentMarket);
  }, [trades, currentMarket]);

  // 執行損益與持倉計算
  const { holdings, summary } = useMemo(() => {
    return calculateHoldingsAndSummary(displayedTrades, currentPrices, usdToTwdRate);
  }, [displayedTrades, currentPrices, usdToTwdRate]);

  // 報價自動輪詢更新回呼
  const handlePricesCalculated = useCallback((newPrices: Record<string, number>) => {
    setCurrentPrices((prev) => ({ ...prev, ...newPrices }));
  }, []);

  // 智慧報價自動輪詢 Hook
  const {
    quotes,
    lockedSymbols,
    isRefreshing,
    lastUpdated,
    marketStatus,
    refreshAll,
    refreshSymbol,
    toggleSymbolLock,
  } = usePriceAutoRefresh({
    holdings,
    onPricesCalculated: handlePricesCalculated,
  });

  // 新增交易
  const handleSaveTrade = (tradeData: Omit<TradeRecord, 'id' | 'createdAt'>) => {
    const newTrade: TradeRecord = {
      ...tradeData,
      id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: Date.now(),
    };
    setTrades((prev) => [newTrade, ...prev]);

    // 更新市價預設為本次成交價
    if (tradeData.price > 0) {
      setCurrentPrices((prev) => ({
        ...prev,
        [tradeData.symbol]: tradeData.price,
      }));
    }
  };

  // 批次補登公司行動
  const handleApplyCorporateActions = (newActions: TradeRecord[]) => {
    setTrades((prev) => [...newActions, ...prev]);
    alert(`✨ 成功補登 ${newActions.length} 筆公司行動紀錄！`);
  };

  // 刪除交易
  const handleDeleteTrade = (id: string) => {
    setTrades((prev) => prev.filter((t) => t.id !== id));
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
    setModalInitialSymbol(symbol);
    setModalInitialType(type);
    setIsModalOpen(true);
  };

  // 開啟空白交易彈窗
  const handleOpenNewTrade = () => {
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

  // 統一檔案匯入 (支援 JSON / CSV)
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const isCSV = fileName.toLowerCase().endsWith('.csv');
    const isJSON = fileName.toLowerCase().endsWith('.json');

    if (!isCSV && !isJSON) {
      alert('❌ 請選擇 .json 或 .csv 格式的備份檔案！');
      return;
    }

    const fileReader = new FileReader();
    fileReader.readAsText(file, 'UTF-8');
    fileReader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) {
        alert('❌ 檔案內容為空，無法讀取。');
        return;
      }

      if (isJSON) {
        try {
          const parsed = JSON.parse(content);
          const validated = validateTradesSchema(parsed);
          if (validated && validated.length > 0) {
            setImportModal({
              isOpen: true,
              fileName,
              incomingTrades: validated,
              skippedCount: 0,
            });
          } else {
            alert('❌ JSON 備份檔格式不符或缺少必要交易欄位！');
          }
        } catch {
          alert('❌ JSON 解析失敗，請確認檔案語法是否正確。');
        }
      } else if (isCSV) {
        try {
          const result = parseCSVToTrades(content);
          if (result.trades.length > 0) {
            setImportModal({
              isOpen: true,
              fileName,
              incomingTrades: result.trades,
              skippedCount: result.skippedCount,
            });
          } else {
            alert('❌ CSV 檔案中未解析出任何有效之交易紀錄！');
          }
        } catch {
          alert('❌ CSV 解析失敗，請確認檔案格式是否正確。');
        }
      }
    };
  };

  // 執行全量覆蓋
  const handleConfirmOverwrite = (incoming: TradeRecord[]) => {
    setTrades(incoming);
    setImportModal((prev) => ({ ...prev, isOpen: false }));
    alert(`✅ 已成功全量還原 ${incoming.length} 筆交易紀錄！`);
  };

  // 執行追加合併
  const handleConfirmMerge = (incoming: TradeRecord[]) => {
    setTrades((prev) => mergeTrades(prev, incoming));
    setImportModal((prev) => ({ ...prev, isOpen: false }));
    alert(`✅ 已成功合併 ${incoming.length} 筆交易紀錄！`);
  };

  return (
    <div className="app-container">
      {/* 頂部導航與功能列 */}
      <Header
        currentMarket={currentMarket}
        onSelectMarket={setCurrentMarket}
        usdToTwdRate={usdToTwdRate}
        onUpdateRate={handleUpdateRate}
        colorTheme={colorTheme}
        onToggleColorTheme={handleToggleColorTheme}
        isRefreshing={isRefreshing}
        lastUpdated={lastUpdated}
        marketStatus={marketStatus}
        onRefreshAll={refreshAll}
        onOpenTradeModal={handleOpenNewTrade}
        onOpenScannerModal={() => setIsScannerOpen(true)}
        onExportJSON={handleExportJSON}
        onExportCSV={handleExportCSV}
        onImportFile={handleImportFile}
      />

      {/* 總資產與損益卡片 */}
      <SummaryCards summary={summary} currentMarket={currentMarket} />

      {/* 資產配置視覺化圖表 (樹狀圖 / 權重清單) */}
      <AllocationChart
        holdings={holdings}
        usdToTwdRate={usdToTwdRate}
        colorTheme={colorTheme}
      />

      {/* 當前持倉庫存表 */}
      <HoldingsTable
        holdings={holdings}
        trades={trades}
        quotes={quotes}
        lockedSymbols={lockedSymbols}
        onUpdatePrice={handleUpdatePrice}
        onToggleLock={toggleSymbolLock}
        onRefreshSymbol={refreshSymbol}
        onQuickTrade={handleQuickTrade}
      />

      {/* 歷史交易明細表 */}
      <TradeHistoryTable trades={displayedTrades} onDeleteTrade={handleDeleteTrade} />

      {/* 交易錄入彈窗 */}
      <TradeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveTrade={handleSaveTrade}
        initialSymbol={modalInitialSymbol}
        initialType={modalInitialType}
        trades={trades}
      />

      {/* 智慧掃描公司行動彈窗 */}
      <CorporateActionScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        trades={trades}
        onApplyActions={handleApplyCorporateActions}
      />

      {/* 匯入還原確認彈窗 */}
      <ImportModal
        isOpen={importModal.isOpen}
        onClose={() => setImportModal((prev) => ({ ...prev, isOpen: false }))}
        fileName={importModal.fileName}
        incomingTrades={importModal.incomingTrades}
        skippedCount={importModal.skippedCount}
        existingCount={trades.length}
        onConfirmOverwrite={handleConfirmOverwrite}
        onConfirmMerge={handleConfirmMerge}
      />
    </div>
  );
};
