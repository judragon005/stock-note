# 02 — 無障礙抗邊界遮擋浮動 Tooltip 元件 (TDD)

**What to build:**
建立 `src/components/common/TermTooltip.tsx` 與單元測試 `src/components/common/TermTooltip.test.ts`：
1. 建立通用的 React 浮動元件 `TermTooltip`：
   - Props：
     - `termId`: string（對應 `aiForceGlossary` ID）
     - `entry`?: GlossaryEntry（可覆寫或直接傳入自定義條目）
     - `dynamicData`?: any（動態數值，供 `diagnose` 產生實時診斷）
     - `children`: React.ReactNode（包裹的文字或圖示）
     - `showIcon`?: boolean（是否顯示 `ⓘ` 輔助圖示，預設 false）
     - `interactive`?: boolean（是否支援行動端點擊切換，預設 true）
     - `underline`?: boolean（文字下方是否有細緻虛線底紋，預設 true）
2. 視覺與互動規範：
   - 採用半透明黑藍色高質感玻璃擬態卡片（Glassmorphism，`rgba(15, 23, 42, 0.95)`、`backdropFilter: blur(8px)`、邊框 `rgba(59, 130, 246, 0.3)`）。
   - 包含四段式清晰排版：【標題 + 英文】、【💡 白話比喻】、【📊 指標含義】、【🎯 買賣指引（多/空/警戒）】以及可選的【⚡ 當前個股實時診斷】。
   - 內部標籤高亮：🟢 多方買訊標記、🔴 空方賣訊標記、🟡 觀望警戒標記。
3. 邊界與跑版防禦（Anti-Overflow & Smart Flip）：
   - 滑鼠懸停（Hover）或點擊顯示，絕不引發外層 Layout Shift。
   - 自動偵測視窗邊界（Viewport boundary），靠右時向左平移、靠下時向上翻轉，確保不被螢幕切斷或被 Bento-Grid 卡片邊緣遮蔽。
   - 具備 `aria-describedby` 與鍵盤/無障礙存取能力。

**Blocked by:** 01-beginner-glossary-dictionary-and-evaluator-tdd

**Status:** completed

- [x] `TermTooltip` 元件支援 Hover 展開與點擊切換
- [x] 支援白話比喻、指標意義、買賣決策三段式渲染
- [x] 支援動態數據診斷文字注入
- [x] Viewport 邊界防禦與 Auto-placement 翻轉計算
- [x] `TermTooltip.test.ts` 單元測試 100% 綠燈
