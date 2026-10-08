# Ticket 07: 任務二、三、四活頁專業量化維度重塑

## 關聯規格
- Spec: `docs/specs/0172-ai-force-war-room-comprehensive-layout-and-quant-engine-refactor-spec.md` (Story 6 / AC 6.1, AC 6.2, AC 6.3)

## 任務細節
1. 修改 `src/components/aiForceDashboard/TaskPanels.tsx` 中的 `TechnicalAlertsView`（任務二）：
   - 整合交易所處置股票（分盤撮合、出關日預估）與注意股票官方標記。
   - 納入券商信用交易維持率風控與融券回補倒數警示。
2. 修改 `KdMaView`（任務三）：
   - 加入日 KD、週 KD、月 KD 多級別共振判定徽章（如「日週雙金叉：主升段」、「日金週死：弱反彈」）。
   - 標註該標的歷史 KD 低檔金叉勝率統計數值。
3. 修改 `MacdView`（任務四）：
   - 加入演算法自動偵測之「頂背離」與「底背離」量化警訊卡。
   - 標註零軸多空分水嶺狀態與動能衰竭預警。
4. 同步更新 `TaskPanels.test.ts`。

## 驗收標準
- [x] 任務二展示交易所處置/注意警示與券商維持率維度。
- [x] 任務三展示日週月多級別共振燈號與歷史勝率統計。
- [x] 任務四具備自動頂底背離量化偵測。
- [x] `TaskPanels.test.ts` 單元測試 100% 通過。
