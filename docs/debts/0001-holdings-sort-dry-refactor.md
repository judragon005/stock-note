# 技術債 #0001: 持倉雙階自然排序 DRY 集中化重構

- **狀態**：`OPEN`
- **優先級**：`P3`
- **發現來源**：[PR #83](https://github.com/judragon003/-/pull/83) 雙軸程式碼審查 (Code Review)
- **建立日期**：2026-08-21
- **標籤**：`Refactor` · `Clean Code`

---

## 1. 背景與現狀代碼 (Context & Current Code)

在 PR #83 中，為了滿足持倉清單符合照片 2 規格（台股置前、代碼自然升冪、美股置底），在兩個模組中分別實作了排序比較邏輯：

1. **核心計算引擎**：`src/engine/calculator.ts` (L376-L384)
```ts
holdings.sort((a, b) => {
  const marketWeightA = a.market === 'TW' ? 0 : 1;
  const marketWeightB = b.market === 'TW' ? 0 : 1;
  if (marketWeightA !== marketWeightB) {
    return marketWeightA - marketWeightB;
  }
  return a.symbol.localeCompare(b.symbol);
});
```

2. **UI 視圖層防禦**：`src/components/HoldingsTable.tsx` (L149-L158)
```ts
const activeHoldings = holdings
  .filter((h) => h.shares > 0)
  .sort((a, b) => {
    const marketWeightA = a.market === 'TW' ? 0 : 1;
    const marketWeightB = b.market === 'TW' ? 0 : 1;
    if (marketWeightA !== marketWeightB) {
      return marketWeightA - marketWeightB;
    }
    return a.symbol.localeCompare(b.symbol);
  });
```

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

- **DRY 原則微量重複**：相同的市場權重判定與代碼字典序比較邏輯存在於兩處。
- **暫緩理由**：
  - 現行邏輯極為精簡（僅約 6 行），直接在 UI 層進行防禦性二次排序可有效防止未來有其他呼叫方繞過計算引擎輸出無序資料。
  - 當前僅有 `TW` 與 `US` 兩個市場，特意建立跨模組工具可能造成輕微的過度工程化 (Over-engineering)。

---

## 3. 建議重構方案 (Proposed Refactoring Solution)

將排序比較器抽象為純函式，放置於 `src/utils/holdingsSort.ts` 或由 `src/engine/calculator.ts` 統一導出：

```ts
// src/utils/holdingsSort.ts
export function compareHoldingsOrder(
  a: { symbol: string; market: 'TW' | 'US' },
  b: { symbol: string; market: 'TW' | 'US' }
): number {
  const marketWeightA = a.market === 'TW' ? 0 : 1;
  const marketWeightB = b.market === 'TW' ? 0 : 1;
  if (marketWeightA !== marketWeightB) {
    return marketWeightA - marketWeightB;
  }
  return a.symbol.localeCompare(b.symbol);
}
```

---

## 4. 觸發處理時機 (Trigger Conditions)

符合以下任一條件時啟動本技術債重構：
1. 專案引進第三個交易市場（如香港交易所 `HK`、日本市場 `JP` 或歐股市場）。
2. 使用者提出自訂持倉自選排序、置頂功能或多欄位動態排序需求。
