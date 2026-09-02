# Ticket 01: 目標配置資料模型與持久化存儲 (Target Allocation Data Models & Storage)

## 任務描述
定義目標資產配置模型 (Target Allocation Model) 與再平衡結果資料結構，並支援本機持久化儲存 (localStorage)，提供開箱即用的預設配置策略。

## 涉及檔案
- `src/types/allocation.ts` (新建)
- `src/utils/storage.ts` 或目標配置讀寫工具

## 驗收標準 (Acceptance Criteria)
1. 建立 `src/types/allocation.ts`，精確定義 `TargetAllocationType` ('MARKET' | 'SYMBOL')、`TargetAllocationItem`、`TargetAllocationConfig`、`RebalanceMode`、`RebalanceItemRecommendation` 與 `RebalancePlanResult`。
2. 預設提供「市場維度預設配置」(台股 40%、美股 40%、現金 20%，容忍區間 $\pm 5\%$)。
3. 提供目標配置的讀取、儲存與重置功能，確保重整頁面後使用者自訂之配置策略不遺失。
4. 驗證配置項目的目標百分比合計是否為 100%，提供防呆校驗函式。
