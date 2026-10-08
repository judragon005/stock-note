# Ticket 08: 主力戰情室 7 層 Bento-Grid 資料處理動線全面重構與全量 E2E

## 關聯規格
- Spec: `docs/specs/0172-ai-force-war-room-comprehensive-layout-and-quant-engine-refactor-spec.md` (Story 3 / AC 3.1 ~ AC 3.5, 3.1 架構圖)

## 任務細節
1. 重構 `src/components/aiForceDashboard/AiForceDashboardView.tsx`：
   - 替換舊版硬塞 4 卡的 Row 2 ~ Row 6 佈局。
   - 實作 7 層資訊工作流：
     - Layer 1: 全寬主 K 線 (卡片 01)
     - Layer 2: 雙欄全景大雷達 (卡片 03 + 卡片 05)
     - Layer 3: 價格位階與籌碼戰場 (卡片 02 + 卡片 04)
     - Layer 4: 籌碼與基本面大數據 (卡片 08 + 卡片 19 + 卡片 20)
     - Layer 5: 預測路徑與成本結構 (卡片 06 + 卡片 07)
     - Layer 6: 短線能量、市場情緒與風控指標 (卡片 10 + 11 + 13 + 14)
     - Layer 7: 籌碼收斂與終極總結 (卡片 15+09, 16+17, 18)
   - 加入響應式斷點保護（`minmax(340px, 1fr)`），杜絕任何解析度下的擠壓。
2. 執行全量單元測試與 E2E 整合測試（`npm test`）。
3. 驗證全站無 TypeScript 編譯錯誤（`npm run build`）。

## 驗收標準
- [ ] 全站 18+ 張卡片依照 7 層專業架構整齊佈局。
- [ ] 卡片 03 與 05 享有獨立半寬大視野，字體大且不折行。
- [ ] `npm test` 100% 綠燈通過。
- [ ] `npm run build` 0 TypeScript 錯誤。
