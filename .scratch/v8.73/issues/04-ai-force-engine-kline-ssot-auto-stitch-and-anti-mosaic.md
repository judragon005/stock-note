# 04 — 日 K 線圖單一真實來源 (SSOT) 防斷層自適應縫合與防拼裝

**What to build:** 重構 `aiForceDashboardEngine.ts`，當即時報價缺少開高低量時，嚴禁拿舊日 K 拼裝；在收盤後自動將即時價格無縫縫合為最新一根日 K，確保頂部看板與主 K 線圖日期與數據 100% 同步。

**Blocked by:** 01 — 執行全市場歷史 CSV 全量回補至 SQLite 本機湖倉

**Status:** done

- [x] 重構 `aiForceDashboardEngine.ts`：當即時報價缺開高低量且日期落後 > 1 天時，開高低量回傳 undefined
- [x] 當日收盤後自適應縫合：將即時真實收盤報價合流為主 K 線最後一根蠟燭
- [x] 單元測試完整覆蓋縫合、防拼裝與指標重算邏輯
