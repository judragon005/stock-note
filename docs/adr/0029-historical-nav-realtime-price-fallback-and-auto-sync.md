# ADR 0029: 歷史資產淨值 (NAV) 折線圖即時市價保底與自動日 K 同步

## 狀態
已採納 (Accepted)

## 背景與問題
當歷史日 K 線未同步或缺少時，折線圖先前降級採用最早買進成交價計算市值，導致持股市值被嚴重低估，造成「投資組合頁面獲利，但折線圖卻顯示虧損」的嚴重背離現象。

## 決策內容
1. **即時市價保底 (Real-time Price Fallback)**：在 `calculateHistoricalNavSeries` 引入 `currentPrices`，當缺少歷史日 K 時優先以最新即時市價（如 VT $160.99）作為 Fallback 與最新一日基準價。
2. **切換分頁自動背景補抓**：在 `App.tsx` 監聽 `activeTab === 'growth'`，當檢測到活躍持倉標的缺少日 K 時，在背景非阻塞自動觸發 `handleSyncHistoricalPrices`。

## 後續影響
- 折線圖最新淨資產與獲利 100% 精確對齊投資組合庫存頁，徹底消除由盈轉虧的背離問題。
- 自動補齊歷史日 K，提升使用者體驗。
