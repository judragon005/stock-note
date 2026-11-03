# 06 — 三級防守矩陣進化──假突破跌回箱頂防守 (Breakout Failure Defense TDD)

**What to build:**
修復「突破買進後跌回箱內卻仍判定為 HOLD 觀望」的嚴重持股防守漏洞：
1. 在 `evaluateMuscleBookerAction` 中傳入 `isHolding` 或過去持倉突破狀態：
   - 若標的先前曾突破箱頂或用戶已在倉，但當前收盤價已跌回箱頂以下（`currentPrice < (box.boxUpper ?? 0) * 0.99`）：
   - 強制發布賣出/保本警報：`SELL: 🔴 建議賣出 (假突破跌回箱內，保本離場)`。
   - 停損防守價位精確指向箱頂 `box.boxUpper`。
2. 撰寫單元測試覆蓋「突破隔日跌破箱頂」觸發保本出場邏輯。

**Blocked by:** Ticket 05

**Status:** open

- [x] 在 `evaluateMuscleBookerAction` 擴充 `isHolding?: boolean` 參數
- [x] 判定 `currentPrice < box.boxUpper * 0.99` 時觸發假突破跌回賣出訊號
- [x] 動作徽章標示 `🔴 建議賣出 (假突破保本)`
- [x] 編寫單元測試覆蓋在倉持股跌破原箱頂之防禦觸發

