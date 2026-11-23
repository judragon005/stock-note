# Spec 0243: QNAP NAS 24/7 生產伺服器 SSOT 收斂、SQLite WAL 優雅關機、全代理補齊與 Docker Hub 雙標籤發版規格

## Problem Statement

使用者平常在筆電本機進行開發，但專案長期目標是部署於家中 QNAP TS-h973AX (QuTS hero / ZFS) NAS 進行 24/7 無人值守運行。實地盤點現有部署與生產伺服器架構後，發現 5 項會在 NAS 長期運行時引發資料遺失、功能失效或維護腦裂的底層缺口：

1. **雙軌容器與伺服器腦裂（Split-Brain Deployment）**：
   - 專案內同時存在兩套互不相容的 Docker 定義與生產伺服器：舊版部署軌道掛載 `/app/.scratch/market-cache`，具備 FRED / TWSE 代理但缺少 24/7 自動排程器與健康檢查；新版軌道具備自動排程器與多階段建置，卻將資料庫路徑寫死為 `/data/market_history.db`，與 QNAP 既有的 `/share/Container/stock-data:/app/.scratch/market-cache` 掛載路徑完全錯位，直接更新會導致 NAS 上既有的 SQLite 歷史庫瞬間「隱形」並寫入容器揮發層。
2. **NAS 生產伺服器遺漏關鍵外部代理路由**：
   - 新版 NAS 伺服器僅提供市場湖倉 API 與 Yahoo 代理，缺少宏觀戰情室與台股即時查詢仰賴的通用 SSRF 白名單代理、FRED 代理、TWSE 官網代理、TWSE OpenAPI 代理與 TPEx 代理，搬上 NAS 後將導致對應模組出現 404 或 CORS 失敗。
3. **缺乏 `SIGTERM` 優雅關機與 SQLite WAL 強制落盤保護**：
   - 本地 SQLite 湖倉啟用了 WAL（Write-Ahead Logging）模式，但生產伺服器未註冊 `SIGTERM` / `SIGINT` 訊號處理。當 QNAP NAS 進行系統重開機或 Container Station 執行「停止／重新啟動」時，進程在 10 秒後遭 `SIGKILL` 強制終止，未完成 WAL Checkpoint 與安全關閉連線，長期於 ZFS 磁碟上運行存在 `.db-wal` 殘留與資料庫損毀風險。
4. **無頭排程器缺少宏觀增量同步、環境變數金鑰注入與定期資料庫備份**：
   - 現行 NAS 自動排程器每日僅執行台股與美股日線同步，未涵蓋每日宏觀數據更新；且背景伺服器無法讀取筆電瀏覽器內的本地金鑰設定，需支援透過環境變數注入外部 API 金鑰（未設定時優雅降級免費源）。此外，長期無人值守運行缺乏自動滾動備份機制，一旦發生異常缺乏一鍵還原保險。
5. **非安全上下文（純 HTTP）限制與單標籤盲推風險**：
   - 專案前端加密與金鑰儲存引擎依賴瀏覽器標準 Web Crypto API，在筆電 `localhost` 受瀏覽器豁免，但透過家用區網純 HTTP IP 連線 NAS 時會遭瀏覽器封鎖；同時現有發版流程僅手動推送單一 `:latest` 標籤且缺少推送前容器冒煙測試，若誤推異常映像檔將無法在 NAS 端快速回滾。

---

## Solution

建立**「單一權威 NAS 生產架構（SSOT）＋ 100% 向後相容 QNAP 既有磁碟掛載 ＋ SQLite WAL 優雅關機與滾動備份 ＋ 冒煙驗證後雙標籤推送 Docker Hub」**的完整發版與長期運行強化方案：

