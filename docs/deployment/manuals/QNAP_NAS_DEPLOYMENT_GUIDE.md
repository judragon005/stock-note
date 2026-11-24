# QNAP TS-h973AX-32G NAS 24/7 生產部署手冊

本文件記錄專案在 QNAP QuTS hero (ZFS) NAS 上透過 Docker (Container Station 3) 進行 24/7 無人值守生產部署的完整規格、HTTPS 安全上下文設定、選配環境變數與可回滾雙標籤發版 SOP（對齊 Spec 0243 SSOT）。

---

## 1. 目標硬體與系統環境

- **設備型號**：QNAP TS-h973AX-32G (9-bay 混合式 NAS)
- **CPU**：AMD Ryzen Embedded V1500B (4 核心 / 8 執行緒, x86_64 `linux/amd64`)
- **記憶體**：32 GB DDR4
- **儲存配置建議**：
  - **系統池與容器 (NVMe SSD 1/2)**：高 IOPS 與寫入壽命，存放 Container Station 容器與 SQLite 數據湖倉 (`/share/Container/stock-data`)。
  - **大容量儲存 (HDD 1/2)**：冷資料與大型歸檔。
- **作業系統與平台**：QNAP QuTS hero (ZFS) + Container Station 3

---

## 2. 單一權威生產架構 (SSOT)

- **權威入口**：根目錄 [`Dockerfile`](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/Dockerfile)（Node 22 Alpine Multi-Stage，於容器內自動編譯前端）啟動 [`scripts/nas-server.cjs`](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/scripts/nas-server.cjs)（零外部 npm 依賴）。
- **單一進程整合能力**：
  1. 前端 SPA 靜態託管（含目錄遍歷防護與安全回應標頭）
  2. 本地 SQLite 數據湖倉 API（`/api/market/*`，Node 22 原生 `node:sqlite`）
  3. 全量外部反向代理：`/api/yahoo/*`、`/api/fred/*`、`/api/twse-www/*`、`/api/twse/*`、`/api/tpex/*`，以及受 SSRF 主機白名單保護的 `/api/proxy?url=...`（含 CORS 與 `OPTIONS` 預檢）
  4. **24/7 無頭自治排程器**：每日盤後自動同步台美股日線與宏觀數據；每週全市場同步成功後自動產出一致性 SQLite 快照備份（僅保留最新 2 份 `market_history.backup-YYYYMMDD.db`）
  5. **POSIX `SIGTERM`/`SIGINT` 優雅關機**：接獲容器停止或 NAS 重開機訊號後，依序停排程器 → 關閉 HTTP → 執行 `PRAGMA wal_checkpoint(TRUNCATE)` 強制 WAL 落盤 → 安全關閉 SQLite → 以 Exit Code `0` 退出，杜絕 ZFS 磁碟上遭 `SIGKILL` 損毀資料庫。
- **資料持久化（100% 向後相容 QNAP 既定掛載）**：
  - 容器預設讀寫 `/app/.scratch/market-cache/market_history.db`，直接承接既有 `/share/Container/stock-data:/app/.scratch/market-cache` 掛載，升級免搬移資料。

---

## 3. QNAP Container Station 部署與升級

### 3.1 建立或更新應用程式

1. 開啟 **Container Station** → 左側 **「應用程式 (Applications)」** → 點選 **「建立 (Create)」**（既有環境則直接點選既有 `stock-tracker` → 重新拉取映像並重啟）。
2. YAML 設定對齊 [`docker-compose.yml`](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/docs/deployment/docker/docker-compose.yml)：

```yaml
services:
  stock-tracker:
    # 滾動最新標籤；如需鎖定版號或快速回滾，改為不可變標籤（如 :v9.26.0）
    image: judragon003/stock-tracker:latest
    container_name: stock-tracker
    restart: unless-stopped
    stop_grace_period: 10s
    ports:
      - "13000:3000"
    environment:
      - TZ=Asia/Taipei
      - NODE_ENV=production
      # 選配：免費 FRED API Key（未設定時自動降級免 Key 公開來源）
      # - FRED_API_KEY=your_fred_api_key
      # 選配：覆寫資料庫路徑（預設 /app/.scratch/market-cache/market_history.db）
      # - LAKEHOUSE_DB_PATH=/app/.scratch/market-cache/market_history.db
      # 選配：停用內建 24/7 排程器
      # - DISABLE_BUILTIN_SCHEDULER=true
    volumes:
      - /share/Container/stock-data:/app/.scratch/market-cache
```

### 3.2 選配環境變數一覽

| 環境變數 | 預設值 | 說明 |
| :--- | :--- | :--- |
| `TZ` | `Asia/Taipei` | 盤後排程與快照日期計算基準時區 |
| `PORT` / `HOST` | `3000` / `0.0.0.0` | 容器內部監聽埠與介面 |
| `LAKEHOUSE_DB_PATH` | `/app/.scratch/market-cache/market_history.db` | 自訂 SQLite 檔案路徑（未設時 100% 相容 QNAP 既定掛載） |
| `FRED_API_KEY` | *(選配，空)* | 供背景每日宏觀排程器使用；未設定時自動降級免費 CSV 來源不報錯 |
| `DISABLE_BUILTIN_SCHEDULER` | `false` | 設為 `true` 可停用容器內建排程器，改由外部排程接管 |

---

## 4. HTTPS 安全上下文存取指引（解鎖 Web Crypto API）

