# 產品需求規格書 (PRD)：持倉庫存自然排序與證交所公司行動掃描修復

- **文件編號**：`SPEC-0009`
- **版本**：`V1.8`
- **狀態**：`APPROVED`
- **作者**：Antigravity Agent
- **日期**：2026-08-21
- **追蹤 ADR**：[ADR-0009: 持倉列表自然排序與證交所除權除息端點校正](../adr/0009-holdings-natural-sorting-and-twse-endpoint-correction.md)

---

## 1. 背景與問題陳述 (Context & Problem Statement)

### 1.1 問題一：當前持倉庫存顯示順序混亂
- **現況**：目前系統在計算與渲染 `holdings` 持倉清單時，直接以記憶體中 Map 鍵值插入順序輸出（即標的第一次出現在交易紀錄中的歷史時間），導致前端呈現如 `2886 ➔ 2890 ➔ 0050 ➔ 00919 ➔ 9927 ➔ 00878 ➔ 3715` 這種雜亂無序的狀態。
- **目標**：嚴格依照標準規範進行排序——**台股置前、美股置底；組內依代碼字母數字升冪（Natural Sort）**，達到與照片 2 完全一致的排序體驗。

### 1.2 問題二：交易歷程誤出現「2026-10-01 減資退款 9927 泰銘 (-0 股，0 元)」
- **根因分析**：
  在 [corporateActionScanner.ts](file:///d:/APP/股票紀錄/src/engine/corporateActionScanner.ts) 函式 `fetchTWSECapitalReductions` 中，調用了台灣證券交易所端點 `https://openapi.twse.com.tw/v1/exchangeReport/TWT48U_ALL`。
  經查證交所 OpenAPI 官方定義，**`TWT48U_ALL` 實為「上市股票除權除息預告表」**而非減資預告表。
  泰銘 (9927) 在 115 年 10 月 1 號（2026-10-01）預計進行現金股利除息（每股 5 元）。因為減資掃描函式錯誤讀取此表，且該表中無 `RefundPerShare` 與 `ReductionRatio` 欄位，系統以預設值 `0` 解析，並給予 `CAPITAL_REDUCTION` 類別，最終補登成一筆「2026-10-01 虧損減資 0 股 0 元」的假事件。

---

## 2. 核心規格與演算法設計 (Core Specifications)

### 2.1 持倉庫存多維度自然排序 (Holdings Natural Sort)

#### 排序權重層級
1. **第一優先層級（市場分組）**：
   - 台股 (`market === 'TW'` 或幣別為 `TWD`) 權重為 `0`。
   - 美股 (`market === 'US'` 或幣別為 `USD`) 權重為 `1`。
2. **第二優先層級（代碼字母數字自然排序）**：
   - 使用 `a.symbol.localeCompare(b.symbol)`。
   - 確保 `00403A` 排在 `0050` 之前，`00981A` 排在 `009826` 之前，`2327` 排在 `2330` 之前，美股依 `AAPL` ➔ `MSFT` ➔ `NVDA` ➔ `VT` 排列。

#### 期望排序對照序列（以在倉標的為例）
```
00403A 主動統一升級50
0050   元大台灣50
00636  國泰中國A50
00878  國泰永續高股息
00919  群益台灣精選高息
00923  群益台ESG低碳50
00924  復華S&P500成長
009816 凱基台灣TOP50
00981A 富邦特選高股息30
009826 統一台灣高息動能
2327   國巨
2330   台積電
2481   強茂
2755   揚秦
2883   凱基金
2886   兆豐金
2890   永豐金
3715   定穎投控
8105   凌巨
9927   泰銘
VT     Vanguard全世界股票ETF (美股置底)
```

---

### 2.2 證券交易所 OpenAPI 端點校正與減資掃描器防禦

#### 端點職責明確化
1. **除權除息預告表**：
   - 端點：`https://openapi.twse.com.tw/v1/exchangeReport/TWT48U_ALL`
   - 正確處理：歸屬於 `fetchTWSEDividends`，讀取 `CashDividend`（現金股利）與 `StockDividendRatio`（無償配股率），轉換為 `DIVIDEND` 或 `STOCK_DIVIDEND`。
2. **減資資料源防禦**：
   - 移除 `fetchTWSECapitalReductions` 對 `TWT48U_ALL` 的誤調用。
   - 減資事件依賴 Yahoo Finance 歷史與既有經過驗證的減資 API，且強制過濾無效事件（比率 $\le 0$ 且金額 $\le 0$ 且股數異動 $= 0$ 之假事件一律自動剔除，不得進入補登候選清單）。

---

## 3. 受影響檔案清單 (Impacted Files)

| 檔案路徑 | 變更性質 | 變更說明 |
| :--- | :---: | :--- |
| `src/engine/calculator.ts` | 核心引擎 | 在 `calculateHoldingsAndSummary` 返回 `holdings` 陣列前，執行台股優先、代碼自然排序。 |
| `src/components/HoldingsTable.tsx` | UI 元件 | 確保 `activeHoldings` 繼承正確排序規則。 |
| `src/engine/corporateActionScanner.ts` | 核心引擎 | 校正 `TWT48U_ALL` 端點職責，移除減資誤判，增加無效減資過濾閘門。 |
| `src/engine/calculator.test.ts` | 單元測試 | 新增持倉自然排序驗證測試（包含台美股混合、字母數字混編）。 |
| `src/engine/corporateActionScanner.test.ts` | 單元測試 | 新增除權除息與減資端點解析驗證，確保 9927 不產生無效減資退款。 |

---

## 4. 驗收標準 (Acceptance Criteria)

- [x] **AC-1 (持倉排序正確性)**：當前持倉庫存列表依序呈現：`00403A ➔ 0050 ➔ 00636 ➔ 00878 ➔ 00919 ➔ 00923 ➔ 00924 ➔ 009816 ➔ 00981A ➔ 009826 ➔ 2327 ➔ 2330 ➔ 2481 ➔ 2755 ➔ 2883 ➔ 2886 ➔ 2890 ➔ 3715 ➔ 8105 ➔ 9927 ➔ VT`。
- [x] **AC-2 (掃描器精確度)**：執行「智慧掃描公司行動」時，9927 泰銘不再出現 2026-10-01 減資退款（0 股 0 元）的假事件。
- [x] **AC-3 (歷史歷程清洗)**：交易歷程中的 9927 假減資紀錄可被安全移除，總持倉股數與損益不受任何干擾。
- [x] **AC-4 (測試與編譯通過)**：`npm test` 測試套件 100% 通過 (83/83 tests)，`npm run build` TypeScript 零錯誤。
