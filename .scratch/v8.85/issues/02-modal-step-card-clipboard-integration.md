# Ticket 02: 投研彈窗與單步卡片整合新剪貼簿工具與狀態反饋防禦

## 關聯規格
- Spec: `docs/specs/0173-equity-deep-dive-hardened-clipboard-and-institutional-workflow-spec.md` (Story A / AC US-01, US-02, US-03)

## 問題背景
現有 `EquityDeepDiveModal.tsx` 與 `EquityDeepDiveStepCard.tsx` 存在分散的脆性剪貼簿呼叫，在 NAS 環境下完全無響應，使用者不知道操作是否成功。

## 任務細節
1. 修改 `src/components/equityDeepDive/EquityDeepDiveModal.tsx`：
   - 引入 `copyTextToClipboard`。
   - `handleCopyAll` 改為非同步函式，調用 `copyTextToClipboard(report.fullPayloadPrompt)`。
   - 若回傳 `true`，切換按鈕文字為 `✓ 已複製全量 7 步 Prompt` 並顯示綠色 Toast。
   - 若回傳 `false`，彈出警示 Toast（`⚠️ 瀏覽器限制自動複製，請手動選取文字複製`），徹底杜絕靜默失效。
2. 修改 `src/components/equityDeepDive/EquityDeepDiveStepCard.tsx`：
   - 引入 `copyTextToClipboard`。
   - `handleCopy` 改為非同步調用，複製當前步驟 prompt。
   - 成功切換為已複製狀態圖示。

## 驗收標準
- [x] 執行單元測試 `EquityDeepDiveModal.test.ts` 100% 通過。
- [x] 模擬 Insecure Context 時點擊「一鍵複製全量 Prompt」依然能成功觸發複製並跳出 Toast。
