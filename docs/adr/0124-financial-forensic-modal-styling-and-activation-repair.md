# ADR 0124: 穿透式財報深度戰情室浮動彈窗樣式修復與原生化架構決策 (Financial Forensic Modal Styling & Native Inline Architecture)

## 狀態 (Status)

Accepted (已採納並實作完成)

## 背景與問題脈絡 (Context & Problem Statement)

在 Spec 0123 實作完成穿透式財報分析儀後，使用者在持股時間軸點擊「📊 財報穿透」按鈕時反映完全沒有反應。
經排查，`FinancialForensicModal` 及其 3 個子圖層元件誤套用了 Tailwind CSS classes（如 `fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm`），然而本專案為原生 Vanilla CSS + CSS Variables 架構（從未引入 Tailwind CSS 編譯器）。
這導致 Modal 最外層容器缺乏 `position: fixed` 與 `z-index`，被瀏覽器渲染在整份 HTML 頁面最底部，造成視覺上按鈕「毫無反應」，且內部所有圖表與卡片呈現未排版的崩潰狀態。

## 決策方案 (Decision Drivers & Considered Options)

1. **選項 A：在專案中安裝 Tailwind CSS 與 PostCSS**
   - *劣勢*：引入龐大相依套件、增加 build 負擔，破壞全專案維持一致的原生 Vanilla CSS + Inline Style 輕量架構，違反 KISS 原則與免費額度約束。
2. **選項 B（採納）：全面重構為原生 Inline Styles + CSS Variables（對齊 `OmniTechnicalInspectorModal.tsx` 標準）**
   - *優勢*：零外部相依、極致輕量、確保彈窗具有最高層級 `zIndex: 9999` 與全螢幕置中毛玻璃遮罩；同時精確支援紅綠與國際色彩主題切換。

## 決策成果 (Consequences)

- **正面效益**：
  - 點擊持股時間軸「📊 財報穿透」按鈕立即浮起深色毛玻璃彈窗，支援 ESC / 外圍遮罩點擊關閉。
  - 三層架構（Layer 1 0 秒戰報與四大體質燈號、Layer 2 8 季三率折線 SVG 與杜邦矩陣、Layer 3 逆向鑑識排雷與會計師標章）排版清晰無破版。
  - 保留所有輔助函式簽章，既有 88 個測試套件、867 個測試 100% 通過。
  - `npm run build` TypeScript 零錯誤且成功產出 Bundle。
- **後續防禦**：
  - 未來任何新彈窗或 UI 模組一律禁止引入 Tailwind classes，一律嚴格遵循專案之 Vanilla CSS + Inline Style 設計系統。
