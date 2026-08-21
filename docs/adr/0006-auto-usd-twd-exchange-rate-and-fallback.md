# ADR-0006: 美金台幣 (USD/TWD) 匯率自動更新、行情同步輪詢與多層平滑備援架構

- **狀態 (Status)**: Approved
- **日期 (Date)**: 2026-08-21
- **決策者 (Deciders)**: Core Engineering Team
- **關聯規格 (PRD)**: [PRD 0006: V1.5 美金台幣 (USD/TWD) 匯率自動更新與平滑備援機制](../../docs/specs/0006-auto-usd-twd-exchange-rate.md)
- **關聯 Issues**: #62, #63, #64, #65, #66

---

## 1. 背景與脈絡 (Context)

在先前版本中，系統美金/台幣（USD/TWD）匯率主要由使用者手動於頂部導航列輸入並儲存在 LocalStorage 中，或由預設值 32.5 兜底。
隨著全市場即時報價引擎 (ADR-0005) 的建立，使用者希望美金匯率亦能純前端自動抓取，並與即時行情機制保持同步，解決手動維護繁瑣、匯率波動無即時反映與異常時計算跳變等痛點。

---

## 2. 決策事項 (Decisions)

### 決策一：純前端免 Key 匯率抓取引擎 (`src/engine/priceFetcher.ts`)
- **資料來源**：採用 Yahoo Finance `USDTWD=X`，透過前端多節點 CORS 代理池發送請求，取得最新盤中匯率、前一日收盤價 (`chartPreviousClose`) 與漲跌幅度。
- **資料結構**：定義 `ExchangeRateQuote` 介面：
  ```ts
  export interface ExchangeRateQuote {
    rate: number;
    prevClose?: number;
    change?: number;
    changePercent?: number;
    sourceType: 'realtime' | 'delayed' | 'prevClose' | 'cached';
    updatedAt: number;
  }
  ```

### 決策二：多層平滑降級與備援機制 (Fallback Cascade)
- **Level 1 (即時/延遲報價)**：若 `regularMarketPrice > 0` 且有效，採用最新成交匯率 (`sourceType: 'realtime'`)。
- **Level 2 (前日收盤價)**：若盤中價格無效或非交易時段，使用 `chartPreviousClose` / `previousClose` (`sourceType: 'prevClose'`)。
- **Level 3 (本地持久化快取)**：若網路中斷或 CORS 代理全數不可用，平滑回退至 LocalStorage 快取的最近有效匯率 (`sourceType: 'cached'`)。
- **Level 4 (系統預設底線)**：若本地完全無歷史紀錄，採用預設基準值 32.5。

### 決策三：與即時行情機制完全同步 (`src/hooks/usePriceAutoRefresh.ts`)
- **進站自動抓取**：網頁載入時同步發起標的市價與匯率抓取。
- **開盤定時輪詢**：台股或美股任一市場處於開盤交易時段時，以 60 秒間隔背景輪詢更新匯率與持股市價。
- **手動一鍵重整**：頂部「重整行情」按鈕觸發時，同步刷新全持股市價與 USD/TWD 匯率。

### 決策四：純自動化 Header 徽章與狀態提示 (`src/components/Header.tsx`)
- 移除原 Header 手動數字輸入框與提交表單，轉為純自動化徽章展示。
- 徽章顯示 `USD/TWD: 32.45`，於資料更新時展示轉動動畫。
- 支援 Tooltip 呈現目前匯率來源狀態（即時 / 前日收盤 / 本地快取）與更新時間戳記。

---

## 3. 結果與效益 (Consequences)

- **優點**：
  1. 零維護成本：投資人無需手動修改匯率，美股折合台幣總值自動精準計算。
  2. 100% 離線可用與平滑防禦：斷線或 API 異常時不崩潰、不中斷任何計算。
  3. 視覺簡潔現代：Header 導航列更加乾淨直觀，符合 UI/UX 設計準則。
- **風險與緩解**：
  - 公共 CORS 代理延遲或偶發不穩定：透過既有 3 組代理輪替與多層 LocalStorage 快取降級完全緩解。
