# 02 — 單一權威資產分類器 (resolveAssetClass)、名稱解析參數校正與雙市場結算時區引擎

**Parent:** #592 (Spec 0239)
**What to build:** 廢除專案內 3 套互相衝突的 ETF 判斷實作，收斂為單一權威資產分類器 `resolveAssetClass`（優先信任 `symbols_meta.type === 'ETF'`，其次嚴格台股 ETF 代碼規則與擴充美股主流 ETF 白名單，徹底移除誤殺金融股之名稱正則）；修正標的名稱解析調用契約避免未收錄標的名稱變成 `'TW'` 或 `'US'`；全面修正市場結算與新鮮度服務的美股時區/週末凌晨/DST/休市日與空資料庫判定，並確保美股日 K 入庫日期嚴格以美東交易日格式化。
**Blocked by:** 01 — 單例快取中介層、含點號代碼路由 (BRK.B)、財報雙向欄位契約與 meta 復用
**Status:** ready-for-agent

- [ ] `resolveAssetClass` 正確將 `2881 富邦金`、`2882 國泰金`、`8454 富邦媒`、`2501 國泰建` 判定為個股 (`STOCK`)，並將 `0050`、`00403A`、`00981A`、`00679B`、`VT`、`VOO`、`SPY`、`QQQ`、`SCHD`、`TLT`、`GLD`、`XLE` 等判定為 `ETF`；報表引擎與提示詞轉接器共用同一分類器，分類結果 100% 一致。
- [ ] 查詢未收錄於靜態字典的標的時，名稱依序回退為 `meta.name` 或標的代碼本身，絕不顯示 `'TW'` 或 `'US'`。
- [ ] 台北時間週日/週一 `00:00~07:59` 查詢美股結算狀態回傳 `isSettled: true`；美東盤中時段回傳 `isTradingHours: true` 與 `isSettled: false`；午夜 `00:00~00:59` 不受 ICU `hour=24` 影響。
- [ ] 美股新鮮度服務以 `America/New_York` 自動處理夏冬令 DST 並查核休市日曆；當本地湖倉為空（`twLatest === null`）時回傳 `isStale: true`；美股日 K 入庫日期不因本機 UTC+8 時區偏移至隔日。
