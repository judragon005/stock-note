# Ticket 05: 全量測試回歸與生產建置驗收

## 關聯規格
- Spec: `docs/specs/0175-api-key-probe-csp-cors-and-endpoint-repair-spec.md` (4.0)
- Issue: #209

## 問題背景
每次架構或安全性修改後，必須執行全量回歸測試與生產建置，確保零破壞既有功能。

## 任務細節
1. 執行單元與整合測試：`npm test`。
2. 執行 TypeScript 與 Vite 生產建置：`npm run build`。
3. 確保無 Lint 或型別錯誤。

## 驗收標準
- [x] `npm test` 通過率 100%（210 test files / 1538+ tests passed）。
- [x] `npm run build` 0 錯誤順利產出 `dist/`。
- [x] 工作目錄無未追蹤之暫存垃圾檔案。
