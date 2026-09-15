# 0133. 頂部同步晶片視覺重構、設定中心排程管理面板與全量本地資料庫調度規格 (Header Sync UX Redesign, Settings Schedule Hub & Local-First Spec)

- **狀態**：Approved
- **建立日期**：2026-09-15
- **負責 Agent**：Antigravity Agent
- **關聯 PRD / Spec**：[0132](0132-scheduled-market-sync-and-zero-latency-cache-spec.md), [0069](0069-full-project-ui-ux-design-system-and-modern-glassmorphism-spec.md)
- **關聯 GitHub Issue**：[#68](https://github.com/judragon005/stock-note/issues/68)
- **目標分支**：`feature/68-header-sync-ux-and-schedule-hub`

---

## 1. 需求背景與核心痛點 (Problem & Context)

在 V8.47.0 引入每日盤後定時同步與快取機制後，經實機界面審查，識別出以下關鍵使用者體驗與架構痛點：

1. **頂部導航列視覺失真與空間擁擠**：
   - 目前 `MarketSyncStatusBadge` 採用 Tailwind 類別且置於 Header 下排左側按鈕區，文字過於冗長（`盤後快取:台股等待排程|美股等待排程`），白邊黑底與文字緊貼，與右側現有之「`台股盤中 12:22:02`」、「`綠漲 紅跌`」、「`USD/TWD`」等深藍科技感半透明毛玻璃膠囊完全不搭，破壞了整體視覺質感。
2. **Windows 背景排程缺乏專案內管理界面**：
   - 使用者透過批次檔註冊開機排程後，若想了解目前排程運作狀態、手動測試、或者日後想要「一鍵移除/卸載排程」，在專案網頁介面內完全沒有直觀的說明與操作面板，造成使用者操作不便與疑慮。
3. **全模組資料本地化與減少外部 API 請求之訴求**：
   - 各頁面切換時若頻繁對外打 API，容易遭遇 429 封鎖與等待轉圈。需要確立「以本地資料庫為核心 (Local-First SSOT)」的架構原則，確保所有分析工作區優先讀取本地持久化資料庫與快取，達成真正的秒讀體驗。

---

## 2. 核心功能規格與架構設計 (Functional Specifications)

### 2.1 頂部同步狀態晶片視覺重構 (`Header.tsx` & `MarketSyncStatusBadge.tsx`)
1. **完全對齊右側控制列設計規範 (Design Tokens)**：
   - 移除不合規格的 Tailwind 樣式，全面採用 Inline Style 與專案 CSS 變數：
     - 背景：`rgba(19, 29, 49, 0.7)`（深色半透明毛玻璃）。
     - 邊框：`1px solid var(--border-color)`。
     - 圓角：`borderRadius: 8px`，字級 `0.72rem`，內距 `padding: 5px 10px`。
2. **緊湊優雅的膠囊呈現 (Compact Pill Representation)**：
   - 將文字大幅精簡：
     - 若台股已同步：顯示綠色脈衝圓點 + `🇹🇼 盤後 16:00`
     - 若美股已同步：顯示藍色圓點 + `🇺🇸 盤後 08:00`
     - 若皆未同步：顯示小巧資料庫圖示 + `盤後排程 (點擊詳情)`
   - 移至右側狀態列，與「`盤中狀態`」、「`匯率`」無縫並列，徹底還給左側按鈕呼吸空間。
3. **互動 Hover 與彈窗升級**：
   - 懸停 (Hover) 顯示精準 Tooltip（如：「台股今日 16:01 完成 2,248 檔同步 | 美股已同步」）。
   - 點擊開啟毛玻璃稽核彈窗，具備與專案完全一致之深色高對比設計。

### 2.2 設定中心【盤後數據與 Windows 排程管理面板】(`SettingsWorkspace.tsx`)
1. **專屬排程管理卡片**：
   - 在「設定中心」新增獨立區塊：**【盤後自動化與 Windows 工作排程管理 (Market Sync Hub)】**。
2. **透明呈現排程狀態與執行水線**：
   - 顯示台股排程 (16:00) 與美股排程 (08:00) 的最新執行時間、成功檔數、資料庫覆蓋率。
3. **專案內自由管理指南與一鍵複製指令**：
   - 提供直觀切換分頁或卡片：
     - **【一鍵安裝 / 啟用】**：提供一鍵複製 PowerShell 指令與 `.bat` 執行路徑說明。
     - **【一鍵移除 / 卸載】**：提供一鍵複製「卸載排程命令」(`schtasks /delete /tn "StockTracker_TW_Sync" /f && schtasks /delete /tn "StockTracker_US_Sync" /f`)，使用者只需在終端機貼上即可 1 秒移除，完全無需翻找 Windows 控制台。
     - **【路徑重綁定說明】**：清楚提示若專案資料夾被搬移至其他磁碟，重新執行一次批次檔即可自動更新絕對路徑。
4. **手動測試與快取清理**：
   - 提供「手動執行台股同步」、「手動執行美股同步」指令複製按鈕，以及「清理本地盤後快取」功能。

### 2.3 資料本地化第一性原則收斂 (Offline-First Data Pipeline)
1. **單一資料庫出口門面**：
   - `App.tsx` 初始化時，盤後快取全量注入 `currentPrices` 並非同步批量寫入 IndexedDB `historicalOhlcv` 與 `technicalIndicators`。
2. **阻斷頁面切換分散重複請求**：
   - 個股分析、籌碼動態與肌肉書僮在載入時，優先以本地資料庫（IndexedDB）現有日 K 與指標為第一數據源，僅在本地查無任何紀錄時才發送外部請求，徹底消除切換頁面時的頻繁網路載入。

---

## 3. 模組與檔案清單 (File Manifest)

1. `src/components/MarketSyncStatusBadge.tsx`：全面重構樣式，採用原生毛玻璃規格，精簡標籤並支援 Tooltip 與美化彈窗。
2. `src/components/Header.tsx`：調整佈局排版，將同步膠囊移至右側狀態晶片組，恢復控制列的和諧與空間呼吸感。
3. `src/components/SettingsWorkspace.tsx`：新增「盤後自動化與排程管理面板」，提供狀態檢視與一鍵複製安裝/卸載命令。
4. `src/components/MarketSyncStatusBadge.test.ts`：更新單元測試，驗證精簡膠囊的渲染、點擊與彈窗互動。

---

## 4. 測試計畫與防禦性驗證 (Testing Plan)

1. **視覺回歸與樣式對齊測試**：
   - 確保 Header 在不同螢幕解析度（1280px ~ 1920px）下均不破版、不重疊、無任何突兀白色邊框。
2. **設定中心排程操作測試**：
   - 驗證「一鍵複製安裝指令」與「一鍵複製移除指令」能正確複製指令字串至剪貼簿。
3. **全站單元測試 100% 綠燈與編譯 0 錯誤**：
   - 執行 `npm test` 與 `npm run build`，確保無任何 TypeScript 報錯。
