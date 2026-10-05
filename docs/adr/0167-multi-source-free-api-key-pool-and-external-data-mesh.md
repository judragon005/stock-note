# ADR 0167: 多來源免費 API Key 池與外部金融資料網格架構 (Multi-Source Free API Key Pool & External Data Mesh)

## 狀態 (Status)
已採納 (Accepted) - 2026-10-05

## 背景與問題陳述 (Context & Problem Statement)
股票量化分析與決策系統依賴豐富的高頻報價、歷史日 K、三大法人籌碼、企業三大財務報表與總經指標。然而，完全依賴付費商用 API（如 FMP、FinMind 商業版）面臨成本門檻；若依賴單一免費 API Key，則在大量分析或冷啟動時經常面臨 `429 Too Many Requests` 限流中斷；同時，美股財報經常受限於第三方 API 格式不全或配額耗盡，台股除權息與董監質押亦缺乏官方管道直連與法證防禦。

## 決策 (Decision)
1. **多來源免費 API Key 池與自適應調度 (Smart Key Rotator)**：
   - 設計多 Key 輪替（Round-Robin）與配額狀態持久化（`localStorage` 加密存儲）。
   - 遭遇 `429 Too Many Requests` 時，自動觸發指數退避（Exponential Backoff，基礎 5 秒，最高 60 秒）並暫時冷卻，無縫輪替至池中下一個可用 Key。
   - 遭遇 `401 Unauthorized` / `403 Forbidden`（無效憑證）時，自動永久拉黑該 Key，並主動提示使用者更新。
   - 支援跨日配額重置（UTC/台北時間每日零時清零計數）。
   - 支援無阻斷健康探針（Health Probe）與一鍵連通性測試。

2. **SEC EDGAR 官方美股財務報表直接管線 (SEC Direct Pipeline)**：
   - 遵循 SEC 合規存取標準，自訂 User-Agent (`StockTracker/8.80 (contact@investor.local)`)，嚴格遵守每秒 10 次請求上限。
   - 透過官方 CIK 映射與 Company Facts API 直連美國 GAAP 原始數據，精準解析 16 大標準財務科目。
   - 實行雙軌備援策略：SEC 官方直連為第一優先（100% 免費且權威），FMP API Key 池作為次級備援。

3. **台股官方除權息日程與前瞻股利推算 (Corporate Action Calendar)**：
   - 對接 TWSE TWT48U 與 TPEX 官方除權除息預告 OpenAPI，每日同步至本機 Lakehouse `corporate_action_calendar` 資料表。
   - 提供持有部位之除息前瞻推算（`projectFutureDividends`）與減資/除息平盤參考價推算（`computeExDividendReferencePrice`）。

4. **董監事質押比例法證防雷 (Director Pledge Forensic Radar)**：
   - 串接台灣政府開放平臺（MOPS 董監事質押統計），每日入庫 `tw_insider_pledge_records`。
   - 深度整合至法證雷達分析引擎（`forensicRadarEngine`）：當公司董監事持股質押比例超過 50% 時，觸發紅燈高危預警並強烈扣除法證健康分（-30 分），防範董監斷頭引發流動性崩盤。

5. **FRED 總經指標與動態真實無風險利率 (Macro Sentiment & Dynamic Rf)**：
   - 串接 FRED 官方免費 API（10 年期美債殖利率 `DGS10`）與 CNN Fear & Greed 恐慌指數，同步至 `macro_sentiment_daily` 資料表。
   - 量化指標引擎（`quantMetrics.ts`）支援真實無風險利率注入（`resolveDynamicRiskFreeRate`），取代死板的固定假設（2%），實現更精確的夏普比率 (Sharpe Ratio) 計算。

## 後果與影響 (Consequences)
- **正面影響**：
  - 徹底解除單一 API Key 的 429 速率限制與單日額度耗盡瓶頸，使用者可自由擴展多把免費 Key 達成負載均衡。
  - 美股財報取得達到 100% 官方權威與零付費成本，資料覆蓋完整度大幅提升。
  - 前瞻除息與董監質押偵測強化了投資組合風險防禦力，杜絕黑天鵝與斷頭風險。
  - 本地加密隔離存儲符合零密鑰外洩安全原則（Zero Secrets）。
- **負面影響/代價**：
  - 系統架構增加了多個異質來源的資料清洗與正規化邏輯。
  - 需要在本地維護 SQLite 資料表綱要擴充及向前向後相容性。
