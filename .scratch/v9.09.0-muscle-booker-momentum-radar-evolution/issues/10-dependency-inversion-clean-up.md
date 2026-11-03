# 10 — 解除 technicalIndicatorEngine 循環相依與統整移動平均 (Dependency Clean-up)

**What to build:**
消除架構壞味道，理順底層與業務模組的相依方向：
1. 移除 `technicalIndicatorEngine.ts` 對上層業務模組 `muscleBookerEngine.ts` 的反向引用，將通用純幾何計算下沉或統整。
2. 統整移動平均 (SMA) 函數，消除 `muscleBookerEngine.ts` 內多處手寫 `slice().reduce() / N` 的重複造輪子。
3. 清理自選名單初始化時寫死的魔術字串髒資料清洗（移除 `s !== '3175'`），改由正規代碼合法性過濾器處理。
4. 執行現有測試確保無破壞性回歸。

**Blocked by:** Ticket 09

**Status:** open

- [x] 解除 `technicalIndicatorEngine.ts` 反向依賴 `muscleBookerEngine.ts` 之相依倒置
- [x] 統整 SMA 與 MA 數列計算至統一純函數
- [x] 移除 `s !== '3175'` 硬編碼魔術字串
- [x] 執行 `npx vitest run technicalIndicator` 確保既有測試 100% 綠燈

