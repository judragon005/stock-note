# 0180 ADR: 個股深度財報職責收斂、ETF物理阻斷與視覺架構重構

## 1. 狀態 (Status)

* **狀態：** `ACCEPTED` (已採納)
* **日期：** 2026-10-13
* **決策者：** AI Assistant (Antigravity), Project Lead
* **關聯 Issue：** [Issue #230](https://github.com/judragon005/stock-note/issues/230)
* **關聯 Spec：** [Spec 0180: 個股分析深度財報引擎純粹化規格書](file:///d:/APP/股票紀錄/docs/specs/0180-stock-analysis-forensic-accounting-etf-isolation-and-ui-repair-spec.md)

---

## 2. 背景與問題情境 (Context)

個股分析頁面（副標：【深度財報】）近年演進中，發生了功能邊界模糊與元件污染問題：
1. 誤植「快捷標的膠囊列」，將屬於主力戰情室的籌碼概念混入深度財報。
2. 標的清單混入 ETF（如 0050、0056、00679B），但 ETF 屬於被動基金，缺乏資產負債表與損益表，導致系統產生大量假警報與防呆阻斷。
3. `StrategicPromptPanel` 引入了未編譯的 Tailwind CSS Utility Classes，導致排版在 Vanilla CSS 下崩壞成垂直純文字。
4. `AnalysisMetricView` 中存在多個寫死假數據 Fallback（週轉天數 42/56/68 天、台泥借款數值），且股利發放率與杜邦週轉率存在單季未年化公式錯誤。

---

## 3. 決策考量與原則 (Decision Drivers)

1. **單一職責原則 (Single Responsibility Principle)**：
   - 「個股分析」=【深度財報與價值防偽】。
   - 「主力戰情室」=【籌碼資金流與全景 AI 決策】。
2. **零偽造原則 (Zero-Mock Policy)**：
   - 堅決杜絕任何硬編碼假數值 fallback。無數據即顯示 `-` 或 `N/A`。
3. **原生設計系統原則 (Native CSS System)**：
   - 拒絕未設定之 Tailwind 語法，全面使用專案原生 CSS 變數與 Glassmorphism 樣式。
4. **ETF 物理隔離與友善導引**：
   - 普通股分析頁籤物理阻斷 ETF，若遇 ETF 代碼導引至【主力戰情室】。

---

## 4. 決策內容 (Decision)

1. **移除快捷標的列**：自 `StockAnalysisWorkspace.tsx` 徹底拔除 `Stock Pills` 膠囊列。
2. **重構提示詞面板**：以原生 CSS 變數與 Glassmorphism 重構 `StrategicPromptPanel.tsx`，6 欄平行思考帽卡片網格。
3. **ETF 物理阻斷與轉發**：標的選單僅載入台美普通股；遇 ETF 提示「此標的為 ETF，不具備個股財務報表，建議前往【主力戰情室】檢視」並附轉發按鈕。
4. **清除假資料與公式修正**：
   - 清除週轉天數與長短借款之寫死假數值。
   - 修正股利發放率為「全年配息 / 全年 4 季累計 EPS」。
   - 杜邦週轉率進行流量年化（$\times 4$）。
   - 美股季配息年化，標記 USD/TWD 幣別。
   - 建立金融股指標豁免與景氣循環股 P/B 河流圖導引。

---

## 5. 後續影響與結果 (Consequences)

### 正面效益
* 頁面定位清晰，徹底消除「深度財報」與「主力戰情室」功能雙胞胎的混淆。
* 提示詞面板與主畫面回歸一致的深色科技質感，排版不再崩壞。
* 消除會計公式錯誤與假資料，保障使用者財務決策安全。

### 潛在代價與處置
* 原先依賴快捷標的列的切換習慣轉移至下拉選單與搜尋列。
* 部分缺漏數據的公司圖表將顯示「-」或「無揭露」，需於 UI 上給予良好空狀態 (Empty State) 提示。
