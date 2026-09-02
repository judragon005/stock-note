# 03 — 完整單元測試覆蓋、迴歸驗證與交接

**What to build:** 
在公開測試縫隙（`db.test.ts`, `stockNameResolver.test.ts`）補充完整的 TDD 單元測試，驗收以下關鍵行為：
1. `corporateActions` 在 IndexedDB 模式與 LocalStorage 回退模式下的標的數與總筆數精確度。
2. `historicalFx` 在單一幣別對下之點數累加正確性。
3. `stockDictionary` 在內建與自訂增量合併下的總數與細項計數。
4. 確保 `npm test` 100% 綠燈通過、`npm run build` 0 TypeScript 錯誤。

**Blocked by:** 02 — 統一股票字典庫統計顯示口徑與 UI 綁定

**Status:** completed

- [x] `src/utils/db.test.ts` 覆蓋公司行動、外匯與字典快取統計測試
- [x] 本地執行 `npm test` 確保全部測試通過 (384/384 綠燈)
- [x] 本地執行 `npm run build` 確保 0 錯誤
