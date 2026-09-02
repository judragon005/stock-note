# Issue 03: 多維色彩膠囊標籤與互動 Tooltip 元件 (Holding Signal Capsules UI Component)

- **狀態**：`COMPLETED`
- **優先級**：`P1`
- **對應規格**：[docs/specs/0067-holding-technical-signal-capsules-and-action-advisor-spec.md](../../../docs/specs/0067-holding-technical-signal-capsules-and-action-advisor-spec.md)
- **標籤**：`ready-for-agent` · `UI` · `Components` · `TDD`

---

## 1. 任務目標
1. 實作 `src/components/common/HoldingSignalCapsules.tsx`：
   - 接收 `signals: HoldingSignal[]` 與 `directive?: HoldingActionDirective`。
   - 依照 4 種色調（BULLISH 翡翠綠、BEARISH 亮紅、WARNING 琥珀黃、NEUTRAL 沉穩藍紫）精確渲染藥丸膠囊（Pill Capsules）。
   - 膠囊點擊或懸浮時，透過通用 `Tooltip` 呈現詳細數值與計算邏輯。
   - 支援四字定調徽章（如 `【強勢續抱】`）與點擊展開操作指引。
2. 撰寫 `src/components/common/HoldingSignalCapsules.test.tsx` 進行單元與渲染測試。

---

## 2. 驗收標準
- [ ] `HoldingSignalCapsules.test.tsx` 測試通過。
- [ ] 色彩對比度符合無障礙設計規範，深色模式下清晰美觀。
- [ ] 空訊號時優雅不渲染或展示佔位提示。
