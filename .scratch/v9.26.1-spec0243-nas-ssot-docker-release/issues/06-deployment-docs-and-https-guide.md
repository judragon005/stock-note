# 06 — 部署手冊現代化與 HTTPS 安全上下文指引

**What to build:** 更新 QNAP NAS 部署指南與部署總覽索引，全面對齊新的單一 Multi-Stage Dockerfile、雙標籤發版 SOP、選配環境變數清單，並補齊透過 Tailscale Serve HTTPS 或 QNAP 反向代理啟用 HTTPS 以解鎖瀏覽器 Web Crypto API (`crypto.subtle`) 的實戰步驟。

**Blocked by:** 05 — 單一權威 Dockerfile 收斂與 100% 相容 QNAP 既定掛載

**Status:** ready-for-agent

- [ ] QNAP 部署手冊更新最新建置與雙標籤推送指令（`linux/amd64`）
- [ ] 新增 HTTPS 安全上下文實戰專節，說明純 HTTP IP 連線限制與 Tailscale / 反向代理設定方式
- [ ] 補齊 `FRED_API_KEY`、`LAKEHOUSE_DB_PATH`、`DISABLE_BUILTIN_SCHEDULER` 環境變數說明
- [ ] 通過 `npm run lint:docs` 全量文檔完整性與死鏈守門