1. **生產伺服器與 Docker 定義單一權威收斂（SSOT Convergence）**：
   - 以統一的零依賴 Node.js 22 生產伺服器作為唯一後端入口，完整整合靜態 SPA 託管、市場湖倉 API、24/7 無頭自治排程器、健康檢查端點與全量外部代理（Yahoo、FRED、TWSE 官網、TWSE OpenAPI、TPEx、以及受 SSRF 白名單保護的通用代理）。
   - 容器預設資料庫路徑對齊 `/app/.scratch/market-cache/market_history.db`，100% 向後相容 QNAP 既有的 `/share/Container/stock-data:/app/.scratch/market-cache` 掛載設定（QNAP 端免修改任何 YAML 掛載即無縫承接既有歷史庫），同時保留透過 `LAKEHOUSE_DB_PATH` 環境變數自訂覆寫的能力。
   - 收斂部署資源目錄內的舊版重複 Dockerfile 與伺服器，消除雙軌維護漂移。
2. **POSIX 優雅關機（Graceful Shutdown）與 SQLite WAL 落盤護欄**：
   - 生產伺服器註冊 `SIGTERM` 與 `SIGINT` 訊號監聽器：接獲停機訊號後立即停止無頭排程器、停止接收新 HTTP 連線、對 SQLite 湖倉執行 `PRAGMA wal_checkpoint(TRUNCATE)` 強制將 WAL 日誌刷回主檔並安全關閉資料庫連線，於逾時保護內以 Exit Code `0` 乾淨退出。
3. **24/7 無頭排程器補強與自動滾動備份**：
   - 每日盤後增量任務擴充宏觀數據同步（自動讀取環境變數 `FRED_API_KEY` 等可選金鑰，未提供時優雅降級免費資料源）。
   - 每週全市場湖倉同步成功後，自動於同一個持久化目錄產生 SQLite 滾動快照備份（僅保留最新 2 份，避免無限膨脹磁碟空間），並在 `/healthz` 健康檢查端點回報資料庫路徑、檔案大小、排程器狀態與最近備份資訊，提供長期運行可觀測性。
4. **部署文件現代化與 HTTPS 安全上下文指引**：
   - 更新 QNAP NAS 部署指南與部署總覽索引：對齊新的單一 Multi-Stage Dockerfile 與雙標籤發版指令、補充環境變數選配說明，並增補「為何建議透過 QNAP 反向代理 HTTPS 或 Tailscale Serve HTTPS 連線以解鎖瀏覽器 Web Crypto 安全上下文」的實戰指引。
5. **推送前容器冒煙測試與不可變雙標籤推送 Docker Hub**：
   - 以 `linux/amd64` 目標架構建置生產映像檔（對應 QNAP AMD Ryzen V1500B），推送前於本機啟動隔離容器掛載臨時磁碟，自動化驗證 `/healthz`、`/api/market/sync-status`、代理路由與 `SIGTERM` 優雅退出行為。
   - 驗證 100% 通過後，同步推送不可變版號標籤（`judragon003/stock-tracker:v9.26.0`）與滾動標籤（`judragon003/stock-tracker:latest`）至 Docker Hub。

---

## User Stories

### 一、單一權威容器與 QNAP 零痛無縫升級
1. 身為 QNAP NAS 使用者，我希望更新 Docker Hub 映像檔後，在 Container Station 直接拉取重啟就能無縫沿用我原本 `/share/Container/stock-data` 裡的歷史 SQLite 資料庫，不需要修改原本的磁碟掛載路徑或手動搬移檔案。
2. 身為系統維護者，我希望全專案只有一套權威的生產伺服器與多階段 Dockerfile，避免日後改功能時忘記同步另一套造成部署腦裂。
3. 身為 NAS 進階使用者，我希望在需要自訂磁碟結構時，依然可以透過 `LAKEHOUSE_DB_PATH` 環境變數覆寫預設資料庫路徑，且預設不設定時自動落於相容路徑。
4. 身為 QNAP TS-h973AX 使用者，我希望推送至 Docker Hub 的映像檔明確為 `linux/amd64` 架構，避免跨平台建置錯誤導致 NAS 無法啟動容器。
5. 身為開發者，我希望容器建置過程於 Docker Multi-Stage 內部自動完成前端編譯，不需要依賴我本機 Windows 先手動執行建置而產生環境差異或過期產物。

