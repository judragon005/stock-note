# 11 — 處置效應量化指標引擎 (Disposition Effect Engine: PGR/PLR & Holding Days)

**What to build:**
實作純函數交易心理計算模組 `src/engine/behavioralAuditEngine.ts`。統計使用者歷史所有已實現平倉批次與當前浮動虧損持倉，精確計算：獲利批次的平均持有天數、虧損批次的平均持有天數、獲利實現比率 (PGR) 與虧損實現比率 (PLR)。計算處置效應偏誤指數 $\text{BiasRatio} = \text{AvgDays}_{\text{Loss}} / \max(1, \text{AvgDays}_{\text{Gain}})$，並出具評級：健康 (`<=1.5`)、輕度偏誤 (`1.5~3.0`) 或嚴重處置效應 (`>3.0`)。

**Blocked by:** 04 — 無損審計調整單分錄生成與會計相容機制 (Non-Destructive ADJUSTMENT Trade Entry)

**Status:** ready-for-agent

- [ ] 正確計算獲利與虧損平倉批次的平均持有自然天數
- [ ] 將當前未平倉之浮虧部位合理納入虧損天數計算，杜絕死抱不賣之統計失真
- [ ] 計算 PGR 與 PLR，輸出偏誤比率與對應繁體中文診斷評語
- [ ] 單元測試於 `src/engine/behavioralAuditEngine.test.ts` 驗證不同持有天數與盈虧情境之計算精確度
