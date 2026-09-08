# Ticket #3: 增強持倉訊號膠囊展示肌肉書僮箱子戰術 (HoldingSignalCapsules Integration)

- **狀態**：`CLOSED`
- **標籤**：`ready-for-agent` · `UI` · `HoldingSignal` · `MuscleBooker` · `Indicators`
- **關聯 PRD**：[docs/specs/0095-macro-war-room-stress-matrix-ui-integration-spec.md](../../../docs/specs/0095-macro-war-room-stress-matrix-ui-integration-spec.md)
- **優先級**：`P2`

---

## 1. 任務目標
1. 擴充 `src/components/common/HoldingSignalCapsules.tsx`：
   - 支援肌肉書僮箱子狀態標籤（如 `箱頂突破`、`跌破箱底`、`底穿上反轉`）。
   - 支援均線扣抵提示（如 `MA20 扣低翻揚`、`MA20 扣高下彎`）。

## 2. 驗收標準
- [x] 標籤色彩與既有膠囊風格完全一致。
- [x] 單元測試通過。