### 二、全量外部代理與功能零退化
6. 身為宏觀戰情室使用者，我希望在 NAS 上開啟網頁時，FRED 總經指標與通用白名單代理都能正常轉發並解除瀏覽器 CORS 限制，與本機開發環境行為完全一致。
7. 身為台股投資人，我希望在 NAS 上使用即時報價或查詢功能時，TWSE 官網、TWSE OpenAPI、TPEx 櫃買中心與 Yahoo Finance 的反向代理全部暢通，不會出現 404 錯誤。
8. 身為注重資安的家庭 NAS 管理員，我希望通用代理端點嚴格執行主機白名單驗證（SSRF 防護），拒絕代理任何未授權的內網 IP 或外部未知網域，並附加標準安全回應標頭。
9. 身為靜態資源使用者，我希望前端 SPA 的路由刷新能正常回退至主頁面，並具備目錄遍歷防護與合理的快取標頭策略。

### 三、24/7 穩定運行、優雅關機與資料庫安全
10. 身為 QNAP ZFS NAS 管理員，我希望在 NAS 重開機或容器停止時，伺服器能攔截 `SIGTERM` 訊號並先執行 SQLite WAL Checkpoint 落盤再安全關閉資料庫，避免遭強制終止造成資料庫損毀。
11. 身為長期無人值守使用者，我希望 NAS 內建排程器每天盤後除了更新台美股行情外，也會一併更新宏觀市場數據，讓我隨時打開網頁看到的都是最新指標。
12. 身為有申請免費 FRED API Key 的使用者，我希望可以在 NAS 容器環境變數中設定金鑰供背景排程器使用，而沒有設定時排程器也能自動降級使用免費來源不報錯。
13. 身為擔心硬碟或操作意外的使用者，我希望系統在每週完成全市場湖倉更新後，自動於持久化目錄保留最新 2 份資料庫快照備份，既能保底救災又不會塞爆 SSD 容量。
14. 身為維運觀察者，我希望存取 `/healthz` 端點就能一目了然看到伺服器健康狀態、實際使用的資料庫路徑、資料庫檔案大小以及排程器最近執行狀態。

### 四、HTTPS 安全上下文指引與可回滾發版
15. 身為使用手機與筆電連線家中 NAS 的使用者，我希望部署文件清楚說明純 HTTP IP 連線會導致瀏覽器停用 Web Crypto API，並提供透過 Tailscale HTTPS 或 QNAP 反向代理啟用 HTTPS 的明確步驟。
16. 身為發版操作者，我希望每次發佈到 Docker Hub 前，本機都會先實際啟動新映像檔容器完成端點與關機冒煙驗證，確認零故障才推送至遠端倉庫。
17. 身為謹慎的系統使用者，我希望每次發版都同時推送「不可變版號標籤（如 `v9.26.0`）」與 `latest` 標籤，萬一新版在 NAS 上有未預期問題，我能在 10 秒內把版號改回前一版立即復原。
18. 身為未來的自己或協作開發者，我希望部署資源目錄內的說明文件、範例編排檔與索引都能精準反映最新架構與指令，不殘留已過時的舊流程誤導操作。

---

## Implementation Decisions

