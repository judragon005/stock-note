# 02 — 官方資料管線與本地快取降級 (Official Data Pipeline & IndexedDB Cache)

**What to build:**
建立台股與美股籌碼資料取得管線與本地持久化快取機制：
1. 串接台灣證交所 (TWSE) 官方開放日報 `fund/T86`，透過本地代理或 CORS 代理池單次拉取全市場三大法人進出。
2. 串接櫃買中心 (TPEx) 官方開放資料取得上櫃股票法人數據。
3. 複用 Yahoo Finance 批次日 K 線獲取美股歷史成交量與高低收價格。
4. 擴充 IndexedDB 快取表格（`chipsData`），當日請求一次即鎖定，開盤後自動檢查更新，離線狀態 100% 毫秒級秒開。

**Blocked by:** 01 — 純函數量化計算引擎與小白友善診斷器

**Status:** closed

- [x] 支援透過 `fetchWithCORSProxy` 請求 TWSE `fund/T86` 並正確解析為代碼映射表記錄
- [x] 支援櫃買中心 TPEx 官方三大法人數據請求與整合
- [x] 支援美股 Yahoo Finance 日 K 線量價資料批次拉取
- [x] 整合 IndexedDB 本地快取，具備過期時間機制（次一交易日 15:30 自動失效重抓）
- [x] 網路斷線或 API 異常時平滑降級至最後有效快取

