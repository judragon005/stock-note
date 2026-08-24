# 更新日誌 (CHANGELOG)

本專案記錄所有關鍵里程碑、架構決策 (ADR) 與 PRD 規格書之迭代演進歷程。

---

## [V3.5] - 2026-08-24
### 歷史帳本稅費智慧自動拆分修復純函式、雙幣別匯率換算與除權息摩擦引擎
- **歷史賣出稅費智慧拆分修復純函式 (`repairLedgerTaxAndFee`)**：
  - 自動檢測歷史台股賣出交易中將 0.3% 證交稅誤併入手續費的紀錄，精準推導出證交稅並從手續費分離。
  - 嚴格維持損益恆等性 $\text{newFee} + \text{newTax} \equiv \text{oldFee}$，交割總金額與已實現損益（Realized PnL）100% 保持恆等。
  - 支援缺漏證交稅自動補登（不破壞原手續費），並自動識別債券型 ETF（代碼結尾 B）合法 0% 免稅。
- **雙幣別匯率換算與除權息摩擦成本**：
  - 摩擦看板全面支援多幣別，美股手續費與 30% 股息預扣稅依匯率折算為 TWD。
  - 台股現金股利單筆 $\ge 20,000$ 元自動計入 2.11% 二代健保補充保費。
- **美股歷史明細 2 位小數美分精度**：歷史明細表結算金額依幣別自動適配美分小數點，消除 0.21 美元視覺取整誤差。
- **關聯文件**：[SPEC-0018](docs/specs/0018-tax-fee-auto-repair-and-currency-engine.md) · [ADR-0018](docs/adr/0018-tax-fee-auto-repair-and-currency-engine.md)。

---

## [V3.4] - 2026-08-24
### 摩擦成本精準計算引擎與台美股稅制校驗升級
- **台股券商折讓金額精準化**：以法定牌告 $\max(20, \lfloor \text{成交額} \times 0.001425 \rfloor)$ 為基準計算差額，真實反映透過低消 1 元帳戶省下的手續費。
- **債券型 ETF 0% 免稅支援**：代碼結尾為 `B` 之債券型 ETF 稅率為 0%（免稅）。
- **當沖交易 0.15% 減半稅率**：支援現股當沖 0.15% 減半稅率。
- **關聯文件**：[SPEC-0017](docs/specs/0017-friction-cost-and-tax-precision-engine.md) · [ADR-0017](docs/adr/0017-friction-cost-and-tax-precision-engine.md)。

---

## [V3.3] - 2026-08-24
### 整合式設定工作台、Header 瘦身與外部 API Key 配置
- **Header 瘦身**：移除頂部重複的「摩擦成本」與「券商設定」按鈕，頂部工具列回歸極簡純粹。
- **活頁標籤更名**：第三個活頁標籤更名為 `⚙️ 設定` (Tab: `settings`)，圖示使用 `Settings`。
- **整合式設定中心 (`SettingsWorkspace.tsx`)**：
  - 模組 A: 🏛️ 券商帳戶與費率管理（新增/編輯券商、折讓率 2.8折等、低消、美股模式、一鍵範本庫）。
  - 模組 B: 💸 交易摩擦成本深度分析（4 大發光看板、佔比進度條、優化對策）。
  - 模組 C: 🔑 外部金融資料 API 金鑰管理（FinMind Token、FMP API Key、Alpha Vantage Key、自訂 Proxy 端點）。
- **安全隔離**：API Key 獨立保存於 `STOCK_TRACKER_API_KEYS_V1` LocalStorage 中，支援密碼遮罩 `👁️`，不污染交易匯出檔。
- **關聯文件**：[SPEC-0016](docs/specs/0016-settings-workspace-and-api-key-configuration.md) · [ADR-0016](docs/adr/0016-settings-workspace-and-api-key-configuration.md)。

---

