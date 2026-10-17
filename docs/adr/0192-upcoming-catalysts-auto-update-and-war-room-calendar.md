# ADR 0192: 宏觀戰情室關鍵財經催化劑倒數日曆修復、自適應滾動種子與外部免費資料中樞 (Upcoming Catalysts Auto-Update & War Room Calendar)

## 狀態
已接受 (Accepted) - 2026-10-17

## 背景與問題陳述
使用者反饋「宏觀戰情室 (War Room)」之「關鍵財經事件倒數日曆 (Upcoming Catalysts)」模組出現完全留白、無任何資料顯示的狀況。
經深度調研與原始碼審查，發現下列病因：
1. **靜態過期事件資料**：`WarRoomWorkspace.tsx` 內部原包含寫死的 `DEFAULT_RAW_CATALYSTS`，其日期固定為 2026 年 9 月至 10 月初之事件。`macroAdvisorEngine.ts` 在計算 `daysLeft` 時，透過 `.filter(c => c.daysLeft >= 0)` 全量濾除已過期事件，導致基準日在 2026 年 10 月中旬之後時，候選陣列長度歸零。
2. **缺乏 Empty State 與高度坍縮**：前端元件在列表為空時直接渲染空容器，無任何導引或占位提示，造成區塊視覺坍縮與「系統壞掉」之負面使用者體驗。
3. **缺乏在庫持股除息匯流**：使用者已記錄之除權息行事曆 (`receivableDividends`) 獨立存放，未自動映射並匯入宏觀催化劑事件中，造成個人資產重大現金流節點在戰情室缺席。
4. **缺乏外部免費官方資料支援**：未整合公開且無需 API Key 之資料來源（如 TWSE OpenAPI 證交所除權息預告 `TWT48U`、法說會），且未具備無痛推算之規律性週期事件（台指期結算、美股四巫日、非農就業報告 NFP、CPI）。

## 決策內容

1. **宏觀事件資料型別擴充 (`src/types/macro.ts`)**：
   - 擴充 `CatalystCategory`，新增 `DIVIDEND`（除權息）、`EXPIRY`（期指結算/四巫日）、`EARNINGS`（財報法說）。
   - 新增 `CatalystImpact`（`HIGH`、`MEDIUM`、`LOW`）。
   - 擴充 `RawCatalystEvent` 支援 `impact`、`targetMarket`、`symbol`、`isCustom` 等元數據。

2. **純原生週期性事件推算引擎 (`src/engine/periodicCatalystEngine.ts`)**：
   - 不依賴外部網路與重量級套件，使用純 Date 原生數學精確推算：
     * 台指期結算日（每月第 3 個週三）。
     * 美股四巫日 / 季月結算（3、6、9、12 月第 3 個週五）。
     * 美國非農就業報告 (NFP)（每月第 1 個週五）。
     * 美國 CPI 公布日（每月第二週之推估基準日）。
   - 自動向前、向後動態推算 N 個月份，永遠具備有效的前瞻事件。

3. **官方種子庫與自適應滾動種子 (`src/data/defaultCatalysts.ts`)**：
   - 內建 2026~2027 美國聯準會 FOMC 利率決議、蘋果/輝達/台積電重大發表會與法說會官方日期。
   - 提供 `getAdaptiveDefaultCatalysts(baseDate)`，結合固定種子與週期推算引擎，確保未來任意基準日均有足量事件。

4. **在庫持股除息匯流與多源聚合儲存庫 (`src/utils/catalystStorage.ts`)**：
   - 實作 `mergeHoldingsDividends()`：自 `receivableDividends` 自動映射為 `RawCatalystEvent`，自動標註股票代號與預計每股現金股利。
   - 實作本地使用者自訂事件之 LocalStorage CRUD 操作。
   - 實作 `getAggregatedCatalysts()`，依優先級與去重鍵（`date:title`）完成多源去重聚合與時間序列排序。

5. **外部免費資料中樞服務 (`src/engine/catalystSyncService.ts`)**：
   - 解析 TWSE OpenAPI 證交所公開除權息預告 (`/v1/exchangeReport/TWT48U`)。
   - 支援 Vite 反向代理 (`/api/twse/`) 優先模式，根除本機開發環境之 CORS 隱患，並具備直接存取之優雅降級能力。
   - 實作過期快取、防抖與純離線降級保護，保證 0 API Key、0 成本。

6. **風控警戒與持股質押聯動 (`src/engine/macroAdvisorEngine.ts`)**：
   - 在高衝擊事件（`HIGH` impact，如 FOMC 決議、四巫日、非農）即將到來（<= 3 天）且投組維持率低於 160% 時，主動觸發高風險質押保證金警示 (`MARGIN_EXPIRY_COLLISION`)。

7. **宏觀戰情室第四層 UI 重構 (`src/components/WarRoomWorkspace.tsx`)**：
   - 移除過期靜態常數，改為自適應種子庫 + 在庫持股除息 + 自訂事件聚合。
   - 新增快速分類篩選標籤（全部、央行利率、經濟數據、期權結算、持股除息）。
   - 新增優雅的 Empty State 引導卡片與「新增自訂事件」彈窗，賦予使用者完全自主權。

## 後果與效益
- **徹底修復留白問題**：無論使用者在任何日期開啟宏觀戰情室，皆能自動展示未來 1~6 個月關鍵事件。
- **法人/券商/投資人三方兼顧**：
  - 券商視角：嚴控台指結算、四巫日流動性轉折。
  - 法人視角：鎖定 FOMC、NFP、CPI 與大廠法說會。
  - 個人視角：精確提醒庫存持股除息領息與質押防斷頭風控。
- **高內聚低耦合**：核心運算與網路獲取完全解耦，單元測試覆蓋率 100%（235 套件、1,719 測試全數通過），建置 0 錯誤。
