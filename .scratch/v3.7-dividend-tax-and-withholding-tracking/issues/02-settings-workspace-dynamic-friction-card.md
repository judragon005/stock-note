# Ticket #2: [UI/Settings] 設定工作區頂部摩擦看板之市場動態響應股息稅負發光卡片

- **狀態**: Completed
- **分流標籤**: `ready-for-agent`
- **規格書**: [SPEC-0020](../../../docs/specs/0020-dividend-tax-and-withholding-tracking.md)
- **架構決策**: [ADR-0020](../../../docs/adr/0020-dividend-tax-and-withholding-tracking.md)

## 任務清單
- [x] 在 `src/components/SettingsWorkspace.tsx` 的頂部摩擦指標看板中新增「股息摩擦稅負」發光卡片。
- [x] 整合市場切換狀態：
  - 當切換至台股 (`TW`) 時：呈現「累計二代健保補充保費」卡片（金額 `NT$ {totalTWDividendTax}`，副標註記「單筆達 2 萬課 2.11%」）。
  - 當切換至美股 (`US`) 時：呈現「美股 30% 股息預扣稅」卡片（金額 `$ {totalUSDividendTax} USD`，副標註記折合台幣與 IRS 30%）。
  - 當為全部市場 (`ALL`) 時：呈現「除權息摩擦稅負總計」卡片（主金額折合台幣，副標清楚標註台股健保與美股預扣雙明細）。
- [x] 維持玻璃擬態 (Glassmorphism) 與既有 4 大發光卡片一致之佈局美學。
