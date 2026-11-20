# T05: DynamicSignalsCard.tsx 三層純展示子元件拆解 (Debt 0049)
- 關聯 Issue: #596 / Spec 0241 / Debt 0049
- 目標檔案: `src/components/aiForceDashboard/cards/DynamicSignalsCard.tsx`, `src/components/aiForceDashboard/cards/dynamicSignals/*`
- 驗收: 抽離 `DynamicSignalsScoreBar`、`DynamicSignalsRegulatoryLayer`、`DynamicSignalsTacticalAdvice`，主檔 `<= 150` 行，匯出與測試 100% 不變。
