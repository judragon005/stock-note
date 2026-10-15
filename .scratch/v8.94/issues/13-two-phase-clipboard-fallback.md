# Ticket 13: 實作兩階段安全剪貼簿複製器與失敗降級機制 (Clipboard Fallback)

## 1. 任務目標
在 `WarRoomPromptCard.tsx` 中封裝高度健壯的剪貼簿複製函式：
- 第一階段：優先使用現代非同步 `navigator.clipboard.writeText(text)`。
- 第二階段：若遭遇瀏覽器安全限制、非焦點或非 HTTPS 環境拋錯，自動降級調用隱藏 textarea 之 `document.execCommand('copy')`。
- 第三階段：若降級依然被瀏覽器阻擋，主動開啟全選彈窗或文字框，引導使用者按 `Ctrl+C`。

## 2. 修改範圍
* `src/components/aiForceDashboard/WarRoomPromptCard.tsx`:
  - 實作 `safeCopyToClipboard(text: string): Promise<boolean>`。
  - 捕獲所有可能之例外，杜絕未處理的 Promise Rejection。

## 3. 驗收標準 (AC)
- [ ] 模擬 `navigator.clipboard` 拋錯時，能無縫降級成功複製。
- [ ] 絕不因剪貼簿權限問題引發 React 渲染崩潰或白屏。