> [!IMPORTANT]
> 本專案前端金鑰加密與 E2EE 備份引擎使用瀏覽器標準 Web Crypto API (`crypto.subtle`)。瀏覽器僅在 **`localhost`** 或 **HTTPS** 安全上下文（Secure Context）下啟用 `crypto.subtle`；若直接以純 HTTP 區網 IP（例如 `http://192.168.1.100:13000`）開啟網頁，瀏覽器會強制封鎖 `crypto.subtle`。

建議採用以下任一方案啟用 HTTPS：

### 方案 A：Tailscale Serve HTTPS（推薦，跨外網與手機最省事）
1. 登入 Tailscale Admin Console → **DNS** 頁面，啟用 **MagicDNS** 與 **HTTPS Certificates**（一次性設定，系統會自動申請並續簽有效 SSL 憑證）。
2. 依您於 QNAP 上安裝 Tailscale 的方式執行 `tailscale serve`：
   - **Docker 版 Tailscale（安裝於 Container Station 容器內，推薦）**：
     1. 於 Container Station 左側選 **「容器」** → 點進 `tailscale` 容器 → 點選上方 **「執行 (Exec)」** → 執行 `/bin/sh`（或 SSH 進 NAS 執行 `docker exec -it tailscale sh`）。
     2. 先測試 `wget -qO- http://127.0.0.1:13000/healthz` 判斷容器網路模式：
        - **有回傳 JSON（`network_mode: host`）**：
          ```sh
          tailscale serve --bg http://127.0.0.1:13000
          ```
        - **無法連線（Bridge 獨立網段）**：改指 NAS 區網 IP
          ```sh
          tailscale serve --bg http://<NAS的區網IP>:13000
          ```
     3. 執行 `tailscale serve status` 確認已將 `https://<節點名>.<tailnet>.ts.net` 轉發至 Port `13000`。
   - **QNAP App Center 原生套件版**：
     SSH 進入 QNAP NAS 執行：
     ```bash
     tailscale serve --bg 13000
     ```
3. 手機與筆電連上 Tailscale 後開啟 `https://<節點名>.<tailnet>.ts.net`，即自動享有有效憑證 HTTPS 安全上下文與端對端加密穿透，無需於路由器開 Port。

### 方案 B：QNAP 內建反向代理 HTTPS（純區網 / 自有網域）
1. 開啟 QNAP **控制台** → **網路與檔案服務** → **網路存取** → **反向代理** → 點選 **新增**。
2. 設定規則：
   - **來源**：通訊協定 `HTTPS`、網域填寫您的 NAS DDNS（例如 `my-nas.myqnapcloud.com`）、連接埠 `443`（或自訂 HTTPS 埠如 `13443`）
   - **目的**：通訊協定 `HTTP`、主機名稱 `localhost`、連接埠 `13000`
3. 於 **控制台 → 安全性 → 憑證與私密金鑰** 套用有效的 Let's Encrypt / myQNAPcloud SSL 憑證後，以 `https://<網域>` 存取即可。

---

## 5. 雙標籤建置、本機冒煙閘門與發版 SOP

Multi-Stage Dockerfile 會於容器內自動編譯前端，本機無需先執行 `npm run build`：

1. **建置 `linux/amd64` 雙標籤映像檔**：
   ```powershell
   docker build --platform linux/amd64 `
     -t judragon003/stock-tracker:v9.26.0 `
     -t judragon003/stock-tracker:latest .
   ```
2. **推送前本機容器冒煙驗證**：
   ```powershell
   $smokeDir = Join-Path $env:TEMP "st-smoke-db"
   New-Item -ItemType Directory -Force -Path $smokeDir | Out-Null
   docker run -d --name st-smoke -p 13001:3000 -v "${smokeDir}:/app/.scratch/market-cache" judragon003/stock-tracker:v9.26.0
   Invoke-RestMethod http://127.0.0.1:13001/healthz
   Invoke-RestMethod http://127.0.0.1:13001/api/market/sync-status
   # 驗證 SSRF 防護（應回傳 HTTP 403）
   curl.exe -i "http://127.0.0.1:13001/api/proxy?url=http%3A%2F%2F127.0.0.1%3A8080%2F"
   # 驗證 SIGTERM 優雅退出（ExitCode 應為 0）
   docker stop st-smoke
   docker inspect -f '{{.State.ExitCode}}' st-smoke
   docker rm st-smoke
   ```
3. **推送不可變版號與 `latest` 雙標籤至 Docker Hub**：
   ```powershell
   docker push judragon003/stock-tracker:v9.26.0
   docker push judragon003/stock-tracker:latest
   ```
4. **10 秒快速回滾**：若新版異常，在 Container Station 將 YAML 的 `image:` 改回前一版號（例如 `judragon003/stock-tracker:v9.25.0`）重新啟動即可。

---

## 6. 長期運行觀測與快照還原

- **即時健康診斷**：存取 `GET /healthz` 可檢視 `status`、`dbPath`、`dbSizeBytes`、`scheduler`（最近每日/宏觀/每週執行日期）與 `latestBackup`。
- **滾動備份還原步驟**：
  1. 在 Container Station **停止** `stock-tracker` 容器。
  2. 進入 `/share/Container/stock-data`，將欲還原的 `market_history.backup-YYYYMMDD.db` 複製覆蓋為 `market_history.db`，並刪除殘留的 `market_history.db-wal` 與 `market_history.db-shm`。
  3. 重新啟動容器即可完成無損還原。
