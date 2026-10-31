# 03 — Layer 7 雙欄平衡對齊與全視圖回歸驗證

**What to build:**
驗證並微調 Layer 7 雙欄（左側 15+09，右側 11+16+17）在各解析度下的視覺高度平衡與無疊字表現：
1. 確保 Card 11（健康度綜合評估表）在 ~480px 寬度下 5 個圓環百分比與下方標籤完全舒展、零文字折行或重疊。
2. Card 16（買賣力分布）與 Card 17（多空強度分布）在 Card 11 下方緊密配合，使右欄高度與左欄（15 籌碼摘要 + 09 隔日沖風險）達到視覺等高齊頭。
3. 執行全量 `npm test` 與 `npm run build`，確保 TypeScript 0 錯誤、全數單元測試 100% 通過。

**Blocked by:** 02 — Card 18 主力追蹤總評判滿版橫展與響應式雙欄 Playbook 優化

**Status:** ready-for-agent

- [ ] 驗證 Card 11 五維圓環百分比標籤在各解析度下無疊字瑕疵。
- [ ] 調整 Layer 7 左右兩欄之 flex/gap 配比，確保高度均衡一致。
- [ ] 執行 `npm test` 與 `npm run build`，確認無回歸錯誤。

