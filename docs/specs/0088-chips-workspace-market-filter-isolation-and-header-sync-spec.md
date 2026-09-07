# PRD-0088: 籌碼工作區市場篩選嚴格隔離與 Header 導覽列雙向同步規範 (Chips Workspace Market Filter Isolation & Header Sync Spec)

- **狀態**: 已核准 (Approved)
- **版本**: v8.8.0
- **日期**: 2026-09-07
- **優先級**: P0
- **對應 ADR**: [docs/adr/0088-chips-workspace-market-filter-isolation-and-header-sync.md](../adr/0088-chips-workspace-market-filter-isolation-and-header-sync.md)

---

## 1. 背景與核心痛點 (Background & Problem Statement)

1. **Header 與 ChipsWorkspace 狀態脫鉤 (Props Missing & Desynchronization)**：
   - 頂部導覽列（Header）具備全域市場篩選器（`全部市場 | TW 台股 | US 美股`，由 `currentMarket` 驅動），然而 `App.tsx` 在渲染 `ChipsWorkspace` 時**未傳入任何市場篩選 Props**。
   - 使用者在頂部點選「US 美股」，籌碼工作區完全收不到通知，內部仍保持預設的 `'ALL'`。
2. **焦點模式下市場按鈕隱蔽導致混雜 (UI Condition Bug)**：
   - `ChipsWorkspace.tsx` 中的市場篩選器寫上了 `{viewMode === 'PORTFOLIO' && (`，導致使用者一切換至【全市場法人焦點 Top 30】模式時，市場篩選器直接在畫面上消失。
   - 當內部維持 `'ALL'` 模式時，系統自動將台股 Top 20 與美股 Top 10 混雜回傳，導致使用者「選擇了美股市場，結果呈現的除了美股以外，還有台股」。

---

## 2. 解決方案設計 (Solution Design)

### 2.1 介面協定擴充與雙向同步 (`ChipsWorkspaceProps`)
- 擴充 `ChipsWorkspaceProps`：
  ```ts
  export interface ChipsWorkspaceProps {
    holdings: HoldingPosition[];
    colorTheme: ColorThemeMode;
    usdToTwdRate: number;
    market?: 'ALL' | MarketType;
    onMarketChange?: (market: 'ALL' | MarketType) => void;
  }
  ```
- 在 `App.tsx` 傳入：
  ```tsx
  <ChipsWorkspace
    holdings={holdings}
    colorTheme={colorTheme}
    usdToTwdRate={usdToTwdRate}
    market={currentMarket}
    onMarketChange={setCurrentMarket}
  />
  ```
- 在 `ChipsWorkspace.tsx` 內部，以 `effectiveMarket = market ?? internalMarketFilter` 作為單一事實來源 (SSOT)，當內部點擊按鈕時觸發 `onMarketChange?.(m)`，達成 Header 與工作區完美雙向同步。

### 2.2 常駐顯示市場篩選按鈕 (Universal Visibility)
- 徹底移除 `{viewMode === 'PORTFOLIO' && (` 的條件包裹，使【全部 | 台股 | 美股】在「在庫持倉」與「全市場焦點」兩種視圖下**永遠常駐可見與可點擊**。

### 2.3 嚴格市場隔離邏輯 (Strict Market Isolation)
- **美股 (`US`)**：
  - 在庫持倉：嚴格只保留 `h.market === 'US'`。
  - 全市場焦點：嚴格只返回 `US_FOCUS_LIST`，**100% 絕對零台股**。
- **台股 (`TW`)**：
  - 在庫持倉：嚴格只保留 `h.market === 'TW'`。
  - 全市場焦點：嚴格只返回 `twItems` (台股三大法人買賣超 Top 30)，**100% 絕對零美股**。
- **全部 (`ALL`)**：
  - 在庫持倉：保留全部在倉股票。
  - 全市場焦點：均衡返回台股 Top 20 + 美股 Top 10。

---

## 3. 驗收標準 (Acceptance Criteria)

- [ ] **AC-1**: 當 Header 切換為「US 美股」時，`ChipsWorkspace` 自動同步為美股模式。
- [ ] **AC-2**: 在【全市場法人焦點 Top 30】模式下，當市場篩選為「美股」時，畫布上的標的 100% 均為美股，無任何台股。
- [ ] **AC-3**: 當市場篩選為「台股」時，畫布上的標的 100% 均為台股，無任何美股。
- [ ] **AC-4**: 【全市場法人焦點 Top 30】視圖下，市場篩選器（全部/台股/美股）常駐可見且可點擊切換。
- [ ] **AC-5**: 全套單元測試 100% 綠燈，TypeScript 0 錯誤。
