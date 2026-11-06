# ADR 0219: 台美股機構級深度財報研究與實戰投資決策系統架構 (Institutional Equity Research & Decision System Architecture)

## 狀態 (Status)
**已接受 (Accepted)** - 關聯 Issue #449 (對應 Spec 0219)

## 上下文與問題陳述 (Context & Problem Statement)
目前「個股分析（深度財報）」頁面在完成 Spec 0202 的資料治理後，雖解決了假資料與導航碎裂問題，但面向買方資產管理、專業分析師與實戰投資者時，仍存在關鍵瓶頸：
1. **只陳述表面數據，未穿透「財報沒說什麼」**：缺乏本業純度（營業利益 vs 業外損益）拆解、營運槓桿係數 (DOL) 轉折、以及營收成長加速度（$\Delta \text{YoY}$）。投資人無法一眼洞察獲利暴衝是否來自一次性處分資產，也無法識別成長動能已悄然見頂。
2. **估值模型停留在正向假設，未回答「現價是否已反映公司的好」**：現有 DCF 模型僅支援正向推導，容易流於主觀通靈。投資人迫切需要反向推導的「Reverse DCF（現價隱含 FCF 成長率）」與 Bull/Base/Bear 三情境安全邊際矩陣，客觀評估市場定價是否過度透支樂觀預期。
3. **資料庫存在嚴重資料孤島 (Data Silos) 與契約斷裂**：本地 SQLite 數據湖倉已完整入庫近 12 個月營收 (`tw_monthly_revenue`)、官方每日 PE/PB/殖利率 (`tw_valuation_daily`)、董監持股質押 (`tw_insider_pledge_records`)、官方產業分類 (`symbols_meta`) 與真實日 K 收盤價 (`daily_candles`)。但深度財報頁面完全未連通這些寶藏表，且因中介層回傳結構與前端 `Array.isArray` 契約不符，導致本地湖倉快取讀取 100% 失效，頻繁引發外部 API 限流與白畫面。
4. **資訊分散，缺乏買方機構級 Executive Summary 與決策閉環**：缺少結論先行的總覽面板、100 分制 8 維度透明評分、實戰買進觀察區與論點失效條件；且非結構化質化資訊（法說會展望、預期差 Beat/Miss、反方紅隊挑戰）無法與本地量化數據協同閉環。

## 架構決策 (Decision Drivers & Architecture)

1. **修復湖倉讀取契約與貫通五大數據孤島 (Lakehouse-First & Contract Repair)**：
   - 修正 `lakehouseFinancialClient` 中的 JSON 解析相容性，徹底修復本地 SQLite 財報快取讀取失敗的缺陷。
   - 透過專案既有 `loadSymbolFullLakehouseData` 並行提取月營收 (`tw_monthly_revenue`)、官方估值 (`tw_valuation_daily`)、董監質押 (`tw_insider_pledge_records`)、產業分類 (`symbols_meta`) 與日 K 線 (`daily_candles`)。
   - 將日 K 歷史收盤價序列傳入河流圖，繪製真實歷史股價紅線。
2. **財報歷史深度擴充至 12 季與 20 季 (5 年) (12Q / 20Q Adaptive Depth)**：
   - 三表對照組件新增 `[ 8 季 | 12 季 | 20 季 ]` 分段切換器，後端解除 `limit=8` 預設截斷，滿足跨越完整 3~5 年景氣循環的深度分析。
3. **財務鑑識純函式引擎升級 (Forensic & Margin Engines)**：
   - 實作本業純度比率 ($\text{Core Business Purity} = \text{Operating Income} / \text{Pretax Income}$)。
   - 實作營運槓桿係數 ($\text{DOL} = \text{Operating Income YoY} / \text{Revenue YoY}$)。
   - 實作營收成長加速度 ($\Delta \text{YoY}$ 二階導數)。
   - 活化既有 `forensicAuditor.ts`，傳入湖倉董監質押率，當質押 $\ge 50\%$ 時點亮斷頭紅燈與內部人轉讓警訊。
4. **企業估值第一性原理升級 (Reverse DCF & Scenario Matrix)**：
   - 實作 Reverse DCF 反向逆推現價隱含成長率，直接揭示「當前股價隱含未來 5 年需成長多少 %」。
   - 提供 Bull (+20%) / Base (歷史中位) / Bear (-20%) 三情境合理價值區間與安全邊際 (Margin of Safety %)。
5. **頂部高階經理人總覽 (01｜Executive Summary & 100-Point Scoring)**：
   - 頂部新增常駐「機構研究總覽」看板，整合核心結論、多空三理由、買進觀察區與失效停損。
   - 實作 8 維度 100 分制透明量化評分（營收 15%、獲利 15%、現金流 15%、安全 10%、優勢 10%、產業 10%、估值 15%、催化劑 10%），附帶客觀支持證據與信心水準。
6. **專屬「12 位分析師投研 Prompt 抽屜」與裁決釘選回流 (Loopback Protocol)**：
   - 本地零 Token 生成 12 分析師標準架構 Prompt。
   - 復用專案既有 `strategyPinEngine`，支援一鍵貼回外部旗艦 LLM 生成的 JSON 裁決塊並釘選於頁面頂部。

## 後果與影響 (Consequences)

- **正面影響 (Positive)**：
  - 徹底打通本機 SQLite 數據湖倉，財報快取秒開，徹底杜絕 429 限流與白畫面。
  - 河流圖浮現真實歷史股價軌跡線，河流圖從「裝飾用色帶」升級為「可實戰比對的估值座標」。
  - 投資人一眼看穿本業純度、營運槓桿與現價隱含成長率，大幅提升決策品質。
  - 本地量化數據與外部 LLM 深度質化分析完美閉環，兼顧零成本與機構級深度。
- **負面影響 (Negative)**：
  - 12 季與 20 季三表資料量較大，在極小螢幕手機上需橫向滑動檢視（已透過 RWD 樣式優化）。

