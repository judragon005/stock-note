# 01 — Modal Floating & Overlay Styling Refactor

**What to build:**
重構 `src/components/financial/FinancialForensicModal.tsx`。
將失效的 Tailwind classes 替換為標準的原生 Inline Styles 與 CSS Variables（對齊 `OmniTechnicalInspectorModal.tsx`）。

1. 遮罩層：`position: fixed, inset: 0, zIndex: 9999, backgroundColor: rgba(0, 0, 0, 0.8), backdropFilter: blur(8px), display: flex, alignItems: center, justifyContent: center`。
2. 彈窗本體：`maxWidth: 1080px, maxHeight: 92vh, backgroundColor: var(--bg-card, #0f172a), border: 1px solid rgba(59, 130, 246, 0.3), borderRadius: 16px`。
3. 頂部 Header、強制刷新、關閉按鈕與滾動區域原生排版。
4. 載入中（Loading）與錯誤（Error）狀態的原生居中與按鈕樣式。

**Blocked by:** None

**Status:** done

- [x] 移除 Tailwind classes，改以標準 Inline Styles 與 CSS 變數精準定位
- [x] 遮罩具備 `zIndex: 9999` 與全螢幕置中
- [x] 支援點擊遮罩外部與 ESC 鍵退出
- [x] 單元測試 `FinancialForensicModal.test.ts` 保持綠燈
