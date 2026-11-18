# 技術債 0059: HoldingPosition 擴展欄位型別收斂與雙重轉型氣味清理 (HoldingPosition Extended Fields Type Convergence)

* **建立日期**：2026-11-18
* **狀態**：`OPEN`
* **優先級**：`P3 (Low)`
* **來源**：/code-review 雙軸審查回饋 (Spec 0235 / Issue #584)
* **標籤**：`Refactor` · `TypeScript` · `CleanCode` · `TypeSafety` · `WarRoom`

---

## 1. 現狀診斷與背景 (Context & Problem)

在 Spec 0235 宏觀戰情室 3.5 模組化解耦過程中，為了在不侵入全專案核心 `HoldingPosition` interface (`src/types/stock.ts`) 前提下存取擴展欄位，於以下檔案採用了 `as unknown as { ... }` 雙重轉型模式：

1. `src/hooks/useWarRoomPortfolioMetrics.ts#L89`：
   ```ts
   const avgExRate = (h as unknown as { avgExchangeRate?: number }).avgExchangeRate ?? 32.5;
   ```
2. `src/utils/warRoomBriefBuilder.ts#L99-L104`：
   ```ts
   const plan = (h as unknown as { tradePlan?: TradePlan }).tradePlan;
   const dispEvents = (h as unknown as { dispositionEvents?: DispositionEvent[] }).dispositionEvents;
   ```

### 存在痛點
- 雖然嚴格杜絕了裸露 `any`，但使用 `unknown as` 存取未在型別契約中宣告的屬性，削弱了 TypeScript 的靜態型別守護。
- 未來若欄位名稱重構，編譯器無法自動提供重新命名與邊界告警。

---

## 2. 建議解法與架構演進 (Proposed Solution)

於 `src/types/stock.ts` 中，為 `HoldingPosition` 正式宣告可選屬性：

```ts
export interface HoldingPosition {
  // ... 現有屬性 ...
  avgExchangeRate?: number;
  tradePlan?: TradePlan;
  dispositionEvents?: DispositionEvent[];
}
```

隨後於 `useWarRoomPortfolioMetrics.ts` 與 `warRoomBriefBuilder.ts` 中移除雙重轉型，直接存取 `h.avgExchangeRate`、`h.tradePlan`、`h.dispositionEvents`。

---

## 3. 預期效益 (Benefits)

1. **型別水密性**：徹底消除雙重型別斷言 (Type Assertion Smell)。
2. **重構防禦**：全域重構與 IDE 跳轉 100% 精準。
