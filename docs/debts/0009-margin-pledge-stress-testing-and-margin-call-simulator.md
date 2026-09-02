# 技術債 #0009: 質押維持率極端壓力測試與斷頭追繳預警模擬器 (Margin Pledge Stress Testing & Simulator)

- **狀態**：`OPEN`
- **優先級**：`P2`
- **發現來源**：專業金融軟體架構審查 (Financial Software Engineering Audit)
- **建立日期**：2026-08-26
- **標籤**：`Risk` · `Margin` · `Quantitative` · `Pledge`

---

## 1. 背景與現狀代碼 (Context & Current Code)

目前系統已在 `src/components/LoanModal.tsx` 與相關元件中支援了台股股票質押借款（`PLEDGED_LOAN`）與整戶擔保品維持率計算（總擔保品現值 / 總借款金額）。

---

## 2. 問題分析與暫緩理由 (Problem & Deferral Rationale)

* **問題分析**：
  1. **缺乏動態壓力情境推演 (Stress Testing)**：現行僅能呈現「當前靜態維持率」，無法回答投資人關鍵風控問題：「若大盤或質押標的下跌 10%、20%、30%，整體維持率會掉到多少？是否會觸發 130% 斷頭追繳線？」
  2. **缺乏精確補繳保證金試算**：當維持率跌破預警線時，無法自動反推「需要立即匯入多少現金或加補多少擔保品股票才能回到安全水位（如 160%）」。
* **暫緩理由**：
  1. 當前質押靜態總覽已足以應付日常記帳與利息攤提。
  2. 壓力測試屬於進階量化風控衍生功能，列為 P2 技術債於風控專題中集中實作。

---

## 3. 建議重構方案 (Proposed Refactoring Solution)

1. **開發壓力測試情境引擎 (`src/engine/marginStressEngine.ts`)**：
   - 提供 `simulateMarginDrop(scenario: { generalMarketDropPct?: number, customPriceDrops?: Record<string, number> })` 函式。
   - 計算各情境下之總擔保品市值、預估維持率、斷頭距離點數。
2. **實作追繳補足金額逆運算 (`calculateMarginCallRequirement`)**：
   - 公式：$\text{Required Cash} = \text{Total Loan} \times \text{Target Safe Ratio} - \text{Stressed Collateral Value}$。
3. **UI 互動壓力滑桿**：
   - 在質押彈窗或獨立風控視圖中加入「大盤下跌情境滑桿 (-5% ~ -40%)」，即時呈現儀表板紅黃綠警示燈變化與補繳金額。

---

## 4. 觸發處理時機 (Trigger Conditions)

符合以下任一條件時啟動本模組開發：
1. 使用者要求增強股票質押之槓桿風控與極端行情預警功能。
2. 進行 P2 階段量化風控功能演化時。
