# Ticket 03: 頂部快捷股票按鈕徹底移除與查詢行單行清爽化

## 關聯規格
- Spec: `docs/specs/0172-ai-force-war-room-comprehensive-layout-and-quant-engine-refactor-spec.md` (Story 2 / AC 2.1, AC 2.2)

## 問題背景
頂部 `HeaderMarketBar.tsx` 寫死了 0050、2330、2454、NVDA、AAPL 5 檔快捷標籤，佔用超過 400px 寬度，導致使用者輸入代號或在常規解析度（如 1366px 或 1440px）瀏覽時，右側 4 大科技感狀態膠囊燈號被擠到下一行換行，嚴重破壞佈局美觀。

## 任務細節
1. 修改 `src/components/aiForceDashboard/HeaderMarketBar.tsx`：
   - 徹底移除主橫列寫死之 `QUICK_CHIPS` 5 檔股票按鈕。
   - 優化代碼輸入框、股票名稱與 [分析] 按鈕容器樣式，賦予彈性與微光科技邊框。
   - 確保第一層主橫列（輸入區塊 + 右側 4 大狀態膠囊燈號）在常規螢幕下保證處於同一行 (`whiteSpace: nowrap`, `flex-wrap: nowrap` 或彈性間距)。
2. 同步調整 `HeaderMarketBar.test.ts` 相關單元測試。

## 驗收標準
- [ ] 頂部主橫列不再出現寫死的 5 個快捷股票晶片。
- [ ] 輸入任何代碼時，第一列均維持單行舒展，右側 4 大狀態膠囊燈號不換行、不被截斷。
- [ ] 單元測試 `HeaderMarketBar.test.ts` 100% 通過。
