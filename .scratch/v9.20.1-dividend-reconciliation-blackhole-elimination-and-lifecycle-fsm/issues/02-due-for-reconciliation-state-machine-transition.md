# 02 — 根除時序黑洞：發放日已過待核對狀態機結轉 (Due-for-Reconciliation State Machine Transition)

**What to build:**
徹底根除發放日已過導致款項憑空消失的「時序黑洞」。在 `ReceivableDividendStatus` 擴充 `DUE_FOR_RECONCILIATION` 狀態；重構 `calculateReceivableDividends` 時序截斷判斷：當當前日期晚於官方發放日（`currentDateStr >= payDate`）且交易帳本 `trades` 中尚未存在該筆已確認之 `DIVIDEND` 紀錄時，嚴禁物理刪除丟棄，而是自動標記為 `DUE_FOR_RECONCILIATION` 並保留在應收股利清單中，使 0056 等款項在除息與發放後隨時處於系統雷達視野中。

**Blocked by:**
01 — 官方除息常態庫擴充與在席持股快照容錯防禦 (Official Calendar Expansion & Safe Snapshot Fallback)

**Status:** done

- [x] 於 `src/types/dividend.ts` 的 `ReceivableDividendStatus` 新增 `'DUE_FOR_RECONCILIATION'` 狀態定義。
- [x] 重構 `src/engine/receivableDividendEngine.ts` 中的 `calculateReceivableDividends`：移除 `if (currentDateStr >= payDate) continue;` 之物理丟棄邏輯，改為依據 `trades` 存在性賦予 `DUE_FOR_RECONCILIATION` 狀態。
- [x] 確保若交易帳本已存在對應除息紀錄，維持安全去重跳過，嚴防雙重記帳。
- [x] 撰寫單元測試模擬當前時間為 2026-11-14（晚於 0056 發放日 2026-11-11），驗證 0056 正確回傳為 `DUE_FOR_RECONCILIATION` 且金額與除息股數健全。
