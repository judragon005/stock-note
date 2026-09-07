# 0088. 籌碼工作區市場篩選嚴格隔離與 Header 導覽列雙向同步 (Chips Workspace Market Filter Isolation & Header Sync)

- **狀態**: 已核准 (Approved)
- **日期**: 2026-09-07
- **決策者**: AI 架構師與使用者
- **對應 PRD**: [docs/specs/0088-chips-workspace-market-filter-isolation-and-header-sync-spec.md](../specs/0088-chips-workspace-market-filter-isolation-and-header-sync-spec.md)

---

## 1. 背景與脈絡 (Context)

使用者在 Header 選中「US 美股」後，進入聰明錢與籌碼工作區，發現畫面依然充斥台股，且切換為全市場法人焦點時，找不到市場切換器，導致台美股混雜。

---

## 2. 決策考量 (Decision Drivers)

1. **使用者體驗一致性**：全站頂部 Header 應作為全局市場控制的權威入口，工作區必須無條件同步響應。
2. **KISS 原則**：透過 Props 傳入 `market` 與 `onMarketChange` 實現狀態提升 (State Hoisting)，由 `currentMarket` 作為 SSOT。
3. **視圖通用性**：【全部 | 台股 | 美股】篩選按鈕在在庫與全市場焦點模式下均具備明確意義，不應因切換視圖而隱藏。

---

## 3. 決策內容 (Decisions)

1. **Props 同步化**：
   - `ChipsWorkspaceProps` 增設 `market?: 'ALL' | MarketType` 與 `onMarketChange?: (market: 'ALL' | MarketType) => void`。
   - `App.tsx` 綁定 `market={currentMarket}` 與 `onMarketChange={setCurrentMarket}`。
2. **按鈕常駐化**：
   - 移除 `viewMode === 'PORTFOLIO'` 條件，市場篩選器常駐渲染。
3. **市場隔離防禦**：
   - 嚴格分離 `marketFilter === 'US'`（純美股）與 `marketFilter === 'TW'`（純台股），杜絕混雜回傳。

---

## 4. 後續影響與優點 (Consequences)

- 徹底根除 Header 與籌碼工作區狀態脫鉤問題。
- 嚴格防禦台美股市場交叉污染。
