# QNAP TS-h973AX-32G NAS 專案部署手冊

本文件記錄專案在 QNAP QuTS hero (ZFS) NAS 上透過 Docker (Container Station 3) 進行生產環境部署的完整規格、架構決策與操作指南。

---

## 1. 目標硬體與系統環境

- **設備型號**：QNAP TS-h973AX-32G (9-bay 混合式 NAS)
- **CPU**：AMD Ryzen Embedded V1500B (4 核心 / 8 執行緒, 2.2 GHz, x86_64 amd64)
- **記憶體**：32 GB DDR4 (2 x 16 GB SO-DIMM)
- **磁碟槽位與硬體配置 (共安裝 6 顆磁碟)**：
  - **3.5 吋 HDD 槽 (大容量冷資料/檔案儲存)**：
    - HDD 1：Seagate ST24000NT002-3N1101 (約 21.83 TB, 3.5 吋 SATA HDD)
    - HDD 2：Seagate ST24000NT002-3N1101 (約 21.83 TB, 3.5 吋 SATA HDD)
    - HDD 3 ~ HDD 5：空槽 (留待日後擴充)
  - **SSD 槽 (系統池、容器與高頻資料)**：
    - SSD 1：Intel SSDPE2KX020T8 (約 1.82 TB, PCIe / U.2 NVMe SSD)
    - SSD 2：Intel SSDPE2KX020T8 (約 1.82 TB, PCIe / U.2 NVMe SSD)
    - SSD 3：WD WDS100T1R0A-68A4W0 (約 931.51 GB, 2.5 吋 SATA SSD)
    - SSD 4：WD WDS100T1R0A-68A4W0 (約 931.51 GB, 2.5 吋 SATA SSD)
- **儲存角色劃分備註**：
  - **系統與容器 (建議落點)**：Intel NVMe SSD (SSD 1/2) 具備極高 IOPS 與寫入壽命，最適合做為 QuTS hero 系統池 (System Pool) 與 Container Station 容器與 SQLite 資料庫存放處。
  - **大容量儲存**：Seagate 24TB HDD 負責冷資料、系統備份與影音等大量資料儲存。
  - **實際配置依據**：實際 RAID 模式、儲存池與快取配置，部署前以 QuTS hero 儀表板之最新儲存池指派為準。
- **作業系統**：QNAP QuTS hero (ZFS 檔案架構)
- **容器管理平台**：QNAP Container Station 3 (支援 Docker Compose)

---

## 2. 架構設計與決策

### 2.1 整合型全功能容器 (Full-Stack Container)
- **伺服器層**：以 Node.js 原生 HTTP 伺服器 ([`prod-server.cjs`](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/docs/deployment/server/prod-server.cjs)) 同步託管前端 SPA 靜態檔案 (`dist/`)，並提供：
  1. 本地市場 SQLite API (`/api/market/*`)
  2. Yahoo Finance 反向代理 (`/api/yahoo/*`)，解除瀏覽器 CORS 限制
  3. 臺灣證券交易所反向代理 (`/api/twse-www/*`)
- **執行環境**：基於 `node:22-alpine`，支援 Node.js 原生 `node:sqlite`（零第三方 C++ 套件依賴）。
- **資料持久化**：使用 Docker Named Volume (`stock-cache-data`) 自動掛載至容器內 `.scratch/market-cache`，確保歷史量價與籌碼資料在容器重啟時不丟失，且避開 host 權限問題。
- **時區注入**：設定 `TZ=Asia/Taipei`，確保盤後爬蟲與排程計算準確。
- **資源約束**：限制最大記憶體 `1024M`，避免與 QuTS hero ZFS ARC 快取競爭引發 OOM。

---

## 3. 新手小白部署三步驟

### 步驟 1：匯入映像檔至 NAS
- **執行環境**：【QNAP Container Station 網頁介面】
1. 登入 QNAP NAS，開啟 **Container Station**。
2. 左側選單點選 **「映像檔 (Images)」**。
3. 點選右上角 **「匯入 (Import)」** 按鈕。
4. 選擇 **「從 PC 上傳」**，選取本機生成的映像檔：
   `stock-tracker-nas.tar`
5. 點擊確定，匯入完成後映像檔清單會出現 `stock-tracker:latest`。

---

### 步驟 2：建立並啟動應用程式
- **執行環境**：【QNAP Container Station 網頁介面】
1. 左側選單點選 **「應用程式 (Applications)」**。
2. 點選右上角 **「建立 (Create)」**。
3. 填寫欄位：
   - **應用程式名稱**：`stock-tracker`
   - **YAML 設定內容**：貼上 [`docker-compose.yml`](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/docs/deployment/docker/docker-compose.yml) 內容：

```yaml
version: '3.8'

services:
  stock-tracker:
    image: judragon003/stock-tracker:latest
    container_name: stock-tracker
    restart: unless-stopped
    ports:
      - "13000:3000"
    environment:
      - TZ=Asia/Taipei
      - NODE_ENV=production
    volumes:
      # 掛載 NAS 上存放 SQLite 資料庫的實體資料夾
      - /share/Container/stock-data:/app/.scratch/market-cache
```

4. 點選 **「建立」**，Container Station 將自動啟動容器。

---

### 步驟 3：驗證連線
- **執行環境**：【電腦或手機瀏覽器】
1. 打開瀏覽器，輸入網址：
   `http://<NAS的IP>:13000`
   *(例如：`http://192.168.1.100:13000`)*
2. 網頁順利載入且資料庫正常讀取，即代表部署成功。

---

## 4. 日後代碼更新發版 SOP

當本機程式碼有新功能或更新時，請依以下流程快速發布至 NAS：

1. **【本機電腦】** 重新編譯前端：
   ```powershell
   npm run build
   ```
2. **【本機電腦】** 重新建置並推送至 Docker Hub：
   ```powershell
   docker build -f docs/deployment/docker/Dockerfile --platform linux/amd64 -t judragon003/stock-tracker:latest .
   docker push judragon003/stock-tracker:latest
   ```
3. **【QNAP Container Station】**：
   - 進入「應用程式」點選 `stock-tracker` 旁的 **「重新啟動」**（或重新拉取）即可無縫套用更新，NAS 上的 SQLite 歷史資料庫將完整保留。

---

## 5. 網路與安全建議

1. **內網專用**：預設僅限家中區網（LAN）使用，Port `13000` 不建議在路由器開啟 Port Forwarding 對公網開放。
2. **外部存取最佳解**：
   - 推薦使用 **Tailscale**（QNAP App Center 內建原生套件），手機與筆電登入即可穿透回 NAS，安全免開 Port。
   - 或透過 QNAP 官方 **QVPN (WireGuard)** 建立加密隧道連回。
