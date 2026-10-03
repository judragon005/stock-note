# 05 — 湖倉歷史籌碼與資券 API 端點聚合輸出

**What to build:** 升級 `/api/market/history/:symbol` 端點，在單次回應中將 250 根日 K、對齊日期的三大法人買賣超與融資融券餘額完整打包輸出至前端。

**Blocked by:** 02 — 日 K 湖倉查詢 API 與前端 Loader 穿透, 04 — 591 檔融資融券全歷史 CSV 解析與入庫模組

**Status:** done

- [x] 升級中介層 history 查詢邏輯，整合 `tw_institutional_chips` 全量欄位
- [x] 升級前端 `loadSymbolFullLakehouseData` 回傳型別與映射
- [x] 撰寫整合測試驗證日 K 與籌碼/資券日期 1:1 精確對齊