## [V3.2] - 2026-08-24
### 公司行動雙軌資料管線、受控限速與本地代理防護
- **Vite 本地開發代理 (Dev Proxy)**：配置 `/api/twse` 與 `/api/yahoo` 本地轉發路由，徹底終結瀏覽器端 CORS 跨域攔截。
- **雙軌合規資料源管線**：台股除權息優先查詢 TWSE 官方除權除息預告表 (`TWT48U_ALL`)，官方無資料或分割/減資由 Yahoo Finance 備援；美股查詢 Yahoo Finance。
- **受控節流佇列與 24H 實體快取**：並發度受控為 2，單標的間隔 150ms 節流延遲防止 429 限制；`STOCK_TRACKER_CA_CACHE_V1` 快取 24 小時有效，第二次查詢 0 外部請求。
- **關聯文件**：[SPEC-0015](docs/specs/0015-corporate-action-dual-pipeline-and-rate-limiting.md) · [ADR-0015](docs/adr/0015-corporate-action-dual-pipeline-and-rate-limiting.md)。

---

## [V3.1] - 2026-08-24
### 活頁本工作台架構與券商手續費整併收斂
- **活頁本工作台 (Tabbed Workspace Hub)**：劃分三大核心視圖（📊 投資組合、📜 歷史交易帳本、⚙️ 設定），支援 LocalStorage 頁籤記憶。
- **手續費功能全面收斂至券商 (SSOT)**：移除 Header 獨立全域折讓選單，持股預估出清手續費直接由部位所屬券商帳戶之 `discountRate`、`minFee` 驅動。
- **交易帳本總筆數透明指示器**：表頭動態呈現 `已篩選顯示 M 筆 / 全量共 N 筆`，並提供一鍵 `[ 🔄 顯示全部 N 筆 ]` 重置按鈕。
- **關聯文件**：[SPEC-0014](docs/specs/0014-tabbed-workspace-and-broker-fee-consolidation.md) · [ADR-0014](docs/adr/0014-tabbed-workspace-and-broker-fee-consolidation.md)。

---

## [V3.0] - 2026-08-24
### 多券商帳戶管理體系與交易摩擦成本分析儀
- **多券商獨立帳戶體系**：支援自訂台美多券商（國泰 2.8 折、永豐 2 折、富邦 1.8 折、海外券商 $0 免手續費、國內複委託等），支援自訂最低手續費與證交稅率。
- **交易摩擦成本深度分析儀**：4 大發光看板（累計手續費、累計證交稅、券商折讓已省金額、庫存預估出清成本）與摩擦衝擊佔比進度條。
- **歷史交易批次指派**：歷史明細表支援快速切換或批次指派所屬券商帳戶。
- **關聯文件**：[SPEC-0013](docs/specs/0013-multi-broker-account-and-friction-cost-engine.md) · [ADR-0013](docs/adr/0013-multi-broker-account-and-friction-cost-engine.md)。

---

## [V2.1] - 2026-08-21
### 雙軌會計口徑切換與券商手續費折讓自訂
- **全域雙軌會計口徑切換**：`[🏢 券商核帳模式 (不含息/含稅)]` ⇋ `[📈 總報酬模式 (含息/毛市值)]` 一鍵切換。
- **官方 21 檔標的校準**：對齊 2026 新掛牌之 `00403A`、`009816`、`00981A`、`009826`。
- **關聯文件**：[SPEC-0011](docs/specs/0011-dual-accounting-view-and-official-symbol-alignment.md) · [ADR-0011](docs/adr/0011-dual-accounting-view-and-official-symbol-alignment.md) · [ADR-0012](docs/adr/0012-broker-fee-discount-and-cost-basis-alignment.md)。

---

## [V1.0 ~ V1.9] - 2026-08
- **V1.9**: 技術債與改善建議分級管理系統 (`docs/debts/`)。
- **V1.8**: 持倉雙階自然排序與證交所除權除息預告端點校正。
- **V1.7**: 虛擬時序動態配股累積與台股減資整數向下取整算法。
- **V1.6**: 公司行動掃描進度動態可視化、受控並行與斷點接續。
- **V1.5**: USD/TWD 匯率自動輪詢更新與四層平滑備援降級。
- **V1.4**: 全市場即時與延遲多源行情、開盤智慧輪詢與自訂價格鎖定。
- **V1.0 ~ V1.3**: 雙市場獨立記帳、純 SVG Treemap 資產配置圖、事件流模型與全市場公司行動掃描。
