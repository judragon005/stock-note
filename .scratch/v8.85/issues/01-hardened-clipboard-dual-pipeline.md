# Ticket 01: 跨環境高容錯剪貼簿工具封裝與 Secure/Insecure Context 雙軌支援

## 關聯規格
- Spec: `docs/specs/0173-equity-deep-dive-hardened-clipboard-and-institutional-workflow-spec.md` (Story A / AC US-01, US-02, US-03)

## 問題背景
部署於 QNAP/Synology NAS 或局域網環境時，使用者透過純 HTTP IP（如 `http://192.168.1.X:3000`）訪問。瀏覽器認定為非安全上下文 (Insecure Context)，`navigator.clipboard` 被設為 `undefined`。目前代碼使用 `if (typeof navigator !== 'undefined' && navigator.clipboard)` 判定，導致 NAS 下所有複製按鈕點擊完全無反應（靜默失敗）。

## 任務細節
1. 新增 `src/utils/clipboard.ts`：
   - 封裝 `copyTextToClipboard(text: string): Promise<boolean>`。
   - 首軌：檢查 `navigator?.clipboard?.writeText`，若支援則 `await navigator.clipboard.writeText(text)`。
   - 次軌 (Fallback)：若不支援或拋出異常，動態建立隱藏 `textarea`（`style="position: fixed; left: -9999px; opacity: 0;"`），執行 `document.execCommand('copy')`。
   - 全域包覆 try/catch 防護，成功回傳 `true`，失敗安全回傳 `false`，絕不中斷應用。
2. 新增單元測試 `src/utils/clipboard.test.ts`：
   - 測試 Secure Context 下成功呼叫 `navigator.clipboard.writeText`。
   - 測試 Insecure Context（`navigator.clipboard` 為 `undefined`）下降級呼叫 `document.execCommand`。
   - 測試系統拋出 SecurityError 時回傳 `false`。

## 驗收標準
- [x] `npm test src/utils/clipboard.test.ts` 100% 通過。
- [x] 在 `navigator.clipboard` 為 `undefined` 時，降級邏輯能正常建立 textarea 並觸發 `document.execCommand('copy')`。
