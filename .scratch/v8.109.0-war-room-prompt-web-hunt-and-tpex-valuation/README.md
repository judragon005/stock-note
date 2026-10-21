# 0196 規格書本地鏡像與對齊摘要 (Spec 0196 Mirror)

- **規格書路徑**：`docs/specs/0196-ai-war-room-prompt-web-hunt-and-tpex-valuation-pipeline-spec.md`
- **關聯 GitHub Issue**：[#292](https://github.com/judragon005/stock-note/issues/292)
- **狀態**：`READY_FOR_AGENT`
- **關聯分支規劃**：`feature/292-ai-prompt-web-hunt-and-tpex-pipeline`

## 任務切片清單 (9 Micro-Slices)
- [x] [01-tpex-margin-chips-sync.md](./issues/01-tpex-margin-chips-sync.md) — TPEx 官方信用交易全市場整包同步與解析
- [x] [02-twse-tpex-official-valuation-sync.md](./issues/02-twse-tpex-official-valuation-sync.md) — TWSE & TPEx 官方每日 PE / PB / 殖利率整包抓取與 SQLite 快取
- [x] [03-dashboard-integrate-quarterly-eps.md](./issues/03-dashboard-integrate-quarterly-eps.md) — 戰情室前端連通既有單季財報 EPS 與毛利率數據孤島
- [x] [04-chips-ratio-scale-and-honest-pending.md](./issues/04-chips-ratio-scale-and-honest-pending.md) — 籌碼均量比例尺計算與「待同步」語義誠實化
- [x] [05-intraday-zero-volume-fallback.md](./issues/05-intraday-zero-volume-fallback.md) — 盤中即時量價一致性回退防禦
- [x] [06-prompt-temporal-grounding-anchor.md](./issues/06-prompt-temporal-grounding-anchor.md) — 提示詞注入【2026 時空對齊錨點】防退化指令
- [x] [07-prompt-web-hunt-dog-protocol.md](./issues/07-prompt-web-hunt-dog-protocol.md) — 提示詞注入【受控聯網獵犬協議 (Web Hunt Protocol)】
- [x] [08-prompt-actionable-playbook-contract.md](./issues/08-prompt-actionable-playbook-contract.md) — 提示詞注入【3 欄式操盤劇本與強制結論合約】
- [x] [09-war-room-prompt-e2e-verification.md](./issues/09-war-room-prompt-e2e-verification.md) — 戰情室提示詞全管線端到端驗收與測試回歸

## 當前執行 Frontier (可立即認領之零阻塞任務)
1. **01 — TPEx 信用交易同步** (無依賴)
2. **02 — TWSE/TPEx 官方每日估值同步** (無依賴)
3. **03 — 戰情室打通單季財報 EPS** (無依賴)
4. **04 — 籌碼均量比例尺與語義誠實化** (無依賴)
