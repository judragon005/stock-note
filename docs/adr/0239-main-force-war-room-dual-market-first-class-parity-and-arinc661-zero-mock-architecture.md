# ADR 0239: 主力戰情室台美雙市場一等公民同構與 ARINC 661 Zero-Mock 零造假架構

- **狀態 (Status)**: Accepted
- **日期 (Date)**: 2026-11-19
- **關聯規格 (Spec)**: [docs/specs/0239-main-force-war-room-dual-market-parity-and-21-card-zero-defect-spec.md](file:///d:/APP/股票紀錄/docs/specs/0239-main-force-war-room-dual-market-parity-and-21-card-zero-defect-spec.md)
- **關聯 Issue**: `#592`

---

## 1. 背景與問題定義 (Context & Problem Statement)

「主力戰情室 (`AiForceDashboardView`)」原先存在三大結構性斷層：
1. **靜態假數據與合成降級污染 (Synthetic Mock Contamination)**：當外部 API 無回應或樣本數不足時，部分模組退化為合成假數據（如 `createDefaultAiForceReport` 硬編碼 `2330 / 3150 元`、法人近 5 日 `-64 張`、維持率 `168.5%`、集保線性偽插值、美股 13F 合成比例及 Volume Profile `2400~1600` 假座標）。
2. **台股本位硬編碼與美股二等公民失語 (TW-Centric Asymmetry)**：多處管道與卡片硬編碼台股交易制度（`÷1000` 張數換算、`T+2` 交割、`0.3%` 交易稅、`130%` 融資追繳線、三大法人、千張大戶與月營收），導致美股 (`NVDA`, `BRK.B`, `VT`) 出現失真或空窗。
3. **跨層次競態與 SVG 幾何微字級退化**：非同步請求缺乏 Epoch Guard、快取鍵未隔離市場別 (`symbol` vs `market:symbol`)，以及部分卡片殘留 `< 12px` 字級與 `#64748b` 低對比色。

---

## 2. 架構決策 (Architectural Decisions)

### 2.1 雙市場微結構策略契約 (`MarketMicrostructureStrategy`)
- 以顯式 `market: 'TW' | 'US'` 與 `resolveAssetCategory(symbol, name, market)` 四象限分類器（`TW_STOCK`, `TW_ETF`, `US_STOCK`, `US_ETF`）驅動全鏈路計算：
  - **TW**：`lotSize = 1000`（張）、`settlementDays = 2`（T+2）、`10%` 漲跌幅限制、`130%` 信用維持率。
  - **US**：`lotSize = 1`（股）、`settlementDays = 1`（T+1）、無漲跌幅限制（LULD 熔斷）、Reg T / Portfolio Margin、無現沖減半稅率。
- 快取鍵統一升級為 `${market}:${symbol}`，並以 `requestSeqRef` 遞增序號實施非同步競態守衛 (Epoch Race Guard)。

### 2.2 零付費依賴之美股雙軌代理與多源級聯 (Zero-Paid-API Dual-Market Pipeline)
- **美股 (`US`)**：結合 Yahoo Finance `v10/finance/quoteSummary`（`institutionOwnership`, `majorHoldersBreakdown`, `defaultKeyStatistics`, `financialData`, `fundProfile`）與 **SEC EDGAR 官方免費 API 本地代理** (`/api/sec-edgar/company-facts` 具備 `CIK` 自動映射與 24 小時 SQLite 快取)，零成本供應美股 13F 機構持倉、Short Float / Days to Cover 軋空指標與 10-Q/10-K 季度營收。
- **台股 (`TW`)**：統一上市 (`TWSE`) 與上櫃 (`TPEx`) 融資融券與三大法人解析、TAIFEX 期貨外資未平倉與選擇權 P/C Ratio 真實抓取，以及基於真實歷史快照之 TDCC 集保 10 週趨勢。

### 2.3 ARINC 661 航太級誠實空態閘門 (Zero-Mock & Honest Empty State Gate)
- 全面廢除 `generateSynthetic13fSummary`、`synthesizeHistoricalSeries` 與 `createDefaultAiForceReport` 內的靜態假數字。
- 建立三段式 `DataReadinessNotice` (`FULL_TIER` $\ge 20\text{D}$、`DEGRADED_TIER` $5\sim 19\text{D}$、`EMPTY_TIER` $< 5\text{D}$)：當歷史日 K $< 5$ 根時，預測錐、VWAP、量價結構與法人流向強制進入 `isEmpty: true` 誠實空態，且 `WarRoomPromptCard` 物理鎖定「一鍵複製戰略提示詞」按鈕並顯示紅框止損橫幅 (`data-testid="prompt-stop-loss-banner"`)，阻斷 LLM 幻覺推論。

### 2.4 全域排版與對比度物理底線 (`WAR_ROOM_TYPOGRAPHY_FLOOR`)
- 全戰情室 21 張卡片與 `TaskPanels` 強制遵守最小字級 $\ge 12\text{px}$ (`0.75rem`)、次要文字色彩升格為 `#94a3b8` / `#cbd5e1`（清零 `#64748b` 與 `transform: scale(0.9)`），並全面支援 `colorTheme`（台股紅漲綠跌 / 美股綠漲紅跌）。

---

## 3. 影響與驗證 (Consequences & Verification)

- **正面影響**：台美雙市場四象限（台股個股 `2330/2881`、台股 ETF `0050/00403A`、美股個股 `NVDA/BRK.B`、美股 ETF `VT`）在同一套 21 卡架構下達成 100% 語意同構與零假字閉環。
- **驗證契約**：由 `t16DualMarketFourQuadrantE2E.test.tsx` 與各卡片/引擎單元測試進行全量自動化回歸守護。
