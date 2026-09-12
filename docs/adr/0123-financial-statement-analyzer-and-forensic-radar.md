# 0123 — 穿透式財報分析儀與財務防雷鑑識系統 (Financial Statement Analyzer & Forensic Radar)

## 背景與問題陳述 (Context & Problem Statement)

在傳統股票分析中，散戶常陷入「營收創新高即買進」或「只看單季高獲利與本益比」的認知偏誤，忽略了：
1. 塞貨導致應收帳款 (DSO) 與存貨週轉 (DIO) 惡化；
2. 稅後淨利攀升但營業現金流 (CFO) 脫鉤，充斥紙上富貴；
3. 靠處分資產美化帳面，本業營業利益率實質衰退；
4. 自由現金流為負卻舉債發放高額股息，掏空公司體質；
5. 美股企業過度發放股權激勵 (SBC) 稀釋股東權益；
6. 金融保險股天生高負債無存貨，套用製造業常規指標導致假警報。

為了提供投資人直觀、精準且具備防禦性的決策護欄，需要建立三層漸進式的穿透式財報戰情室。

## 決策記錄 (Decision Log)

1. **三層漸進式架構 (Three-Layer Progressive Disclosure)**：
   - **Layer 1 (0 秒決策層)**：綜合評分 (0~100)、評級徽章、四大體質燈號 (Profitability, Safety, Efficiency, Cash Flow) 與 0 秒操盤總結。
   - **Layer 2 (趨勢驗證層)**：近 8 季獲利三率走勢圖 (SVG)、淨利 vs 營業現金流階梯長條對比、杜邦 ROE 三因子長條矩陣。
   - **Layer 3 (深度鑑識層)**：「市場沒說什麼」六大逆向背離排雷清單、會計師查核意見與四大所徽章、一鍵導出完整 Markdown 研報。

2. **核心 16 欄位契約與零除防禦**：
   - 標準化損益表、資產負債表、現金流量表與審計意見的 16 核心科目，所有除法運算採用 `safeDivide` 與邊界防禦，營收或資產為零時回傳安全值，杜絕 `NaN%`。

3. **產業隔離閘門 (Industry Gate)**：
   - 針對台股 28XX 代碼與美股銀行/金融股，自動套用 `FINANCIALS` 豁免模型，不以負債比與存貨週轉扣分。
   - 針對航運、鋼鐵、記憶體等強週期景氣循環股標註 `CYCLICAL` 警語，防止週期高點估值陷阱。

4. **IndexedDB 快取優先與按需載入 (On-Demand Fetching)**：
   - 升級 IndexedDB 至版本 4，建立 `financialStatements` store (複合主鍵 `symbol_year_Qquarter`) 與 `by_symbol` 索引。
   - 先讀本地快取，未命中時才調用外部 FinMind / FMP API，寫入本地後永不重複請求歷史季度。

## 狀態 (Status)

**ACCEPTED**

## 影響評估 (Consequences)

- **優點**：
  - 零第三方重型圖表依賴（使用純 CSS/SVG），輕量高效。
  - 徹底解決紙上富貴、借債配息、塞貨庫存等盲點。
  - 完整相容既有持倉與暗黑/明亮主題。
- **邊界限制 (Out of Scope)**：
  - 不爬取 PDF/OCR 全文；不執行全市場離線掃描；不依賴外部付費 LLM，純前端 0ms 秒級運算。
