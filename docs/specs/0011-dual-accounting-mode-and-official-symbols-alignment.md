# 產品需求規格書 (PRD)：V2.0 雙軌會計口徑系統與官方標的數據全面校準

- **文件編號**：`SPEC-0011`
- **版本**：`V2.0`
- **狀態**：`APPROVED`
- **作者**：Antigravity Agent
- **日期**：2026-08-21
- **追蹤 ADR**：[ADR-0011: 雙軌會計口徑計算模型與官方標的數據校正架構](../adr/0011-dual-accounting-mode-and-official-symbols-alignment.md)

---

## 1. 背景與痛點分析 (Background & Problem Statement)

在個人資產管理與股票投資過程中，投資人頻繁面臨兩大核心痛點：

1. **官方標的名稱錯置與舊名稱殘留**：
   - 近期 2026 年新掛牌之主動型與被動型 ETF（如 `00403A`、`009816`、`00981A`、`009826`）在歷史資料或舊範本中存在名稱誤植（例如 `00403A` 顯示為國泰台灣5G+、`009816` 顯示為富邦科技、`00981A` 誤植為富邦特選高股息30、`009826` 誤植為統一台灣高息動能）。
   - 需以台灣證券交易所 (TWSE) 與各大投信官方資料庫為單一事實來源 (Single Source of Truth) 進行全面校準。

2. **會計口徑不一致導致「網頁市值/成本與券商 App 對不上」**：
   - **市值端差額**：本系統原先計算為「毛市值 (Gross Market Value = 股數 × 現價)」，而券商 App（如國泰/富邦）普遍標註 **「含稅」**，即預扣了「若當下市價全數賣出時需繳納的證券交易稅與手續費（淨變現清算值 Net Liquidation Value）」，產生約 $0.1\% \sim 0.3\%$（約數萬元）之計算落差。
   - **成本端差額**：券商預設採用 **「不含息」**（純買進加權總付出成本，現金股利直接入銀行而不沖抵持股成本），而長期投資人往往關注 **「含息總回報 (Total Return)」**（價差 + 歷年累計股息）。
   - 缺乏統一且靈活的切換視角，導致使用者在「核對券商帳戶」與「分析長期投資複利」時產生混淆。

---

## 2. 標的官方名稱與詞庫全面校準表 (Official Security Reference List)

經台灣證券交易所 (TWSE) 與投信公司公開募集說明書官方校對，21 檔在倉標的正式清單如下：

