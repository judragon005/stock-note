# 0224 ADR: Zavy 慢富模組代碼氣味清理、測試職責解耦與智策提示詞技術債閉環 (Technical Debts 0057 & 0048 Resolution)

## 狀態 (Status)
`ACCEPTED` (2026-11-12)

## 背景 (Context)
在專案演進至 v9.16.2 後，為維持卓越的代碼衛生與領域一致性，經盤點與調研識別出以下技術債：
1. **技術債 0057**：
   - `src/components/zavy/ZavyMacroCompassCard.test.tsx` 匯聚了過多無關卡片的測試邏輯，產生 Divergent Change 測試氣味。
   - `ZavySlowWealthWorkspace.tsx` 直接在元件渲染層撰寫股息活水運算，產生 Feature Envy。
   - Markdown 導出報告中，信用雷達的風險等級未中文化（仍顯示英文枚舉）。
2. **技術債 0048**：
   - 早期提案將財報數據注入智策提示詞事實清單，此功能已在 Spec 0181/0195/0196/0197 隨提示詞遷移至戰情室適配器 `aiForcePromptAdapter.ts` 完整落地，但技術債看板未同步，且董監質押率可進一步安全補全。

## 決策 (Decision)
1. **股息純函式下沉**：
   - 在 `src/engine/zavySlowWealthEngine.ts` 實作 `estimateHoldingsAnnualDividendsTwd(holdings, usdToTwdRate)`。
   - 保留防禦性 4.5% 底標、已平倉過濾與美股匯率換算機制，並在 `zavySlowWealthEngine.test.ts` 加入專屬極限測試。
2. **信用雷達標籤中文化**：
   - 新增 `formatCreditRiskLevelLabel` 函式，將信貸風險轉換為中文（`低風險穩健`、`偏高警戒`、`高風險承壓`、`極端危急`），應用於 Markdown 導出。
3. **測試檔案物理拆分**：
   - 將 `ZavyMacroCompassCard.test.tsx` 拆分為四個獨立測試：
     - `ZavyMacroCompassCard.test.tsx`
     - `ZavySlowWealthWorkspace.test.tsx`
     - `ZavyMarketBreadthCard.test.tsx`
     - `ZavyDualTrackDecisionCard.test.tsx`
4. **技術債看板同步**：
   - 更新 `docs/debts/README.md`，將 0057 與 0048 正式標記為 `RESOLVED`。

## 後果 (Consequences)
- **正面效益**：
  - Zavy 模組實現 100% 職責單一化，測試結構清晰，避免任何跨卡片改動相互牽連。
  - 金融會計計算下沉至純函式，具備獨立測試保護，零 React 生命週期副作用。
  - 產出的 Markdown 慢富報告達到全中文領域語言一致性。
  - 待處理技術債減少 2 項，系統技術債庫存進一步淨化。
- **潛在權衡**：
  - 測試檔案數量增加 3 個，但單檔行數大幅收斂，整體維護負擔顯著降低。

