# 技術債 0054: WarRoomWorkspace 快速校準表單聚合與子元件解耦 (MacroQuickCalibrationModal)

## 📌 基本資訊
- **建立日期**: 2026-10-27
- **發現來源**: Code Review (Spec 0204 / Issue #332)
- **優先級別**: `P3` (非阻擋性代碼整潔與維護性改進)
- **關聯模組**: `src/components/WarRoomWorkspace.tsx`
- **標籤**: `Refactor` · `UI` · `CleanCode` · `WarRoom` · `ComponentDecomposition`

---

## 🔍 現況分析 (Context & Smell)
在 Spec 0204 實作中，為了提供使用者在 10 秒內快速微調美債 10Y/2Y、VIX、台指期淨未平倉、全市場維持率等指標，於 `WarRoomWorkspace.tsx` 內直接建立了快速數據校準 Modal。

目前的實作存在以下 Fowler Code Smells：
1. **Data Clumps (資料泥團)**：
   在元件頂層宣告了 8 個獨立的字串 State：
   `calibUs10y`, `calibUs2y`, `calibVix`, `calibFearGreed`, `calibTwFuturesNetOi`, `calibTwMarginMaintenance`, `calibCreditSpreadOAS`, `calibCdsIndex`。
   這些欄位本質上屬於同一表單模型，應聚合成單一介面 `MacroCalibrationFormState`。
2. **Large Component / Inline Markup (龐大單體元件)**：
   `WarRoomWorkspace.tsx` 已膨脹至 2200+ 行，校準 Modal 包含約 200 行表單佈局與 inline styles。
   將其抽取為獨立子元件 `MacroQuickCalibrationModal.tsx` 能顯著提高可讀性與測試獨立性。

---

## 💡 建議改善方案 (Proposed Solution)
1. **定義表單資料結構**：
   ```typescript
   export interface MacroCalibrationFormState {
     us10y: string;
     us2y: string;
     vix: string;
     fearAndGreedIndex: string;
     twFuturesNetOi: string;
     twMarginMaintenance: string;
     creditSpreadOAS: string;
     cdsInsuranceIndex: string;
   }
   ```
2. **抽取子元件 `src/components/warRoom/MacroQuickCalibrationModal.tsx`**：
   - 封裝表單狀態與校準提交處理邏輯。
   - 僅透過 Props 接收 `isOpen`, `onClose`, `initialSnapshot`, `onSave`。
3. **優化 `WarRoomWorkspace.tsx`**：
   - 移除分散的 8 個 `useState`，精簡約 250 行程式碼。

---

## ⏱️ 預計觸發時機
- 待下一次戰情室 UI 重構或宏觀指標擴充（如納入美元指數/原油即時校準）時一併執行。
