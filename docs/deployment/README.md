# 專案部署資源目錄 (Deployment Docs)

本資料夾彙整所有與專案在伺服器／NAS 部署相關的手冊、設定檔、工具腳本、建置產物與日誌。所有部署相關資源均集中收納於此，不污染專案主代碼庫。

---

## 結構與功能分類

```text
docs/deployment/
├── manuals/                # 【操作手冊與指引】
│   └── QNAP_NAS_DEPLOYMENT_GUIDE.md   # QNAP QuTS hero 部署指南、槽位配置與實體路徑掛載說明
├── docker/                 # 【容器配置與編排】
│   ├── Dockerfile          # 生產環境 Docker 映像檔建置規則 (Node 22 + Alpine)
│   └── docker-compose.yml  # QNAP Container Station 3 應用程式編排設定 (無 deploy 限制相容版)
├── server/                 # 【生產伺服器邏輯】
│   └── prod-server.cjs     # 零依賴輕量靜態託管 + SQLite API + 外部反向代理伺服器
├── scripts/                # 【輔助工具與重構腳本】
│   └── convert-to-legacy-docker.cjs   # 傳統 Docker V2 標準格式映像檔轉換腳本
├── artifacts/              # 【建置產物與封裝包】
│   ├── stock-tracker-nas.tar          # 本機導出之 Docker 傳統相容映像檔封裝包
│   └── stock-tracker-nas.tar.gz       # 壓縮版映像檔封裝包
├── logs/                   # 【環境排錯與診斷日誌】
│   └── container-station-log-*.tar.gz # QNAP Container Station 診斷分析日誌包
└── README.md               # 本索引文件
```

---

## 常用操作指引

- 📖 **部署完整流程**：請查閱 [QNAP NAS 部署指南](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/docs/deployment/manuals/QNAP_NAS_DEPLOYMENT_GUIDE.md)
- 🐳 **Container Station 編排設定**：請查閱 [docker-compose.yml](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/docs/deployment/docker/docker-compose.yml)
- 📦 **重新建置指令（於專案根目錄執行）**：
  ```powershell
  npm run build
  docker build -f docs/deployment/docker/Dockerfile -t judragon003/stock-tracker:latest .
  docker push judragon003/stock-tracker:latest
  ```
