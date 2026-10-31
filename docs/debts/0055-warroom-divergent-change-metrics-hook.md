# 技術債 0055: WarRoomWorkspace 龐大單體元件與發散式變化 (Divergent Change) 狀態抽取 (useWarRoomPortfolioMetrics)

## 📌 基本資訊
- **狀態**: `OPEN`
- **建立日期**: 2026-10-30
- **發現來源**: Code Review (Spec 0209 / Issue #359)
- **優先級別**: `P3` (非阻擋性代碼整潔與維護性改進)
- **關聯模組**: `src/components/WarRoomWorkspace.tsx`
- **標籤**: `Refactor` · `CleanCode` · `WarRoom` · `CustomHooks` · `DivergentChange`

---

## 🔍 現況分析 (Context & Smell)
在 Spec 0209 (宏觀戰情室 3.0) 演進完成後，`src/components/WarRoomWorkspace.tsx` 整合了台美費半跨市場傳導矩陣、全資產防禦護盾與自由發射彈藥守護計算、大盤波段雙溫度計以及多源金鑰池真數據管線，單體程式碼已達 2200+ 行。

目前該元件同時承擔以下多重職責，呈現 Fowler 經典代碼異味 **Divergent Change (發散式變化)** 與 **Large Component (龐大單體元件)**：
1. **投組維度指標聚合 (Portfolio Metrics Computation)**：
   包含淨值、有效槓桿率、維持率、未結清交割款扣除、應收股息補償、DCA 承諾金扣除與自由可動用彈藥 (Free Ammo) 計算。
2. **宏觀指標歷史趨勢與波段溫度計計算 (Macro & Swing Thermometer Logic)**：
   包含費半領先指標、ADR 溢價率平滑運算、恐懼貪婪指數、殖利率倒掛與綜合波段水位評估。
3. **多維視覺化卡片與使用者互動 (UI View Rendering & Modals)**：
   包含 8+ 個卡片渲染、快速校準 Modal、金鑰設定 Modal、API 狀態檢視與即時手動微調。

當投組風控邏輯或宏觀傳導算法調整時，均需修改此龐大視圖元件，增加了測試與維護的偶合風險。

---

## 💡 建議改善方案 (Proposed Solution)
1. **抽取自訂 Hook `src/hooks/useWarRoomPortfolioMetrics.ts`**：
   將所有與持倉、借貸、現金、交割款扣除、自由彈藥 (Free Ammo) 相關的計算移出至自訂 Hook：
   ```typescript
   export function useWarRoomPortfolioMetrics({
     holdings,
     loans,
     cashBalanceTwd,
     totalNavTwd,
     pendingSettlementOutflowTwd,
     receivableDividends,
     dcaCommitment7dTwd,
   }: UseWarRoomPortfolioMetricsParams): WarRoomPortfolioMetricsResult {
     // 集中處理整戶總資產、借貸維持率、自由發射彈藥等 memoized metrics
   }
   ```
2. **精簡 `WarRoomWorkspace.tsx`**：
   `WarRoomWorkspace` 僅呼叫 `useWarRoomPortfolioMetrics(...)` 並取得運算結果，專注於各分區卡片的排版與佈局，預期可精簡 250+ 行計算程式碼。
3. **補充專屬單元測試 `useWarRoomPortfolioMetrics.test.ts`**：
   針對自由彈藥扣除、負值零值防禦、未交割款與 7 日 DCA 扣除進行獨立且快速的無 DOM 純邏輯測試。

---

## ⏱️ 預計觸發時機
- 待下一次戰情室功能重大升級、或引入更細緻的多幣別自由彈藥分配（如獨立 USD / TWD 發射庫存）時一併重構。

