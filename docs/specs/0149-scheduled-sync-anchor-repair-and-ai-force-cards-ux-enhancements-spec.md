# Spec 0149: 全市場排程工作目錄錨定、Tooltip Portal 穿透與 AI 戰情室視覺比例優化規格 (Scheduled Sync Anchor Repair and AI Force Cards UX Enhancements Spec)

## Problem Statement

使用者在操作「全市場每日盤後排程快取 (Spec 0132)」與「AI 主力決策戰情室 (AI Force Dashboard)」時，遭遇五項影響資料準確度與視覺互動體驗的關鍵痛點：

1. **背景排程 24 小時未更新，快取與資料庫停滯 (照片 1)**：
   使用者已在 Windows 工作排程器設定定時同步任務，但放置超過 24 小時後，台股與美股快取仍停留在舊日期，且台股市場「資料日期」呈現空白。由於背景排程執行失敗，導致前端開啟時無法將增量行情沉澱至 IndexedDB，用戶懷疑背後資料庫同步機制失效。
2. **股票代號搜尋框截斷 (照片 2)**：
   在頂部市場行情列輸入超過 5 碼的股票或 ETF 代號（如 6 碼權證、ETF `004030` 等）時，右側字元被寬度寫死（75px）的 input 元素直接截斷切除，嚴重影響輸入辨識。
3. **名詞解釋 Tooltip 被相鄰卡片遮蔽 (照片 3)**：
   當滑鼠 hover 在「03 多維度判讀」的說明圖示 `(i)` 時，彈出的說明卡片右半部被相鄰的「04 AI 籌碼熱區圖」攔腰遮擋。由於現代 Web 元件採用 `backdrop-filter`，相鄰卡片觸發了獨立的 CSS Stacking Context（層疊上下文），使得原本卡片內部的 Tooltip 即使設有 `z-index: 9999` 亦無法跳脫父容器層級。
4. **Card 04 AI 籌碼熱區圖上下無效留白過多 (照片 4)**：
   在 Bento Grid 網格佈局中，Row 2 整體高度由內容較豐富的卡片拉伸至約 400px，但 Card 04 內部的垂直柱狀熱力網格與刻度被寫死了 `height: '190px'` 並垂直置中，導致繪圖區上下各浪費近 90px 的空白區域，資訊顯示緊縮侷促。
5. **Card 05 風險雷達圖半徑過小且標籤字體微小 (照片 5)**：
   SVG 五角蛛網圖半徑僅設為 76（佔 320x250 畫布不足 1/3），外圍文字標籤僅 10px、數值僅 9.5px，在大螢幕與一般桌面環境下文字極度微小模糊，使用者難以閱讀「波動、流動、籌碼、法人、趨勢」指標。

---

## Solution

針對上述問題，從第一性原理與極簡原則（KISS）出發，提供系統性且高可維護的解決方案：

1. **排程執行環境錨定與快取完整性修復**：
   - 解決 Windows 工作排程器啟動時 CWD 落入 `C:\Windows\System32` 的問題：將同步腳本（`sync-tw-market.cjs` 與 `sync-us-market.cjs`）所有快取檔案持久化路徑改用 `__dirname` 絕對錨定專案根目錄。
   - 修正 `setup-windows-task.bat` 變數尾隨空格與排程命令引號，為排程任務明確配置工作目錄與絕對路徑。
   - 為台股快取輸出頂層補齊 `date` 欄位，確保快取總表資料日期正常顯示。
   - 當無數據時增加防禦防清空舊快取機制，並確保前端啟動時將最新快取增量寫入 IndexedDB。
2. **搜尋輸入框彈性寬度改造**：
   - 重構 `HeaderMarketBar.tsx` 中的股票代碼輸入框，將寫死 `75px` 改造為自適應或彈性寬度（`minWidth: '95px'`、配合文字內容彈性擴張），支援 4~8 碼完整展示。
3. **全域 Tooltip Portal 化與邊界穿透**：
   - 升級 `TermTooltip.tsx`，改用 React `createPortal` 將浮動卡片直接掛載於 `document.body` 頂層，並利用 `getBoundingClientRect` 精確計算觸發位置與視窗邊界（防止溢出與翻轉），一次性根治全站所有卡片與組件被相鄰元素遮擋的 Stacking Context 問題。
4. **Card 04 繪圖區高度垂直拉伸 (Stretch Fill)**：
   - 移除 `VolumeProfileCard.tsx` 內寫死的 `height: '190px'`，採用 `flex: 1` 結合 `height: '100%'`，使 Y 軸價格刻度、垂直熱力網格柱列與圖例垂直撐滿卡片可用空間，消除上下留白。
5. **Card 05 風險雷達圖面積放大與字級提昇**：
   - 將 `RiskSpiderCard.tsx` 的五角蛛網最大半徑擴大至 `96`（提升約 26% 半徑），外圍標籤文字放大至 `13px`、數值放大至 `12px`，並調整標籤與軸線位移半徑，實現清晰飽滿的高可讀性。

---

## User Stories

