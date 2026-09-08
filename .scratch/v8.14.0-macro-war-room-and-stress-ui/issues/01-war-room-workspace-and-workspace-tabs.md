# Ticket #1: 建立宏觀戰情室工作區組件並於導覽列註冊 (WarRoomWorkspace & Tabs)

- **狀態**：`CLOSED`
- **標籤**：`ready-for-agent` · `UI` · `WarRoom` · `AI-Advisor` · `WorkspaceTabs`
- **關聯 PRD**：[docs/specs/0095-macro-war-room-stress-matrix-ui-integration-spec.md](../../../docs/specs/0095-macro-war-room-stress-matrix-ui-integration-spec.md)
- **優先級**：`P1`

---

## 1. 任務目標
1. 擴充 `src/components/WorkspaceTabs.tsx`，新增 `warroom` 標籤與圖示。
2. 建立 `src/components/WarRoomWorkspace.tsx`：
   - 掛載 `generateAiMorningBrief`（AI 作戰方針、四字定調、今日行動要點）。
   - 渲染市場四柱脈搏卡片（美債利率倒掛、VIX 恐慌、大宗商品、美元指數/匯率）。
   - 渲染個人投資組合宏觀防護盾（現金比率、維持率、配置偏離）。
   - 渲染雙重動能輪動排行榜（三大資產池切換）。
   - 渲染關鍵財經事件倒數日曆。
3. 於 `src/App.tsx` 掛載 `activeTab === 'warroom'` 之視圖。

## 2. 驗收標準
- [x] 導覽列可一鍵切換至戰情室。
- [x] 戰情室各區塊數據即時聯動與渲染正常。
