# 0163. 券商法人級全維度數據湖倉稽核、歷史籌碼斷層回補與台美雙軌自動化日更管線

- 日期：2026-10-03
- 狀態：已採納 (Accepted)
- 關聯 Issue：#159
- 關聯規格：[Spec 0163: 券商法人級全維度數據湖倉稽核、歷史籌碼斷層回補與台美雙軌自動化日更管線](../specs/0163-broker-grade-lakehouse-audit-full-backfill-and-dual-market-sync-spec.md)

## 背景與問題脈絡 (Context)

在完成 Spec 0162 之後，對本機 SQLite 數據湖倉 (`market_history.db`) 進行券商法人級深層稽核，發現存在以下資料完整性缺失與日更中斷隱患：
1. **三大法人籌碼歷史斷層 (Gap)**：既有 CSV 歷史資料僅收錄至 2026-08-14，8/15 ~ 10/02 有長達 34 個交易日斷層，導致 20 日主力籌碼與近期法人買賣超完全真空。
2. **T86 鍵名映射致命 Bug**：`sync-tw-market.cjs` 與 `ingest-tw-t86.cjs` 的鍵名不匹配（`foreignNetShares` vs `foreignNet`），導致每日定時寫入的數值全被洗成 0。
3. **信用交易與借券賣出未串接每日管線**：融資融券、借券賣出 (SBL) 及當沖率只在靜態歷史中存在，每日同步腳本未拉取證交所對應 API。
4. **美股特殊符號抓取 404**：Yahoo Finance API 對代碼含點號標的（如 `BRK.B`, `BF.B`）回傳 404，需轉為連字符（如 `BRK-B`, `BF-B`）；且有 348 檔標的被標記為 FAILED 永久中斷。
5. **缺少法人頂級決策維度**：缺乏「集保千張大戶持股比例 (TDCC)」與「月營收年增率 (MoM/YoY)」，阻礙基本面與籌碼面雙重交叉驗證。
6. **缺乏一鍵雙軌自動化排程**：使用者需手動執行腳本，且無台美雙軌分離的 Windows 排程整合。

## 決策內容 (Decision)

1. **擴展資料庫結構與複合索引 (Ticket 01)**：
   - 新增 `tw_tdcc_distribution`（集保股權分散表，收錄千張大戶比例、總股東人數等）與 `tw_monthly_revenue`（月營收表，收錄營收、MoM、YoY、累計 YoY）。
   - 建立 `idx_tw_tdcc_sym_date` 與 `idx_tw_rev_sym_date` 覆蓋索引。
2. **修復 T86 鍵名映射 (Ticket 02)**：
   - 在 `ingest-tw-t86.cjs` 採雙向相容取值，徹底解決數值被洗為 0 的問題。
3. **美股符號標準化轉譯與斷點重置 (Ticket 03)**：
   - 實作 `normalizeUsSymbol`，抓取前將 `.` 轉譯為 `-`；提供重置 348 檔 FAILED 標的為 PENDING 的安全重試機制。
4. **台股擴展籌碼每日串聯 (Ticket 04)**：
   - 在 `sync-tw-market.cjs` 自動拉取 TWSE MI_MARGN (融資券)、TWT93U (借券賣出) 與 TWTB4U (當沖)，自動合併寫入 `tw_institutional_chips`。
5. **歷史斷層回補引擎 (Ticket 05)**：
   - 建立 `backfill-historical-chips-gap.cjs`，自動計算 2026-08-15 至當前日期之交易日清單，按日抓取全市場 T86 批次入庫，並具備非阻塞批次入庫與指數退避防封鎖機制。
6. **集保大戶持股與月營收入庫模組 (Ticket 06 & 07)**：
   - 實作 `ingest-tw-tdcc.cjs` 與 `ingest-tw-monthly-revenue.cjs`，支援批次入庫與重試容錯。
7. **Windows 工作排程與全光譜審計報告 (Ticket 08)**：
   - 擴充 `setup-windows-task.bat` 選單（台股日更 15:30、美股日更 06:00、歷史斷層一次性回補）；在 `audit-verifier.cjs` 實作 `auditFullLakehouseSpectrum`，自動產出驗收報告 `sync_audit_report.json`。

## 替代方案評估 (Trade-offs & Alternatives)

| 方案 | 優點 | 缺點 / 權衡 | 結論 |
| :--- | :--- | :--- | :--- |
| **方案 A：僅手動執行外部爬蟲** | 零資料庫架構變更 | 人工作業繁瑣，易遺漏斷層，前台查詢無本地索引緩存 | 拒絕 |
| **方案 B：直接將歷史數據存成龐大 JSON/CSV** | 不用改動 SQLite | 查詢需全檔讀入記憶體，效能低下且無法跨維度 SQL 聯合查詢 | 拒絕 |
| **方案 C：SQLite 全維度湖倉擴展 + 每日自動化雙軌管線 (本決策)** | 一致性高、<10ms 極速讀取、全量離線可用、自動化定期更新 | 需要設計穩健的覆蓋索引與網路限速防封鎖機制 | **採納** |

## 後續影響 (Consequences)

- **正面影響**：
  - 填補了 34 個交易日的籌碼空白，主力戰情室可精確計算 20 日/60 日籌碼集中度。
  - 新增集保千張大戶持股比與月營收成長數據，使系統具備券商法人級基本面與籌碼面全光譜分析能力。
  - Windows 工作排程完全自動化每日收盤後數據更新，使用者無需手動干預。
- **負面影響/維護成本**：
  - 每日排程需監控證交所 API 異動與網路阻斷風險，需透過 `audit-verifier.cjs` 定期確認湖倉健康度。