1. 作為股市投資人，我希望 Windows 背景排程能穩定在每日 16:00 (台股) 與 08:00 (美股) 自動更新資料，以便打開系統時能立即看到最新交易日的行情，而無需手動補抓。
2. 作為股市投資人，我希望在全市場同步狀態徽章彈窗中能看到清晰的「資料日期」，以便立刻確認目前檢視的行情是哪一天產出。
3. 作為股市投資人，我希望當背景排程更新快取後，系統能在背景自動同步寫入 IndexedDB 本地資料庫，以確保我所有的歷史日K與技術指標資料庫擁有連續完整的最新資料。
4. 作為使用者，我希望在輸入台股 ETF（如 004030）、權證或多碼美股代碼時，輸入框能完整呈現所有字元，避免字尾被硬生生截斷。
5. 作為新手投資人，當我將滑鼠懸停在卡片標題旁的說明圖示 `(i)` 時，我希望彈出的術語卡片完整浮現在最上層，不會被右側或下方的其他卡片阻擋或截斷。
6. 作為使用者，我希望全站所有卡片（Card 01~Card 15 與 Header）的 Tooltip 都能獲得相同的防遮擋保證，不再有任何層疊上下文干擾。
7. 作為看盤使用者，我希望 Card 04 籌碼熱區圖能充分利用垂直空間，讓熱力網格與刻度上下擴展，不再有大面積無意義的上下黑底留白。
8. 作為看盤使用者，我希望 Card 05 風險雷達圖具備足夠的繪圖尺寸，且圖上的「波動、流動、籌碼、法人、趨勢」與數值字體清晰易讀，減少視力疲勞。
9. 作為系統維護者，我希望同步腳本在遭遇非交易日或無官方數據時，不會誤將本地既有的有效快取覆蓋為空白或 0 檔，確保系統快取的容錯穩定性。
10. 作為開發工程師，我希望所有視覺變更與排程腳本均有單元測試與自動化驗證保障，確保功能演進時不會造成佈局破壞或既有功能回退。

---

## Implementation Decisions

### 1. 同步腳本與排程工作目錄錨定
- **腳本絕對路徑重構**：在 `sync-tw-market.cjs` 與 `sync-us-market.cjs` 中，廢除依賴動態環境的 `process.cwd()`，統一透過 `path.resolve(__dirname, '../../')` 解析專案根目錄，以此為基準定位 `public/market-cache/` 與 `.scratch/market-cache/`。
- **快取資料結構一致性**：在 `sync-tw-market.cjs` 產出 JSON payload 時，明確於最外層保留 `date: dateStr`，與美股快取及前端介面格式嚴格對齊。
- **空資料防覆蓋守門員**：當 TWSE/TPEx 當日無數據（`allSymbols.size === 0`）時，輸出警告日誌並終止，嚴禁寫入 0 檔的空物件洗掉現有快取。
- **批次排程註冊修復**：修正 `setup-windows-task.bat` 中提取 node 路徑的尾隨空格問題，並在 `schtasks` 指令中顯式帶入工作目錄或呼叫參數。

### 2. 搜尋輸入框彈性伸縮
- **`HeaderMarketBar.tsx`**：將 input 寬度改為彈性容器與 `minWidth: '95px'`，搭配適當的 `padding: '2px 8px'`，既保持原科技感線條，又能容納多達 8 個字元。

### 3. Tooltip 全域 Portal 化與層疊穿透
- **`TermTooltip.tsx`**：引入 `react-dom` 之 `createPortal`。
- 點擊或 Hover 開啟時，使用 `containerRef.current.getBoundingClientRect()` 計算觸發元素在螢幕上的 `top`、`left`、`bottom`、`right`，將浮層以 `position: 'fixed'` 渲染至 `document.body`。
- 內建視窗邊界感測（Viewport Boundary Detection），若右側或下方超出螢幕，自動向左或向上翻轉，徹底杜絕 Stacking Context 遮蔽與視窗溢出問題。

### 4. Card 04 AI 籌碼熱區圖自適應拉伸
- **`VolumeProfileCard.tsx`**：
  - 將主繪圖 Grid 容器從固定寫死高度改為 `flex: 1` 且 `height: '100%'`，`alignItems` 設為 `stretch`。
  - 左側價格刻度、中間熱力柱列（Heatmap Grid）、右側圖例統一改為 `height: '100%'`，垂直均勻分佈。
  - 每個熱力單元方塊（Cell）使用 `flex: 1` 自適應拉長，完美填滿卡片高度。

### 5. Card 05 風險雷達圖尺寸與字級擴張
- **`RiskSpiderCard.tsx`**：
  - 五角蛛網圖半徑：`maxRadius` 由 76 調增至 96。
  - 外圍標籤文字：`FIVE_AXIS_CONFIG` 標籤文字字級由 `10` 提升至 `13`（`fontWeight: 700`），數值字級由 `9.5` 提升至 `12`（`fontWeight: 800`）。
  - 坐標位移：標籤坐標位移半徑調整至 `maxRadius + 22`，確保文字放大後邊距勻稱。

---

## Testing Decisions

1. **單元測試行為驗證 (TDD)**：
   - 針對 `sync-tw-market.cjs` 與快取載入器，測試空數據守門員與頂層 `date` 欄位。
   - 針對 `TermTooltip`，在測試中驗證 Portal 渲染節點是否存在於 `document.body` 中，且能正確響應滑鼠進入/離開事件。
   - 針對 `VolumeProfileCard`，驗證無寫死高度且自適應渲染刻度與圖例。
   - 針對 `RiskSpiderCard`，驗證 `maxRadius` 與文字尺寸設定符合放大規範。
2. **端到端靜態與建置檢驗**：
   - 執行 `npm test` 確保全數既有測試案例 100% 通過。
   - 執行 `npm run build` 確認 TypeScript 0 Error。

---

## Out of Scope

- 本規格不包含對券商 API 下單或即時 WebSocket 串流的更動。
- 本規格不修改主力籌碼核心演算法（例如雙均線、籌碼集中度等數學公式）。

---

## Further Notes

本規格落實後，將徹底消除使用者目前反映的 5 項問題，打通排程 ➔ 本地快取 ➔ IndexedDB 的完整閉環，並使戰情室 UI 在不同螢幕解析度下具備一致的精準度與閱讀舒適度。
