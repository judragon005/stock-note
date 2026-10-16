# ADR 0187：歷史回補端到端全生命週期超時、單日看門狗與任務取消重設控制架構決策 (ADR 0187)

## 狀態
已批准 (Approved) / 待實作 (Pending Implementation)

## 關聯規格
- [Spec 0187](file:///d:/APP/股票紀錄/docs/specs/0187-backfill-timeout-watchdog-and-cancellation-control-spec.md)
- [Spec 0184](file:///d:/APP/股票紀錄/docs/specs/0184-market-backfill-smart-skip-retry-and-eta-spec.md)
- [ADR 0184](file:///d:/APP/股票紀錄/docs/adr/0184-market-backfill-smart-skip-retry-and-eta.md)

---

## 背景與問題陳述 (Context)

在台股歷史全市場回補（250 交易日）運作過程中，發現以下系統穩定度隱患：
1. **底層 Socket 串流靜默掛起 (Silent Socket Hang)**：Node.js 原生 `http.get({ timeout })` 僅能防禦連線階段與 Response Header 抵達前的超時。一旦遠端 TWSE/TPEx 送出 Header 後在 Body 傳輸時卡死或丟包，連線永遠不會中斷，導致回補 Promise 永久掛死。
2. **缺乏單日看門狗保護**：單日包含 4 次連線，缺乏全域單日超時約束，導致一人卡死、後續 160 天全部凍結。
3. **歷史籌碼斷層造成無法略過**：2026-06-09 以前歷史日期的法人籌碼只有 670 筆（低於 2,000 筆健康門檻），導致系統強制重新進行 160 次實時連線。
4. **前端無法中斷與重設**：任務記憶體狀態卡在 `isRunning = true`，缺少取消與重設 API，使用者只能手動殺除進程。

---

## 決策內容 (Decisions)

1. **全面升級全生命週期請求超時 (Total Request Timeout)**：
   - 捨棄舊有 `http.get` / `https.get` 容易導致串流掛起之寫法。
   - 升級為 Node.js 18+ 原生 `fetch` 搭配 `AbortSignal.timeout(20000)`，保證無論在 DNS、TLS 握手、Header 還是 Body 讀取串流階段，單一請求最長 20 秒必定逾時拋錯，由外層 `retryFetch` 進行指數退避。
2. **單日執行看門狗 (Per-Date Watchdog Circuit Breaker)**：
   - 在 `runTwDateDrivenBackfill` 主迴圈中為單日 `fetchAndIngestTwDailyData` 加上 `Promise.race` 看門狗（上限 45 秒）。
   - 超時自動記錄至 `failedDates` 並流暢推進下一天，保證主進程絕不死鎖。
3. **任務取消與強制重設 API (Cancellation & Reset API)**：
   - 引入 `AbortController` 關聯當前背景回補任務。
   - Vite 中介層註冊 `POST /api/market/backfill-cancel` 與 `POST /api/market/backfill-reset` 端點，支援前端隨時安全中斷與重置狀態鎖。
4. **前端排程中心可觀測性加固**：
   - 面板提供「強制停止 / 重置」控制按鈕，並在狀態遲滯超過 60 秒時主動呈現提示。

---

## 後果評估 (Consequences)

### 正向效益 (Positive)
- 彻底根除背景任務因遠端連線靜默掛起而無限期凍結之頑疾。
- 單日超時具備熔斷隔離機制，250 天回補即便遭遇個別日期網路異常也能順暢完成剩餘天數。
- 前端獲得完整的任務控制權，無須開啟終端機即可重設狀態。

### 潛在風險與防禦 (Risks & Mitigations)
- 確保取消任務時正確關閉已開啟之 SQLite 交易（Transaction），避免殘留未提交變更。
