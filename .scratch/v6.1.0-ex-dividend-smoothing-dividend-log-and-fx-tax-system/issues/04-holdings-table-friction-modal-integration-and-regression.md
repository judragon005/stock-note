# Ticket #04: 持倉表平滑切換、摩擦中心稅階進度整合與全量回歸測試

## 🎯 任務目標

將平滑未實現損益與外匯拆解整合至 `HoldingsTable.tsx`，將二代健保與海外所得稅階進度條整合至 `FrictionCenterModal.tsx`，完成全量整合回歸測試與文檔更新。

---

## 🛠️ 實作要點

1. **持倉表增強** (`src/components/HoldingsTable.tsx`)：
   - 在未實現損益欄位或操作區提供「含應收股息平滑」視圖切換與 Tooltip 提示。
   - 美股標的加入外匯損益 (FX Gain) 與股票價差 (Asset Gain) 雙軸拆解懸浮視窗。
2. **摩擦成本中心增強** (`src/components/FrictionCenterModal.tsx`)：
   - 增加「二代健保補充保費 (2.11%) 門檻警示」專區。
   - 增加「美股年度海外所得 (100萬申報 / 750萬 AMT)」雙軌進度條與說明。
3. **全量測試與回歸**：
   - 執行 `npm test` 確保 100% 測試綠燈。
   - 執行 `npm run build` 確保 TypeScript 0 錯誤。
4. **文檔與技術債更新**：
   - 更新 `CONTEXT.md` 紀錄新模組架構。
   - 更新 `docs/debts/README.md`，將技術債 `#0014`, `#0004`, `#0011` 標記為 `RESOLVED`。

---

## 🧪 驗收條件 (Acceptance Criteria)

- [ ] 持倉表未實現損益可流暢切換平滑視圖。
- [ ] 摩擦中心稅階進度條視覺精美且數據精確。
- [ ] `npm test` 與 `npm run build` 100% 綠燈通過。
- [ ] 技術債看板狀態同步更新。

