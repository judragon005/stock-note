# 0128. 股票健診系統原生毛玻璃擬態、ETF防呆與標的快捷膠囊全面重構 (Stock Health Check UX Redesign, Native Glassmorphism & ETF Guard Architecture)

- **狀態**：Accepted
- **日期**：2026-09-14
- **關聯規格**：[docs/specs/0128-stock-health-check-ux-redesign-and-glassmorphism-spec.md](../specs/0128-stock-health-check-ux-redesign-and-glassmorphism-spec.md)
- **關聯 Issue**：[#57](https://github.com/judragon005/stock-note/issues/57)
- **關聯 PR**：[#58](https://github.com/judragon005/stock-note/pull/58)

---

## 背景與脈絡 (Context)

在 Spec 0127 初版上線後，使用者於實盤操作時發現以下嚴重 UX 痛點：
1. **排版碎裂與黑箭頭遮擋**：由於專案未採用 Tailwind CSS，原先寫入的 Tailwind Utility Classes 全數失效，導致卡片背景透明破版、SVG 儀表板指針因缺乏寬高與原點限制而膨脹為巨型黑箭頭，遮擋整個畫面。
2. **ETF 空數據與不適用困惑**：系統預設選擇庫存第一檔標的，若為 ETF（如 `00403A`）因無企業營運財報（無毛利、營業利益、CFO、資產負債），導致指標計算全數為 0 或空白，造成使用者極大困惑。
3. **標的切換路徑過長**：缺乏直觀的熱門標的或在庫個股快速跳轉切換通道。

---

## 架構決策 (Decision)

1. **全面拔除 Tailwind，改採純原生 Inline Styles + Design Tokens**：
   - 儀表板 `HealthScoreGauge.tsx`：SVG 明確定義 `viewBox="0 0 200 135"`，指針旋轉原點錨定於 `(100, 115)`，固定指針圓心 `r={4}`，徹底杜絕黑三角失控。
   - 健診卡片 `HealthCard.tsx`：採用原生 `var(--bg-card)`、`var(--border-color)`、`var(--shadow-card)` 與科技光暈，建立頂級深色毛玻璃擬態。
   - 報告彈窗 `HealthReportModal.tsx`：全覆蓋深黑透明遮罩 (`rgba(0,0,0,0.75)`) 搭配 `backdropFilter: blur(12px)`，綠勾、紅叉與豁免標籤全面高對比化，支援 `ESC` 鍵全域監聽與 Body 滾動鎖定。
2. **ETF 智慧識別防呆橫幅 (Amber Warning Guard)**：
   - 建立 `isEtfSymbol` 智慧檢驗函式，涵蓋台股 `00...`（含 `00403A` 等混合編號）及美股主流大盤與科技 ETF。
   - 偵測到 ETF 時，卡片頂部浮現琥珀色毛玻璃警示橫幅，清楚說明 ETF 為投資組合、不適用企業財報量化健診，並附上一鍵切換至成分股/個股之快捷按鈕。
   - 預設標的優先選擇庫存普通股，若庫存全為 ETF 則智慧預設為熱門標的 `2330`。
3. **Stock Pills 快捷膠囊列 (Quick Navigation Pills)**：
   - 在 Header 下方建置橫向滾動之快捷標的膠囊列（涵蓋持倉個股與 2330 台積電、2454 聯發科、2317 鴻海、NVDA、AAPL、IBM）。
   - 膠囊加入 `seen` Set 雙重去重防護，選中狀態高亮發光，一鍵秒切。
4. **說明橫幅狀態記憶 (Banner State Persistence)**：
   - 頂部科技海軍藍漸層橫幅支援「收起說明」與「展開說明」，開合狀態持久化於 `localStorage`。

---

## 影響與驗證 (Consequences & Verification)

- **正面影響**：
  - 徹底解決視覺破版與巨大黑箭頭遮擋，呈現極具現代感的頂級毛玻璃金融介面。
  - ETF 防呆橫幅避免了使用者對指標數據缺失的誤解，大幅提升系統可信度與親和力。
  - 快捷膠囊大幅縮減分析切換的操作成本。
- **測試與建置保證**：
  - 新增 `StockHealthWorkspace.test.ts`，覆蓋台美股 ETF 辨識與極限邊界。
  - 全專案 90 個測試檔案、893 項測試 100% 綠燈通過。
  - `npm run build` TypeScript 0 錯誤、生產打包順利完成。
