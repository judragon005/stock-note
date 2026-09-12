# 05 — Full Regression & Build Verification

**What to build:**
進行端到端全量驗收：

1. 驗證抓取台股標的（如 2327 國巨）時三大報表數據正確聚合，CFO 非 0。
2. 驗證「0 秒核心操盤結論」不再出現矛盾平穩文字，正確給出【操盤定調】與方針。
3. 驗證圖表刻度、數值膠囊、柱狀圖金額標籤清晰無破版。
4. 執行 `npm test`，確保所有 88+ 測試檔案 100% 綠燈。
5. 執行 `npm run build`，確保 TypeScript 0 錯誤、打包順利。

**Blocked by:** 04-financial-hero-layer-metric-cards-enrichment.md

**Status:** done

- [x] 端到端驗證三大報表聚合與圖表數值呈現
- [x] 全量單元測試 100% 綠燈 (88 檔案 / 870 測試)
- [x] `npm run build` 通過無報錯 (TypeScript 0 錯誤)
