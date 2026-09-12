## 問題描述
在持股時間軸點擊「📑 財報穿透」按鈕無任何反應。
經排查，因 `FinancialForensicModal` 與三個子圖層誤用 Tailwind CSS class，而本專案為原生 Vanilla CSS 架構，導致 Modal 缺乏 `position: fixed` 掉落至 DOM 最底部，視覺上完全無反饋，且內部圖表與卡片樣式嚴重破版。

## 解決方案
1. 將 `FinancialForensicModal.tsx` 與 `FinancialHeroLayer.tsx`、`FinancialTrendsLayer.tsx`、`FinancialForensicDeepAuditLayer.tsx` 全面重構為原生 Inline Styles 與 CSS Variables。
2. 遮罩設定 `position: fixed; inset: 0; zIndex: 9999; backdropFilter: blur(8px)` 支援置中彈出與 ESC / 外部點擊關閉。
3. 保持既有輔助函式簽章以通過單元測試。
4. 在 `HoldingsTable.tsx` 增強點擊日誌追蹤。
5. 驗證全量測試與構建。

參見規格文檔：`docs/specs/0124-financial-forensic-modal-styling-and-activation-repair-spec.md`
