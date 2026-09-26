# ADR 0147: AI 主力戰情室新手白話決策字典與自適應浮動提示視窗 (TermTooltip) 架構

- **狀態**：Accepted
- **日期**：2026-09-26
- **關聯規格**：[Spec 0147 (docs/specs/0147-ai-force-beginner-decision-glossary-and-tooltip-spec.md)](../specs/0147-ai-force-beginner-decision-glossary-and-tooltip-spec.md)
- **關聯 Issue**：[#117](https://github.com/judragon005/stock-note/issues/117)

---

## 背景與脈絡 (Context)

「AI 主力戰情室」整合了多達 18 張 Bento-Grid 量化分析卡片、頂部行情列與 5 大任務視圖。雖然具備強大的多維度即時計算與技術指標融合能力，但大量專業量化與金融術語（如 VWAP、年化漂移、Point of Control、隔日沖回檔風險、MLP 總評判等）對股市初學者與非專業交易者而言門檻極高。

使用者核心痛點：
1. **看不懂專業術語**：不理解指標在真實世界代表什麼意思。
2. **不知道如何做交易決策**：看到數值後不知道「到底該買還是該賣」。
3. **缺乏即時個股診斷**：指標缺乏與當前股票現價與歷史狀態的結合評估。
4. **既有浮動元件造成版面抖動與遮擋**：傳統 Tooltip 容易導致周圍 flex/grid 容器跳動，或在螢幕邊界被切斷遮蔽。

---

## 決策內容 (Decisions)

1. **單一真實來源字典庫 (`src/constants/aiForceGlossary.ts`)**：
   - 全盤收錄 30+ 個關鍵金融與量化指標，統一定義 `GlossaryEntry` 介面。
   - 強制規範「三段式直觀結構」：
     - **【💡 白話比喻】**：以日常生活概念解釋本質（例如：主力成本是「批發大老闆進貨的底牌進價」）。
     - **【📊 指標含義】**：說明統計與物理計算原理。
     - **【🎯 買賣操作指引】**：明確劃分「🟢 偏多買訊」、「🔴 偏空賣訊」與「🟡 觀望警戒」，新手一目了然。
   - 提供 5 大純函式動態診斷器（`diagnoseMainForceCost`、`diagnoseDayTradeRisk`、`diagnoseForecastCone`、`diagnoseBullBearEnergy`、`diagnoseHealthScore`），依據當前個股數據即時穿透計算專屬白話診斷。

2. **自適應防抖動浮動元件 (`src/components/common/TermTooltip.tsx`)**：
   - **零依賴與極簡 (Zero Dependency & KISS)**：不引入外部大型浮動庫，純 CSS 與 React 原生處理。
   - **防版面跳動 (Anti-Layout-Shift)**：外層 Trigger 設為 `display: 'inline-flex'`、`position: 'relative'`，浮動 Popup 設為 `position: 'absolute'`，嚴禁動態插入 block 元素引起周圍 flex/grid 容器重排。
   - **邊界自動翻轉 (Auto-Placement & Smart Flip)**：透過 `calculateTooltipPlacement` 純函式，當靠近視窗頂部（`< 260px`）時自動向下翻轉；當靠近視窗右側邊界時靠右對齊向左展開，徹底杜絕畫面被截斷。
   - **行動裝置與鍵盤親和力**：支援滑鼠懸停（Hover）、點擊鎖定（Click / Tap）與 ESC 鍵 / 外層點擊關閉。

3. **全模組無死角覆蓋 (Full-Surface Coverage)**：
   - 頂部行情 Bar（開、高、低、收、量、筆數）。
   - Row 1 至 Row 4 共 18 張卡片之關鍵標題、技術數值、環形儀表與動態信號。
   - 底部 5 大任務視圖切換標籤。

---

## 後果與影響 (Consequences)

- **正面效益**：
  - 股市新手無論將滑鼠停在任何卡片或指標上，均能立即取得三段式易懂說明與具體買賣指示。
  - 動態數值診斷讓提示不僅是靜態字典，更能針對當前持股風險提供量身定制的建議。
  - 原生自適應演算法確保在高解析度螢幕或窄版視窗下均無遮擋、無抖動。
  - 全量 139 個測試檔、1169 項測試 100% 綠燈通過，TypeScript 0 型別錯誤。
- **後續維護**：
  - 若未來新增第 19 張或新型量化指標卡片，只需在 `aiForceGlossary.ts` 註冊 ID，即可直接在卡片呼叫 `<TermTooltip termId="...">` 復用。
