# 15 — Holdings Table & Financial Forensic Modal Integration

**What to build:**
建立完整的 `FinancialForensicModal.tsx` 主彈窗，整合 Layer 1 ~ Layer 3 三層漸進式架構，並在持倉清單（`HoldingsTable.tsx`）與個股分析入口新增「📊 財報穿透」按鈕。點擊後觸發按需載入（先讀 IndexedDB，未命中才發起 API 請求），呈現平滑的載入骨架屏與完整的財報戰情室。

**Blocked by:** 02-indexeddb-storage-and-financial-store.md, 12-financial-forensic-modal-layer1-executive-ui.md, 13-financial-forensic-modal-layer2-trend-matrix-ui.md, 14-financial-forensic-modal-layer3-deep-audit-ui.md

**Status:** done

- [x] 實作 `FinancialForensicModal.tsx` 整合彈窗（支援 ESC 鍵關閉與外部遮罩關閉）
- [x] 在 `HoldingsTable.tsx` 標的操作區新增「📊 財報穿透」按鈕
- [x] 整合按需非同步載入（IndexedDB 快取優先，背景靜態補齊）
- [x] 整合測試驗證從持倉點擊開啟彈窗、切換標的、快取命中與完整關閉流程
