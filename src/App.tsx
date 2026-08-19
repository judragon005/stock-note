import React, { useState, useEffect, useMemo } from 'react';
import { TradeRecord, MarketType, TradeType, ColorThemeMode } from './types/stock';
import { calculateHoldingsAndSummary } from './engine/calculator';
import {
  loadTradesFromStorage,
  saveTradesToStorage,
  loadExchangeRate,
  saveExchangeRate,
  exportTradesToJSON,
  exportTradesToCSV,
} from './utils/storage';

import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { AllocationChart } from './components/AllocationChart';
import { HoldingsTable } from './components/HoldingsTable';
import { TradeHistoryTable } from './components/TradeHistoryTable';
import { TradeModal } from './components/TradeModal';

export const App: React.FC = () => {
  const [trades, setTrades] = useState<TradeRecord[]>(() => loadTradesFromStorage());
  const [usdToTwdRate, setUsdToTwdRate] = useState<number>(() => loadExchangeRate());
  const [currentMarket, setCurrentMarket] = useState<'ALL' | MarketType>('ALL');
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
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

  // 持久化交易紀錄
  useEffect(() => {
    saveTradesToStorage(trades);
  }, [trades]);

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

  // 新增交易
  const handleSaveTrade = (tradeData: Omit<TradeRecord, 'id' | 'createdAt'>) => {
    const newTrade: TradeRecord = {
      ...tradeData,
      id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: Date.now(),
    };
    setTrades((prev) => [newTrade, ...prev]);

    // 更新市價預設為本次成交價
    setCurrentPrices((prev) => ({
      ...prev,
      [tradeData.symbol]: tradeData.price,
    }));
  };

  // 刪除交易
  const handleDeleteTrade = (id: string) => {
    setTrades((prev) => prev.filter((t) => t.id !== id));
  };

  // 更新市價
  const handleUpdatePrice = (symbol: string, price: number) => {
    setCurrentPrices((prev) => ({
      ...prev,
      [symbol]: price,
    }));
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

  // JSON 匯入還原
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTrades(parsed);
            alert(`✅ 成功匯入 ${parsed.length} 筆交易紀錄！`);
          } else {
            alert('❌ 檔案格式不符合，請確認是否為有效之 JSON 備份檔。');
          }
        } catch {
          alert('❌ 檔案解析失敗，請確認檔案格式是否正確。');
        }
      };
    }
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
        onOpenTradeModal={handleOpenNewTrade}
        onExportJSON={handleExportJSON}
        onExportCSV={handleExportCSV}
        onImportJSON={handleImportJSON}
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
        onUpdatePrice={handleUpdatePrice}
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
      />
    </div>
  );
};
