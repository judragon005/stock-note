# Ticket #3: [Engine/UI] 雙軌資料源管線優先級與彈窗診斷回報

- **狀態**: Completed
- **規格書**: [SPEC-0015](../../../docs/specs/0015-corporate-action-dual-pipeline-and-rate-limiting.md)
- **架構決策**: [ADR-0015](../../../docs/adr/0015-corporate-action-dual-pipeline-and-rate-limiting.md)

---

## 任務目標 (Objective)
實作台股 TWSE 官方優先、Yahoo Finance 備援的雙軌管線，並在 `CorporateActionScannerModal.tsx` 彈窗提供清晰的數據源標記與網路診斷提示。

---

## 實作範圍 (Scope)
1. **雙軌資料源優先級 (`src/engine/corporateActionScanner.ts`)**：
   - 🇹🇼 台股：優先查詢 TWSE `TWT48U_ALL`，查無資料或需補充分割/減資時查詢 Yahoo Finance。
   - 🇺🇸 美股：查詢 Yahoo Finance。
2. **彈窗診斷與標記 (`src/components/CorporateActionScannerModal.tsx`)**：
   - 在進度條旁標註當前查詢來源（`🏛️ TWSE 官方` / `🌐 Yahoo 備援` / `⚡ 本地快取`）。
   - 若遭遇網路超時，提供明確的診斷與重新整理按鈕。

---

## 驗收條件 (Acceptance Criteria)
- [ ] 台股標的除權息優先呈現 TWSE 官方數據。
- [ ] 彈窗即時回報當前數據源與診斷狀態。
- [ ] 全量測試保持 100% 通過。
