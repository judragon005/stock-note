# Ticket 03: 首頁頂部總覽「今日損益」看板 UI 整合 (SummaryCards Today's PnL UI)

## 需求說明
- 修改 `src/components/SummaryCards.tsx`：
  - 在總覽指標區塊中呈現當日損益資訊：
    - 今日總損益金額（折算本幣 / 原生幣別）、今日整體漲跌百分比。
    - 依據 `ColorThemeMode`（紅漲綠跌 / 綠漲紅跌）動態呈現配色與漲跌圖示。
    - 支援切換全市場 (ALL)、台股 (TW)、美股 (US) 視圖時動態對齊該市場的當日損益。
  - 當無昨收價資料時平滑降級顯示。
- 檢查整體響應式排版（RWD）與視覺一致性。

**Status:** done

- [x] 於 `SummaryCards.tsx` 新增或整合今日損益視覺元件。
- [x] 支援色彩主題與各市場切換。
- [x] 驗證 UI 渲染與視覺效果。
