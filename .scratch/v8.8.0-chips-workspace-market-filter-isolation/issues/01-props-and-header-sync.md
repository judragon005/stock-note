# Issue #88-1: 介面協定擴充與 Header 雙向聯動 (Props & Header Sync)

- **標籤**: `ready-for-agent`
- **所屬版本**: v8.8.0
- **依賴任務**: 無

## 任務描述
1. 擴充 `ChipsWorkspaceProps`，加入 `market?: 'ALL' | MarketType` 與 `onMarketChange?: (market: 'ALL' | MarketType) => void`。
2. 在 `App.tsx` 中將 `currentMarket` 與 `setCurrentMarket` 傳給 `ChipsWorkspace`。
3. 在 `ChipsWorkspace.tsx` 中，使內部篩選受控連動 `market`。
4. 編寫單元測試以驗證受控市場傳入與變更回呼。

## 驗收標準
- [ ] `ChipsWorkspace` 正確響應外部傳入之 `market`。
- [ ] 內部切換觸發 `onMarketChange`。
- [ ] 單元測試通過。