1. **單一權威生產伺服器收斂（Production Server SSOT）**：
   - 強化現有 NAS 生產伺服器模組，使其成為專案唯一生產後端入口，保持零外部 npm 依賴（純 Node.js 22 原生模組）。
   - 完整補齊與本機開發伺服器及舊版 NAS 伺服器對等之代理路由契約：
     - `/api/market/*`：本地 SQLite 數據湖倉 REST API 中介層。
     - `/api/yahoo/*`：Yahoo Finance 反向代理。
     - `/api/twse-www/*`：臺灣證券交易所官網反向代理。
     - `/api/twse/*`：臺灣證券交易所 OpenAPI 反向代理。
     - `/api/tpex/*`：證券櫃買中心反向代理。
     - `/api/fred/*`：FRED 總經 API 反向代理。
     - `/api/proxy?url=...`：受嚴格網域白名單（SSRF Guard）保護的通用反向代理，並正確附加 CORS 回應標頭與支援 `OPTIONS` 預檢請求。
     - `/healthz`：回傳 JSON 健康資訊，包含服務狀態、實際資料庫路徑、資料庫檔案大小（bytes）、排程器啟用與最近執行狀態。
   - 保留統一安全標頭（`X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy`）與 SPA 靜態託管及目錄遍歷防禦。
2. **POSIX 優雅關機與 SQLite WAL 強制落盤契約**：
   - 為生產伺服器工廠函式提供可測試的 `gracefulShutdown` 方法，並於直接執行入口點註冊 `SIGTERM` 與 `SIGINT` 事件監聽。
   - 停機順序嚴格為：防重入鎖定 ➔ 停止無頭排程器 ➔ 關閉 HTTP 伺服器停止接新連線 ➔ 對開啟中的 SQLite 連線執行 `PRAGMA wal_checkpoint(TRUNCATE)` ➔ 安全關閉 SQLite 連線 ➔ 乾淨結束進程（含強制逾時保底，避免掛起超過 Docker 10 秒寬限期）。
3. **100% 向後相容的預設資料庫掛載契約**：
   - 根目錄 Multi-Stage Dockerfile 移除硬寫死之 `ENV LAKEHOUSE_DB_PATH=/data/market_history.db`，改為預先建立 `/app/.scratch/market-cache` 目錄並暴露對應持久化語意；資料庫核心連線層維持既定優先序（顯式參數 > `LAKEHOUSE_DB_PATH` 環境變數 > 預設 `/app/.scratch/market-cache/market_history.db`）。
   - 此設計確保 QNAP 既有編排檔（掛載 `/share/Container/stock-data:/app/.scratch/market-cache`）免做任何修改即可直接承接原有資料庫，同時保留容器進階用戶透過 `LAKEHOUSE_DB_PATH` 自訂掛載點的彈性。
4. **24/7 無頭排程器擴充（宏觀同步與滾動備份）**：
   - 每日盤後排程在台美股同步之外，納入宏觀數據同步（從環境變數安全讀取可選 `FRED_API_KEY`，未設定時不中斷且降級採用免費來源）。
   - 每週同步完成後，呼叫純函式備份機制在資料庫同目錄建立時間戳快照（`market_history.backup-YYYYMMDD.db`），寫入前先執行 WAL Checkpoint 確保快照一致性，並自動清理超出保留上限（預設保留最新 2 份）之舊備份檔。
5. **部署資源目錄收斂與文檔同步**：
   - 消除雙軌維護：將部署目錄內的舊版編排檔、索引文件與 QNAP 部署指南全面對齊根目錄 Multi-Stage Dockerfile、`scripts/nas-server.cjs` 與雙標籤發版 SOP；移除或標記淘汰重複的舊版伺服器與過時 Dockerfile 差異。
   - 於 QNAP 部署指南中增補「HTTPS 安全上下文存取指引（解決純 HTTP 停用 Web Crypto API 問題）」與「選配環境變數清單（`FRED_API_KEY`、`DISABLE_BUILTIN_SCHEDULER`、`LAKEHOUSE_DB_PATH`）」。
