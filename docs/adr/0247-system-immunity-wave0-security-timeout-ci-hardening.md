# ADR 0247: 系統免疫強化 Wave 0 — 統一 SSRF 守衛、鎖內逾時原語、快照深度脫敏與全端 CI 免疫閘門

- **狀態 (Status)**: Accepted
- **日期 (Date)**: 2026-11-25
- **關聯規格與 Issue**: [Spec 0247](../specs/0247-system-immunity-wave0-security-timeout-ci-hardening-spec.md) / GitHub Issue `#609`

## 背景 (Context)

五路正交法醫審計揭露專案四道底層安全與可靠性防線存在實質破口：

1. `POST /api/market/probe-key` 缺乏主機白名單、私網過濾與 `redirect: 'manual'`，直接穿透 ADR 0243 建立的 `/api/proxy` SSRF 防線；`nas-server.cjs` 亦缺少請求主體上限與上游轉發逾時控制。
2. ADR 0234 建立的「安全脫敏備份」漏洗 `snapshots[*].payload.apiKeys`；`src/utils/storage.ts` 殘留硬編碼特定個人券商明細的 `autoReconcileSchwabRecords` 函式。
3. 全域互斥鎖內的 9 條台美採集與 SEC 代理路徑發起無逾時裸 `fetch()`（遇 TCP 半開可致 NAS 24/7 排程永久死鎖）；`us-fundamentals-ingestion.cjs` 存在 `fetchFn` vs `fetchImpl` 鍵名錯位使 15 秒背景取消鏈失效。
4. `scripts/market-sync/` 底下多支 `.test.cjs` 長期脫離 CI（含假 Lambda 自測與未設目標日連網測試）；`.github/workflows/ci.yml` 漏跑後端測試、正式建置與 `npm run lint:docs`；`vite.config.ts` 開啟 `dangerouslyIgnoreUnhandledErrors: true` 靜默吞錯；`architecturalFitnessGuard.test.ts` 不變量 3 與 7 遭戰情卡片變體色碼與引擎層靜態快取旁路繞過；`docs/deployment/docker/Dockerfile` 遺漏 `market-holidays.json`。

## 決策 (Decision)

1. **Unified SSRF Origin Guard（延伸修訂 ADR 0243）**：
   - 建立零依賴 `scripts/market-sync/ssrf-origin-guard.cjs`（`ALLOWED_OUTBOUND_HOSTS`、`validateOutboundTargetUrl`、`isRedirectResponseStatus`），強制僅允許 HTTPS（限預設 443 埠）與 9 大精確官方金融白名單，阻斷私網／非標準數值 IPv4、IPv6、尾點域名、Loopback、Cloud Metadata 與憑證嵌入。
   - 同步接入 `vite-market-middleware.cjs`（`POST /api/market/probe-key` 強制 `redirect: 'manual'` 並攔截 3xx、逾時涵蓋標頭與內文讀取）與 `nas-server.cjs`（`/api/proxy` 停用 `http:` 與非 443 埠、請求體 1 MB 上限回 `413`、回應體 20 MB 防 OOM 上限回 `502`、3xx 攔截回 `403`、上游轉發 15 秒逾時中斷回 `504`）。
2. **雙軌脫敏全深度清洗與個人財務隱私淨化（修補 ADR 0234）**：
   - 於 `src/engine/csvSanitizer.ts` 抽出單一 `redactApiKeysMap` SSOT，供 `src/utils/db.ts`（`redactSnapshotsForExport` 與 `exportFullDatabaseJSON(true)`）及 `redactBackupData` 共用，涵蓋頂層設定與每筆 `snapshots[*].payload.apiKeys`。
   - 徹底移除 `src/utils/storage.ts` 中 `autoReconcileSchwabRecords` 及其啟動呼叫點。
3. **Deadlock-Free Lock-Scoped Fetch 與美股取消鏈修復**：
   - 於 `scripts/market-sync/market-sync-core.cjs` 新增 `fetchWithTimeout`（以 Node 22 原生 `AbortSignal.timeout` 與 `AbortSignal.any` 複合外部 `AbortSignal`，完整涵蓋標頭與回應體讀取生命週期），遷移全部 9 條鎖內採集管線（TDCC、月營收、除權息、ETF 元數據、宏觀情緒、質押、狀態標記、美股基本面/配息、SEC 代理）達零裸抓取。
   - 於 `scripts/market-sync/us-fundamentals-ingestion.cjs` 統一 `options.fetchImpl || options.fetchFn` 並透傳 `signal` / `timeoutMs`，修復原生取消鏈斷裂。
4. **靜態市場快取物理退場、色票 SSOT 堵漏與 Full-Stack CI Immunity Gate（深化 ADR 0246）**：
   - 退役 `marketCacheLoader.ts` 與 `historicalOhlcvBackfill.ts` 的靜態 `/market-cache/*.json` 抓取旁路，清理 `public/market-cache/` 逾 21 MB 過期靜態檔；補齊 `docs/deployment/docker/Dockerfile` 之 `market-holidays.json` 複製指令。
   - 擴充 `src/constants/designTokens.ts` 方向色票 Token 並收斂 7 張具漲跌方向極性之戰情卡片（`BullBearEnergyCard`、`BullBearStrengthCard`、`AiDecisionCoreCard`、`EnergySentimentTwinCard`、`MonthlyRevenueCard`、`TdccDistributionCard`、`ForceDistributionCard`；`AiConfidenceCard` 屬非方向性品質信心分級卡片維持原品質色系）。
   - 新增 `scripts/run-backend-tests.cjs`（`npm run test:backend`），修正 `sync-tw-market-guard.test.cjs` 直接測試生產函式 `isDualMarketChipsComplete`、修正 `sync-us-market-guard.test.cjs` 離線休市契約、修復 `backfill-tw-history-web.test.cjs` 與 `sqlite-db-core.test.cjs` Node CLI 非同步測試未 `await` 風險、移除重複測試檔；關閉 `vite.config.ts` `dangerouslyIgnoreUnhandledErrors`；於 `.github/workflows/ci.yml` 與 `scripts/pre-push-guard.cjs` 強制執行全端免疫閘門，並將 `architecturalFitnessGuard.test.ts` 強化至 10 條不變量。

## 後果 (Consequences)

- **正向效益**：零新增外部依賴；SSRF 穿透與 9 條鎖內永久死鎖漏洞即時清零；安全脫敏備份與原始碼個人隱私風險歸零；建置產物瘦身 21.74 MB；全端測試與 10 條不可繞過適應度不變量於 CI 自動執行，為 Wave 1–4 技術債清償奠定可信免疫基線。
- **權衡**：`POST /api/market/probe-key` 與 `/api/proxy` 不再允許明文 `http:` 或任意自訂外部非白名單域名（若未來新增官方金融資料供應商，須同步明確登錄於 `ALLOWED_OUTBOUND_HOSTS` 白名單並通過審計）。
