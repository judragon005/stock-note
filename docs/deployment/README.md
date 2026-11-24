# 專案部署資源目錄 (Deployment Docs)

本資料夾彙整 QNAP NAS 24/7 生產部署手冊、範例編排檔與歷史輔助資源。自 **Spec 0243** 起，專案已收斂為**單一權威生產架構（SSOT）**：
- **權威映像定義**：根目錄 [`Dockerfile`](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/Dockerfile)（Node 22 Alpine Multi-Stage，容器內自動建置前端）
- **權威生產伺服器**：[`scripts/nas-server.cjs`](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/scripts/nas-server.cjs)（SPA + SQLite 湖倉 API + 全量外部代理 + SSRF Guard + 24/7 自治排程 + `SIGTERM` WAL 優雅關機）

---

## 結構與功能分類

```text
docs/deployment/
├── manuals/                # 【操作手冊與指引】
│   └── QNAP_NAS_DEPLOYMENT_GUIDE.md   # QNAP QuTS hero 24/7 部署、HTTPS 安全上下文與雙標籤發版 SOP
├── docker/                 # 【容器配置與編排】
│   ├── Dockerfile          # 根目錄權威 Multi-Stage Dockerfile 之對齊鏡像
│   └── docker-compose.yml  # QNAP Container Station 3 生產編排範本
├── server/                 # 【向後相容薄轉發入口】
│   └── prod-server.cjs     # 已收斂為薄轉發包裝，直接委派至 scripts/nas-server.cjs
├── scripts/                # 【歷史輔助工具】
│   └── convert-to-legacy-docker.cjs   # 離線傳統 Docker V2 格式轉換工具
└── README.md               # 本索引文件
```

---

## 常用操作指引

- 📖 **完整部署、HTTPS 與維運手冊**：請查閱 [QNAP NAS 部署指南](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/docs/deployment/manuals/QNAP_NAS_DEPLOYMENT_GUIDE.md)
- 🐳 **QNAP Container Station 編排範本**：請查閱 [docker-compose.yml](file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/docs/deployment/docker/docker-compose.yml)
- 📦 **標準雙標籤建置與發版指令（於專案根目錄執行，無需先跑 `npm run build`）**：
  ```powershell
  docker build --platform linux/amd64 `
    -t judragon003/stock-tracker:v9.26.0 `
    -t judragon003/stock-tracker:latest .
  docker push judragon003/stock-tracker:v9.26.0
  docker push judragon003/stock-tracker:latest
  ```
