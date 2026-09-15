# 01 — 修復現存同步腳本已知問題與防禦性強化 (Fix Current Sync Bugs & Defense Hardening)

**What to build:**
修復使用者在執行手動測試時遇到的錯誤與阻礙：
1. 修復 `scripts/market-sync/sync-tw-market.cjs` 中 TPEx T86 API 網址路徑拼寫錯誤（修正為 `daily_trade` 並加上 `&o=json`），並對齊櫃買中心官方 24 欄位三大法人解析。
2. 增強 `fetchJson` 容錯：檢查 HTTP 狀態碼，攔截非 200/302 Redirect，拒絕對空 Body 進行 `JSON.parse`。
3. 加入「盤中非開市/未結算友善提示」：若當日盤後尚未結算，顯示清晰提示，避免誤判為同步崩潰。
4. 修復 `scripts/market-sync/setup-windows-task.bat` 中引發 cmd 游標跳行之字元，確保文字輸出乾淨無誤。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] 修正 `scripts/market-sync/sync-tw-market.cjs` 的 TPEx T86 請求路徑為 `daily_trade` 並補上 `o=json`
- [x] 在 `fetchJson` 中加入 HTTP statusCode 檢查與空字串防禦
- [x] 支援盤中未結算時的提示與防禦性攔截
- [x] 修復 `setup-windows-task.bat` 的輸出編碼與字元
