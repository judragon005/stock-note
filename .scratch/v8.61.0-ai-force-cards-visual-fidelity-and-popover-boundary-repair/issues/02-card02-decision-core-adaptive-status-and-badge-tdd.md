# Ticket 02: 02 AI 決策核心狀態評估器與多態橫幅連動 (TDD)

- **Spec**: `docs/specs/0148-ai-force-cards-visual-fidelity-and-popover-boundary-repair-spec.md`
- **關聯 Issue**: #121
- **狀態**: `ready-for-agent`

## 目標
解決照片二問題：即使個股處於多頭強勢、籌碼健康度高達 85 分、隔日沖低風險，卡片 02「AI 決策核心」頂部依然固定顯示紅色 `AI WARNING` 的問題。

## 實作內容
1. 在 `src/engine/aiForceDashboardEngine.ts` 內建立決策核心狀態評估器：
   - 綜合判斷 `trendJudgement`、`chipHealthScore`、`dayTradeRiskPercent`、`mainForceAction`。
   - 偏多強勢（健康度 ≥ 70，隔日沖 < 40%）：`warningBadgeText` 賦予 `'AI BULLISH | 偏多續抱'` 或 `'AI OPTIMAL'`，狀態型別為 `'BULLISH'`。
   - 區間中性（健康度 50~69，震盪整理）：`warningBadgeText` 賦予 `'AI BALANCED | 區間震盪'`，狀態型別為 `'BALANCED'`。
   - 警戒防禦（健康度 < 50 或隔日沖 ≥ 60%）：`warningBadgeText` 賦予 `'AI WARNING | 謹慎防禦'`，狀態型別為 `'WARNING'`。
2. 在 `src/components/aiForceDashboard/cards/AiDecisionCoreCard.tsx` 中連動橫幅視覺樣式：
   - 多頭狀態：翠綠/青色漸層背景、綠色外框邊線與圖標（`🚀` 或 `✨`）。
   - 中性狀態：天藍/明黃色背景、天藍邊線與圖標（`⚡` 或 `👀`）。
   - 警戒狀態：深紅/橙紅背景、紅色警告外框與圖標（`⚠️`）。
3. 撰寫單元測試 `AiDecisionCoreCard.test.tsx` 驗證三種情境樣式與文字動態切換。

## 驗收標準 (AC)
- [ ] 多頭優質股不再顯示紅色 AI WARNING，正確呈現綠色 AI BULLISH。
- [ ] 高風險/空頭股正確呈現紅色 AI WARNING。
- [ ] 橫幅文字、圖示、背景色與邊框完全動態同步。
