# 0178 Spec: 專案全量文檔完整性稽核、死鏈全數修復、變更日誌補齊與自動化守門機制規格書 (Issue #220)

## 1. 概述與問題陳述 (Overview & Problem Statement)

### 1.1 背景與問題痛點
本專案經歷了 V1.0 至 V8.89.0 總計 170+ 次的敏捷迭代與多位 Agent 協作，雖然核心程式碼維持高覆蓋率單元測試（210 檔測試、1,553 個用例全綠）與嚴格的 TypeScript 編譯標準，但因缺乏**自動化文檔完整性守門機制 (Documentation Integrity Guard)**，在文件系統層面累積了顯著的「文檔債 (Documentation Debt)」：

1. **序號跳號斷層 (Numbering Gap)**：
   * `docs/specs/` 與 `docs/adr/` 自 `0152` 直接跳躍至 `0154`，**`0153` 號文件整批缺位**，破壞了專案序號連續性。
2. **關鍵架構決策紀錄 (ADR) 遺漏**：
   * 存在 `Spec 0175` 規格書與程式碼實作，且交接手冊記載關聯 `ADR 0175`，但 `docs/adr/` 下**查無實體檔案**，且 `.scratch/v8.87/issues/` 鏡像目錄亦未建檔。
3. **目錄結構割裂與雙胞胎殘留 (Directory Divergence)**：
   * 交接文件長期存於 `docs/handoff/`（累計 134 篇），但歷史提交誤建了 `docs/handover/`，滯留了孤立的 0069、0070、0071 三篇交接檔。
