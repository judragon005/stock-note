# 07 — 三級防守矩陣進化──ATR 移動防守線停利連動 (ATR Trailing Stop TDD)

**What to build:**
活化現行引擎中未被調用的 `calculateAtrTrailingDefense`，為波段持股建立移動停利保護：
1. 在持股決策評估中納入 `atr.trailingDefensePrice`：
   - 當標的波段漲幅已拉開（如在倉獲利中），若收盤價跌破 `trailingDefensePrice`：
   - 強制發布停利警報：`SELL: 🔴 建議賣出 (跌破 ATR 移動防守線，獲利了結)`。
   - 停利點位精確指向 `trailingDefensePrice`。
2. 撰寫單元測試覆蓋「持股衝高回落跌破 2.5 倍 ATR 觸發移動停利」情境。

**Blocked by:** Ticket 06

**Status:** open

- [x] 在 `evaluateMuscleBookerAction` 整合 `atrTrailingDefensePrice` 參數
- [x] 當現價跌破 ATR 移動防守價時觸發波段停利賣出訊號
- [x] 動作徽章標示 `🔴 建議賣出 (ATR移動停利)`
- [x] 編寫單元測試驗證波段獲利持股跌破移動防守線時正確輸出賣出動作

