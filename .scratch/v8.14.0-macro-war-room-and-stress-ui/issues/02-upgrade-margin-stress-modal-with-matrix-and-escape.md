# Ticket #2: 升級質押壓力測試彈窗支援黑天鵝矩陣與逃生指南 (MarginStressModal Upgrade)

- **狀態**：`CLOSED`
- **標籤**：`ready-for-agent` · `UI` · `Margin` · `StressMatrix` · `EscapePlan`
- **關聯 PRD**：[docs/specs/0095-macro-war-room-stress-matrix-ui-integration-spec.md](../../../docs/specs/0095-macro-war-room-stress-matrix-ui-integration-spec.md)
- **優先級**：`P1`

---

## 1. 任務目標
1. 升級 `src/components/MarginStressModal.tsx`：
   - 接入 `evaluateMarginStressMatrix` 取得 6 維標準情境矩陣。
   - 提供情境卡片快速切換（常態 -5%/-10%、重挫 -20%、黑天鵝 -30%、除權息跳水、複合黑天鵝）。
   - 呈現每檔擔保品之「130% 斷頭臨界價」與「耐受跌幅」，明確標示免疫標的。
   - 呈現「一鍵逃生雙軌救生圈」（方案 A 償還本金 / 方案 B 補繳現金擔保品 / 方案 C 增質股票）。

## 2. 驗收標準
- [x] 彈窗可流暢切換 6 維情境矩陣。
- [x] 斷頭臨界價與逃生救生圈方案清晰直觀。