| 序號 | 標的代碼 (Symbol) | 官方正式證券簡稱 | 基金 / 公司全名 | 市場 / 幣別 | 備註說明 |
| :---: | :--- | :--- | :--- | :---: | :--- |
| 1 | **00403A** | **主動統一升級50** | 統一台股升級50主動式ETF證券投資信託基金 | TW / TWD | 2026 統一投信主動式 ETF |
| 2 | **0050** | **元大台灣50** | 元大台灣卓越50證券投資信託基金 | TW / TWD | 被動指數型 ETF |
| 3 | **00636** | **國泰中國A50** | 國泰富時中國A50基金 | TW / TWD | 陸股指數型 ETF |
| 4 | **00878** | **國泰永續高股息** | 國泰台灣ESG永續高股息ETF基金 | TW / TWD | 季配息高股息 ETF |
| 5 | **00919** | **群益台灣精選高息** | 群益台灣精選高息ETF基金 | TW / TWD | 季配息高股息 ETF |
| 6 | **00923** | **群益台ESG低碳50** | 群益台灣ESG低碳50ETF基金 | TW / TWD | 半年配市值低碳 ETF |
| 7 | **00924** | **復華S&P500成長** | 復華美國S&P500成長ETF基金 | TW / TWD | 美股成長指數 ETF |
| 8 | **009816** | **凱基台灣TOP50** | 凱基台灣TOP 50 ETF證券投資信託基金 | TW / TWD | 2026 凱基投信市值型 ETF |
| 9 | **00981A** | **主動統一台股增長** | 統一台股增長主動式ETF證券投資信託基金 | TW / TWD | 2026 統一投信主動式 ETF |
| 10 | **009826** | **貝萊德世界股票** | 貝萊德iShares安碩世界股票ETF基金 | TW / TWD | 2026 貝萊德世界股票 ETF |
| 11 | **2327** | **國巨** | 國巨股份有限公司 | TW / TWD | 電子零組件 |
| 12 | **2330** | **台積電** | 台灣積體電路製造股份有限公司 | TW / TWD | 半導體晶圓代工龍頭 |
| 13 | **2481** | **強茂** | 強茂股份有限公司 | TW / TWD | 半導體功率元件 |
| 14 | **2755** | **揚秦** | 揚秦國際企業股份有限公司 | TW / TWD | 觀光餐飲連鎖 |
| 15 | **2883** | **凱基金** | 凱基金融控股股份有限公司 | TW / TWD | 金融控股 |
| 16 | **2886** | **兆豐金** | 兆豐金融控股股份有限公司 | TW / TWD | 金融控股 |
| 17 | **2890** | **永豐金** | 永豐金融控股股份有限公司 | TW / TWD | 金融控股 |
| 18 | **3715** | **定穎投控** | 定穎投資控股股份有限公司 | TW / TWD | 印刷電路板 PCB |
| 19 | **8105** | **凌巨** | 凌巨科技股份有限公司 | TW / TWD | 光電顯示面板 |
| 20 | **9927** | **泰銘** | 泰銘實業股份有限公司 | TW / TWD | 其他金屬材料製造 |
| 21 | **VT** | **Vanguard全世界股票ETF** | Vanguard Total World Stock ETF | US / USD | 全球全市場指數 ETF |

---

## 3. 雙軌會計口徑計算模型 (Dual Accounting Engine Specs)

系統將支援兩種可一鍵切換的會計視角，並在介面上採用**雙層資訊看板 (Dual-Tier Dashboard)** 同步呈現：

```mermaid
graph TD
    subgraph AccountingModes [會計口徑切換 (Accounting View)]
        ModeBroker["【券商核帳模式 (BROKER)】<br>• 不含息 (純加權買入付出成本)<br>• 含稅 (扣除預估賣出證交稅與手續費)"]
        ModeTotal["【總回報模式 (TOTAL_RETURN)】<br>• 毛市值 (客觀未扣稅牌面價值)<br>• 含息總損益 (資本利得 + 歷年累計現金股息)"]
    end
```

### 3.1 模式 A：券商核帳口徑 (Broker View - 不含息、含稅)
- **總付出成本 (Total Cost Basis)**：
  $$\text{BrokerCost} = \sum (\text{買入成交股數} \times \text{買入單價} + \text{買入手續費}) - \text{現金減資退還股款}$$
  *(現金股息 Dividend 不沖減成本)*
- **預估賣出稅費 (Estimated Sell Tax & Fee)**：
  - 台股現股證券交易稅：$\text{Tax}_{\text{TW, Stock}} = \lfloor \text{市值} \times 0.003 \rfloor$ ($0.3\%$)
  - 台股 ETF 證券交易稅：$\text{Tax}_{\text{TW, ETF}} = \lfloor \text{市值} \times 0.001 \rfloor$ ($0.1\%$)
  - 台股券商手續費：$\text{Fee}_{\text{TW}} = \max(20, \lfloor \text{市值} \times 0.001425 \times \text{折扣率} \rfloor)$ (預設折扣率可配置，預設以標準 $0.1425\%$ 搭配 $0.6$ 折或全額)
  - 美股賣出監管費：$\text{Fee}_{\text{US}} = \text{SEC/FINRA Fee}$ (微量，預設為 0 或實務設定)