6. **自動化容器冒煙驗證與 Docker Hub 雙標籤發布**：
   - 程式碼透過標準 TDD 與 PR 合併回主幹後，執行 `linux/amd64` 平台建置並以本機臨時容器完成端點與 `SIGTERM` 優雅停機冒煙驗證。
   - 驗證通過後推送 `judragon003/stock-tracker:v9.26.0` 與 `judragon003/stock-tracker:latest` 至 Docker Hub。

---

## Testing Decisions

好測試的標準：**僅透過公開介面與外部可觀察行為進行驗證（HTTP 請求回應、SQLite 檔案與備份狀態、訊號停機回傳），不耦合私有實作細節；外部上游網路請求一律以依賴注入之 Mock Fetcher／Mock Handler 隔離，確保測試離線、快速且 100% 確定。**

本規格收斂至 **2 個高層級測試縫隙（Test Seams）**（直接擴充既有 Spec 0242 測試套件）：

1. **Seam 1：NAS 生產伺服器全路由契約與 `SIGTERM` 優雅關機驗證**
   - 驗證目標：
     - `/healthz` 回傳 200 且包含 `dbPath`、`dbSizeBytes` 與 `scheduler` 狀態。
     - `/api/proxy` 對白名單網域正確轉發並附帶 CORS 標頭，對非白名單網域（如內網 IP `127.0.0.1` 或未授權網域）回傳 `403 Forbidden`（SSRF 防護）。
     - `/api/twse-www/*`、`/api/twse/*`、`/api/tpex/*`、`/api/fred/*`、`/api/yahoo/*` 路由正確解析與轉發（以注入之 Mock Upstream 驗證，不發起真實外部連線）。
     - 觸發 `gracefulShutdown()` 時正確停止排程器、執行 SQLite WAL Checkpoint 並安全關閉連線。
   - 既有先例：擴充既有 Spec 0242 NAS 伺服器整合測試。
2. **Seam 2：NAS 自治排程器每日宏觀同步與每週滾動備份保留契約**
   - 驗證目標：
     - 每日視窗觸發時同時執行台美股與宏觀同步，單一模組失敗時錯誤隔離不影響其他任務。
     - 每週滾動備份函式於暫存目錄連續建立 4 次不同日期快照後，目錄內精確僅保留最新 2 份有效備份檔且不影響主資料庫讀寫。
   - 既有先例：擴充既有 Spec 0242 排程器確定性時間測試。

---

## Out of Scope

1. **NAS 端跨裝置個人帳本加密同步箱（對應技術債 Debt 0046）**：將前端 IndexedDB 個人持股與交易紀錄透過 `/api/vault/backup` 自動加密同步至 NAS 磁碟，因涉及前端設定 UI、衝突解決策略與密碼學金鑰生命週期，明確排除於本期外，列為下一獨立規格專題。
2. **QNAP 實體主機端遠端 SSH 自動操作**：本專案僅負責推送已驗證的 Docker Hub 映像檔與更新部署文件，NAS 本體的拉取重啟與 Tailscale / 反向代理設定由使用者於 QNAP 介面執行。
3. **CI/CD GitHub Actions 自動推送 Docker Hub**：因專案遵循 GitHub Actions 防濫用與低算力合規原則，且未於遠端倉庫配置 Docker Hub PAT Secret，本期採用本機確定性建置、本機容器冒煙測試後手動／腳本觸發推送。

---

## Further Notes

- **零資料遺失保障**：完成本次更新後，使用者於 QNAP Container Station 拉取 `judragon003/stock-tracker:latest` 並重啟應用程式，即可立即獲得 Spec 0242 主力戰情室司令台 + 24/7 自動排程 + WAL 安全關機保護，原有 `/share/Container/stock-data/market_history.db` 歷史數據 100% 保留。
- **HTTPS 建議**：長期從筆電與手機連線家中 NAS 時，強烈建議搭配 QNAP 內建反向代理 HTTPS 或 Tailscale Serve HTTPS，以確保瀏覽器 Web Crypto API（金鑰加密與 E2EE 備份）全功能正常運作。
