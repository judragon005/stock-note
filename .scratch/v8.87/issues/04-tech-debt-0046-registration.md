# Ticket 04: 長期演進技術債 0046 登錄與索引同步 (中央金鑰庫與私有雲全端代理)

## 關聯規格
- Spec: `docs/specs/0175-api-key-probe-csp-cors-and-endpoint-repair-spec.md` (2.0)
- Technical Debt: `docs/debts/0046-centralized-key-vault-and-nas-proxy-mesh.md`

## 問題背景
純前端 LocalStorage 在跨裝置（手機與電腦）與不同 IP/網域訪問 NAS 時存在 Origin 物理隔離問題，且前端直接調用外部 API 存在 SEC 合規 User-Agent 限制與金鑰暴露問題。此架構收斂需作為獨立技術債專案追蹤。

## 任務細節
1. 建立 `docs/debts/0046-centralized-key-vault-and-nas-proxy-mesh.md`：
   - 記錄架構痛點、目標架構（SQLite 伺服器端金鑰保險箱、全端反向代理網格）。
2. 更新 `docs/debts/README.md`：
   - 在技術債索引總表中登錄 0046 條目，標記為 `OPEN` / `P2`。

## 驗收標準
- [x] 技術債檔案存在且格式符合規範。
- [x] 技術債索引總表對齊更新。
