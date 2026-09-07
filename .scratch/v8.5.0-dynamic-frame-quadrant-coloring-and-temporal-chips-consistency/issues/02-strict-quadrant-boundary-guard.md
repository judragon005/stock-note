# 任務 02: 象限邊界零軸守門員 (Strict Quadrant Boundary Guard)

- **狀態**: `completed`
- **優先級**: P0
- **完成說明**: 象限判定條件收斂為嚴格 x < 0 && y > 0 才是 ACCUMULATION，零籌碼標的嚴格歸入 LIQUIDATION，杜絕誤判吸籌。
- **目標**:
  1. 在 `smartMoneyEngine.ts` 中修正象限判定條件，避免 $y = 0$ 且 $x < 0$ 時被誤判為 `ACCUMULATION`。
  2. 嚴格限定 $y > 0$ 且 $x < 0$ 才為 `ACCUMULATION`（逢低吸籌黃色）。
