# Ticket 04: Card 12 UI 重構、動態呼吸燈號與四重視角 Bento 結構 (TDD)

## 1. 權責範圍 (Scope)
* **核心檔案**：
  - `src/components/aiForceDashboard/cards/DynamicSignalsCard.tsx`
* **測試檔案**：
  - `src/components/aiForceDashboard/cards/DynamicSignalsCard.test.ts`

## 2. 需求描述 (Description)
1. **徹底廢除硬編碼純紅燈**：
   - 依據 `data?.verdictLight` 動態渲染呼吸光暈燈號：
     - `'GREEN'`：綠色光暈 (`#10b981`, `boxShadow: 0 0 10px #10b981`)，標示「綠燈 (偏多 / 安全)」。
     - `'YELLOW'`：黃色光暈 (`#f59e0b`, `boxShadow: 0 0 10px #f59e0b`)，標示「黃燈 (觀望 / 中性)」。
     - `'RED'`：紅色光暈 (`#ef4444`, `boxShadow: 0 0 10px #ef4444`)，標示「紅燈 (偏空 / 高風險)」。
2. **階梯式 Bento 資訊流重構**：
   - **頂部**：綜合燈號徽章 + 綜合量化評分條（0~100 分動態進度條）。
   - **中部（四維核心條目）**：趨勢、籌碼、動能、風險（附帶動態色彩與 Tooltip）。
   - **專業層（交易所與券商標籤）**：
     - 若有 `regulatoryBadge`（如處置 5分盤），展示專屬橘黃色警示徽章。
     - 若有 `brokerMarginAlert`（如融資浮額沉重），展示券商風控徽章。
   - **決策層（法人與個人指引）**：
     - 顯示 20 日 VWAP 偏離（`vwapBiasStdText`）。
     - 顯示關鍵防守價與壓力價。
     - 突出展示【AI 決策情境解析】：白話說明當前主力行為（如洗盤破底翻，建議觀望勿殺低）。

## 3. 測試縫隙 (Test Seams)
* 驗證傳入不同 `verdictLight` 與 `compositeScore` 時，DOM 節點之文字、進度條寬度與光暈顏色完全對齊。

## 4. 驗收標準 (Acceptance Criteria)
* [ ] 對應 Spec 0179 之 **AC 3, AC 4, AC 5**。
* [ ] `src/components/aiForceDashboard/cards/DynamicSignalsCard.test.ts` 相關單元測試 100% 綠燈。
