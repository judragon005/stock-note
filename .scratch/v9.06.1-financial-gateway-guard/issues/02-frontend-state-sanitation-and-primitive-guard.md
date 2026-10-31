# 02 — 前端狀態海關淨化與標量渲染守護 (Frontend State Sanitation & Primitive Guard)

**What to build:**
重構 `WarRoomWorkspace.tsx` 中的 API 攝入邏輯，所有自 `/api/market/macro` 拉取的遠端資料強制通過 `sanitizeMacroRecord(remote)` 淨化後才寫入 React State，杜絕盲目展開（Blind Spread）。同時於 JSX 標量渲染處（如 `macroSnapshot.dxy`、`macroSnapshot.vix`）加上安全守護，絕不允許 Object 作為 React Child 渲染。

**Blocked by:** 01 — 後端合約收斂與輸入網關自愈 (Backend Contract & Ingestion Gateway Self-Healing)

**Status:** ready-for-agent

- [ ] `WarRoomWorkspace.tsx` 兩處 API 回呼均使用 `sanitizeMacroRecord(remote)` 進行網關淨化。
- [ ] `WarRoomWorkspace.tsx` JSX 第 1445 與 1477 行處對 `vix` 與 `dxy` 實施標量安全守衛。
- [ ] 撰寫單元測試驗證即使外部 API 傳入殘留物件，組件依然平滑降級或提取數值渲染，零例外拋出。