4. **全域與交接手冊死鏈外溢 (Broken Links)**：
   * [handoff_stock_tracker_final.md](file:///d:/APP/股票紀錄/docs/handoff/handoff_stock_tracker_final.md) 存在**版本序號平移錯位**（如將 Spec 0132 標示為 0133，0134 標示為 0135），導致整批 Spec / ADR / .scratch 連結 404 失效。
   * `Spec 0151` 與 `Spec 0152` 反向引用不存在的 `0140-ai-force-decision-dashboard.md`（實體後綴為 `-architecture.md`）。
   * `Spec 0171` 命名缺少 `-spec.md` 後綴，破壞命名慣例。
   * [CONTEXT.md](file:///d:/APP/股票紀錄/CONTEXT.md) 引用的 `ADR-0049` 檔名不對稱；[README.md](file:///d:/APP/股票紀錄/README.md) 引用的 `LICENSE` 檔案在根目錄根本不存在。
   * `docs/debts/` 內多篇文檔指向 `src/engine/...` 的超連結未包含 `../../` 相對層級，在 Markdown 預覽中全數損壞。
5. **CHANGELOG.md 斷更近百個版本**：
   * [CHANGELOG.md](file:///d:/APP/股票紀錄/CHANGELOG.md) 自 2026 年 8 月 28 日的 `V5.9.0` 停更至今，V6.0.0 至 V8.89.0 之重大架構里程碑全數空白。
6. **根目錄雜物污染**：
   * 專案根目錄下殘留 290KB 的 `stock_trades_backup_2026-10-09.json` 實體備份檔案，未收斂至 `docs/json/`。

### 1.2 目標 (Goals)
1. **補齊缺失文件與歷史斷層**：補建 `ADR 0175`、`.scratch/v8.87/issues/`，並為跳號的 `0153` 建立雙軌官方備忘標記文件。
2. **全量修復死鏈與目錄收斂**：整併 `docs/handover/` 至 `docs/handoff/`；修正 `handoff_stock_tracker_final.md`、`CONTEXT.md`、`docs/debts/` 與所有 Spec 內部之錯誤超連結；根目錄補齊 MIT `LICENSE`。
3. **工作區徹底淨化**：將根目錄殘留之交易備份 JSON 歸檔至 `docs/json/`。
4. **復甦 CHANGELOG.md**：依據歷次發布與交接手冊，補全 V6.0.0 至 V8.89.0 之版本歷史。
5. **建立永久防禦性守門機制 (CI / Linter)**：編寫輕量零依賴的 `scripts/verify-docs.cjs` 驗證腳本，並於 `package.json` 註冊 `npm run lint:docs` 指令，使未來迭代具備自動攔截死鏈與文件破損的能力。

---

## 2. 第一性原理與修復設計 (Principles & Design)

### 2.1 KISS 原則與零依賴守門腳本
不引入肥大的第三方 Markdown Linter 或 npm 套件，直接使用 Node.js 內建模組 (`fs`, `path`) 編寫極簡、高執行效能的 `scripts/verify-docs.cjs`：
* **掃描範圍**：遞迴掃描全專案 `.md` 檔案（自動忽略 `node_modules`, `.git`, `dist`）。
* **檢查規則 1（死鏈檢查）**：解析所有 Markdown 內部超連結語法 `[text](url)`，判斷硬碟實體路徑是否存在。
* **檢查規則 2（Spec-ADR 1:1 對齊）**：提取 `docs/specs/` 與 `docs/adr/` 前綴數字編號，確保每個功能規格皆有對應架構決策（除已標記 SKIPPED 者外）。
* **檢查規則 3（命名規範檢驗）**：確保 `docs/specs/` 底下皆遵循 `\d{4}-.*-spec\.md` 規範（特別修正 0171）。

### 2.2 0153 跳號斷層處理策略
為了不破壞已發布於 V8.65.0 之後（0154~0177）所有提交、PR 與文檔中既有的標籤索引，**嚴禁將後續編號往前平移**。
正確處置：
* 於 `docs/specs/0153-SKIPPED-MILESTONE.md` 與 `docs/adr/0153-SKIPPED-MILESTONE.md` 建立正式跳號備忘，記載「本號碼因 Commit 4d85319 時序跳號預留，不對應實體功能代碼」，確保數字連續完整。

---

## 3. 詳細任務拆解與執行規範 (Task Breakdown)

### Task 1: 補齊核心決策紀錄與鏡像
1. **建立 `docs/adr/0175-api-key-probe-csp-cors-and-endpoint-repair.md`**：
   * 記錄 Commit `1881611` (PR #211) 之決策：包含 CSP Header 白名單調整、FRED CORS 代理伺服器相容性、FMP 免費端點替換。
2. **建立 `.scratch/v8.87/issues/01-api-key-probe-and-csp-repair.md`**：
   * 補齊 Issue #209 之鏡像票券。

### Task 2: 解決 0153 序號斷層
1. 建立 `docs/specs/0153-SKIPPED-MILESTONE.md`。
2. 建立 `docs/adr/0153-SKIPPED-MILESTONE.md`。

### Task 3: 目錄整併與去重
1. 將 `docs/handover/0069-full-project-ui-ux-design-system-and-modern-glassmorphism.md` 移動至 `docs/handoff/`。
2. 將 `docs/handover/0070-trade-history-table-layout-and-pagination.md` 移動至 `docs/handoff/`。
3. 將 `docs/handover/0071-color-theme-toggle-label-and-tooltip-ux.md` 移動至 `docs/handoff/`。
4. 刪除空目錄 `docs/handover/`。

### Task 4: 根目錄雜物歸檔與 LICENSE 建置
1. 移動 `stock_trades_backup_2026-10-09.json` 至 `docs/json/stock_trades_backup_2026-10-09.json`。
2. 建立根目錄 [LICENSE](file:///d:/APP/股票紀錄/LICENSE)（標準 MIT License 條款，Copyright 2026 judragon005）。

### Task 5: 規範化命名與全域死鏈徹底修復
1. **重命名 Spec 0171**：
   * 將 `docs/specs/0171-technical-debt-batch-cleanup-sync-checkpoints-and-api-key-manager.md` 重命名為 `docs/specs/0171-technical-debt-batch-cleanup-sync-checkpoints-and-api-key-manager-spec.md`。
2. **修復 `docs/handoff/handoff_stock_tracker_final.md`**：
   * 修正 Spec 0132～0135 平移錯位。
   * 修正 Spec 0138 檔名拼寫（加入 `-market-`）。
   * 修正 Spec 0171 鏈結對應。
   * 修正 ADR 0175 與 `.scratch/v8.87/issues/` 鏈結。
3. **修復 `CONTEXT.md`**：
   * 修正 ADR-0049 之檔名為 `docs/adr/0049-ex-dividend-smoothing-and-dividend-log-architecture.md`。
4. **修復 `docs/specs/0151` 與 `0152`**：
   * 修正 `../adr/0140-ai-force-decision-dashboard.md` 為 `../adr/0140-ai-force-decision-dashboard-architecture.md`。
5. **修復 `docs/debts/` 內部源碼相對路徑**：
   * 將 0020~0029 等文檔中出現的 `[src/engine/...](src/engine/...)` 全數修復為 `../../src/engine/...`。

### Task 6: CHANGELOG.md 斷更復甦
* 在 [CHANGELOG.md](file:///d:/APP/股票紀錄/CHANGELOG.md) 最頂端，將 V6.0.0 到 V8.89.0 之重大發布紀錄分階段補齊：
  * V6.0.0 ~ V6.9.7：官方股票字典、除息空窗平滑、除息日與發放日時態分離、減資管道、存儲檢驗器。
  * V7.0.0 ~ V7.9.0：目標配置再平衡、持倉訊號膠囊、主力資金流動氣泡圖、TPEX 官方解析器。
  * V8.0.0 ~ V8.9.0：主力戰情室微觀結構、雙動能輪動、黑天鵝質押逃生矩陣、宏觀流動性顧問、肌肉書僮量化系統。
  * V8.10.0 ~ V8.52.0：FIRE 複利試算、ETF 穿透審計、財務三表法醫分析、全市場歷史批次補回。
  * V8.53.0 ~ V8.89.0：AI 主力戰情室 Bento-Grid、SQLite 數據湖倉、美股全市場攝取、TDCC 與月營收新鮮度自動自癒管線。

### Task 7: 建立文檔自動化守門機制
1. 建立 `scripts/verify-docs.cjs`。
2. 在 `package.json` 中的 `scripts` 區塊新增：
   ```json
   "lint:docs": "node scripts/verify-docs.cjs"
   ```

---

## 4. 驗收標準 (Acceptance Criteria)

1. **守門檢驗**：執行 `npm run lint:docs` 產出 100% 綠燈，死鏈數為 0，Spec 與 ADR 無任何孤立缺失。
2. **測試不破壞**：執行 `npm test`，所有 210 個測試檔案與 1,553 個測試用例維持 100% 通過。
3. **構建不破壞**：執行 `npm run build`，TypeScript 0 錯誤，Vite 生產環境打包順利產出。
4. **工作區整潔**：`git status` 無任何孤立殘留垃圾檔，根目錄備份檔已妥善收斂至 `docs/json/`。