- **含稅庫存市值 (Net Market Value / Liquidation Value)**：
  $$\text{NetMarketValue} = \text{GrossMarketValue} - \text{EstimatedSellTax} - \text{EstimatedSellFee}$$
- **未實現損益 (Unrealized PnL)**：
  $$\text{UnrealizedPnL}_{\text{Broker}} = \text{NetMarketValue} - \text{BrokerCost}$$
- **報酬率 (Return Rate %)**：
  $$\text{ReturnRate\%} = \frac{\text{UnrealizedPnL}_{\text{Broker}}}{\text{BrokerCost}} \times 100\%$$

### 3.2 模式 B：投資總回報口徑 (Total Return View - 含息、毛市值)
- **毛市值 (Gross Market Value)**：
  $$\text{GrossMarketValue} = \sum (\text{在倉股數} \times \text{當前市價})$$
- **含息總損益 (Total Profit with Dividends)**：
  $$\text{TotalReturnPnL} = (\text{GrossMarketValue} - \text{BrokerCost}) + \text{歷史累計已領現金股息} + \text{已實現損益}$$
- **含息調整後成本 (Adjusted Cost Basis)**：
  $$\text{AdjustedCost} = \max(0, \text{BrokerCost} - \text{歷史累計已領現金股息})$$
- **總回報率 (Total Return Rate %)**：
  $$\text{TotalReturn\%} = \frac{\text{TotalReturnPnL}}{\text{BrokerCost}} \times 100\%$$

---

## 4. UI/UX 雙層看板與互動規格 (UI/UX Specifications)

1. **頂部導覽列切換開關 (Accounting View Toggle)**：
   - 位於 [Header.tsx](file:///d:/APP/股票紀錄/src/components/Header.tsx)，提供膠囊型按鈕：
     - `🏢 券商核帳 (不含息/含稅)` ⇋ `📈 總報酬 (含息/毛市值)`
   - 狀態持久化儲存於 `localStorage` (`STOCK_TRACKER_ACCOUNTING_VIEW_V1`)。
2. **總覽資產卡片 (SummaryCards.tsx)**：
   - **大字主標題**：呈現當前選定模式的數值（如券商模式顯示 `NT$ 13,126,007`）。
   - **小字副標題**：同步顯示另一模式數值與預估賣出稅費（如：`毛市值: NT$ 13,168,310 (預估稅費: NT$ 42,303)`）。
3. **持倉明細表格 (HoldingsTable.tsx)**：
   - 表格表頭與欄位數字動態切換：
     - 在券商模式下：欄位顯示「含稅預估市值」、「付出成本」、「未實現損益（含稅）」與「報酬率%」。
     - 在總報酬模式下：欄位顯示「毛市值」、「原始成本」、「累計股利」、「含息總損益」與「總回報率%」。

---

## 5. 驗收標準 (Acceptance Criteria)

- [x] **AC-1 (官方標的名稱一致性)**：
  - 在倉 21 檔標的名稱 100% 符合官方詞庫表，`00403A` 為「主動統一升級50」、`009816` 為「凱基台灣TOP50」、`00981A` 為「主動統一台股增長」、`009826` 為「貝萊德世界股票」。
  - 歷史平倉標的（5312、3056、1808、2884、2371）維持 0 股不顯示。
- [x] **AC-2 (雙軌計算引擎精確度)**：
  - 單元測試套件驗證券商模式下：台股總市值、預估賣出稅費、未實現損益與報酬率之計算公式精確無誤。
  - 單元測試套件驗證總回報模式下：毛市值、累計股息、含息總損益之計算公式精確無誤。
- [x] **AC-3 (雙軌 UI 切換與持久化)**：
  - 點擊頂部切換開關，總覽卡片與持倉表格無縫即時切換數據，且重新整理頁面後記住上次選擇。
- [x] **AC-4 (測試與建置健康度)**：
  - `npm test` 保持 100% 通過（87/87 tests passed）。
  - `npm run build` 維持 TypeScript 0 錯誤。
