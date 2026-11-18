# 技術債 0060: 深度投研彈窗借券餘額消費與卡片曜石主題 Token 集中化 (Equity Deep Dive SBL Wiring & Card Theme Token Convergence)

* **建立日期**：2026-11-18
* **狀態**：`OPEN`
* **優先級**：`P3 (Low)`
* **來源**：/code-review 雙軸審查回饋 (Spec 0237 / Issue #588)
* **標籤**：`Refactor` · `AiForceDashboard` · `Theme` · `DesignSystem` · `Lakehouse`

---

## 1. 現狀診斷與背景 (Context & Problem)

在 Spec 0237 主力戰情室 4.0 去假與湖倉接線中，已全面貫通後端 SQLite 湖倉 `/api/market/history/:symbol` 至 `AiForceDashboardView`，並成功接通 `sblBalance` (借券賣出餘額)、`marginBalanceChange` (融資日增減) 與 `pledge` (董監質押)。

但在代碼審查時識別出兩處非阻塞性之架構演進空間：
1. **`EquityDeepDiveModal` 跨模組下游消費**：`AiForceDashboardView` 在開啟 `<EquityDeepDiveModal>` 時已補齊 `candles`、`institutionalRecords`、`boxFloorPrice` 等參數，但 `EquityDeepDiveModal` 目前介面尚未把 `sblBalance` 傳遞給其內部籌碼分析子視圖。
2. **卡片深色曜石樣式集中化**：`MonthlyRevenueCard.tsx` 與 `TdccDistributionCard.tsx` 等卡片目前已重構為曜石去 Slop 樣式，但內部使用的深色邊框（`rgba(255,255,255,0.07)`）與曜石底色為局部宣告常數；若未來專案進一步支援亮色/暗色主題動態切換，可統一提煉為主題 Tokens。

---

## 2. 建議解法與演進路徑 (Proposed Solution)

1. **深度投研彈窗借券餘額下游接線**：
   - 於 `EquityDeepDiveModalProps` 新增可選欄位 `sblBalance?: number`。
   - 在主力戰情室傳入 `sblBalance={dashboardData.marketData.lakehouseSummary?.sblBalance ?? undefined}`。
   - 在深度投研的第 2 步（主力籌碼分析）中渲染借券賣出增減趨勢。
2. **曜石設計系統 Token 集中化**：
   - 於 `src/constants/designTokens.ts` 或相關主題模組定義統一的 `OBSIDIAN_CARD_CONTAINER` 樣式常數，包含 `border`、`bg` 與 `shadow`，供戰情室所有卡片集中引用。

---

## 3. 預期效益 (Benefits)

1. **跨模組資料完備性**：深度投研視圖同步具備借券放空籌碼視角。
2. **設計系統一致性**：曜石主題樣式集中管理，簡化未來主題切換時的維護成本。
