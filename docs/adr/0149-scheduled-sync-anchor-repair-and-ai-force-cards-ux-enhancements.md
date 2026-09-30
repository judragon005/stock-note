# ADR 0149: 全市場排程工作目錄錨定、Tooltip Portal 穿透與 AI 戰情室視覺比例優化架構決策 (Scheduled Sync Anchor Repair and AI Force Cards UX Enhancements Architecture)

## 狀態 (Status)
已採納 (Accepted)

## 上下文 (Context)
在 Spec 0132 與 Spec 0148 導入後，使用者回報了五大影響體驗的關鍵問題：
1. **Windows 工作排程器背景執行無效**：排程啟動時預設工作目錄落入 `C:\Windows\System32`，腳本原本使用 `process.cwd()` 相對路徑寫入檔案，導致權限不足或路徑錯誤而寫入失敗，使 `tw_market_summary.json` 與 `us_market_summary.json` 停留在舊日期，且 IndexedDB 亦未更新。
2. **股票代號被截斷**：`HeaderMarketBar.tsx` 中的代碼 input 寬度寫死 75px，輸入超過 5 碼（如 ETF 004030、權證 6 碼）字尾遭裁切。
3. **Tooltip 被相鄰卡片遮蔽**：Card 03 說明的彈出浮層被相鄰的 Card 04 攔腰截斷，肇因於現代前端 `backdrop-filter` 觸發了獨立的 CSS Stacking Context，卡片內部的 `z-index` 無法跳脫父級層疊限制。
4. **Card 04 AI 籌碼熱區圖上下留白過多**：卡片本身被 Grid Row 2 拉伸至 400px，但內部繪圖區寫死 `height: 190px` 且垂直置中，造成上下各 90px 的無效黑底留白。
5. **Card 05 風險雷達圖半徑過小且文字微小**：五角蛛網半徑僅 76，標籤僅 10px、數值僅 9.5px，在大螢幕下閱讀極其吃力。

## 決策 (Decision)
1. **腳本環境絕對路徑錨定**：
   - 在 `sync-tw-market.cjs` 與 `sync-us-market.cjs` 中，廢除 `process.cwd()`，一律改採 `path.resolve(__dirname, '../../')` 絕對定位專案根目錄。
   - 補齊台股快取頂層的 `date: dateStr` 屬性，且在抓取標的數為 0 時輸出警示並安全退出，嚴禁覆蓋現有快取為空檔。
   - 修正 `setup-windows-task.bat` 變數尾隨空格與排程指令引號格式。
2. **股票搜尋輸入框彈性伸縮**：
   - 移除寫死 `width: 75px`，改採 `minWidth: 95px` 配合動態字元寬度計算，完整容納 4~8 碼個股、ETF、權證與美股代號。
3. **全域 Tooltip Portal 穿透與邊界防禦**：
   - 將 `TermTooltip.tsx` 浮層升級為 React `createPortal` 渲染至 `document.body`，徹底跳脫父層 CSS Stacking Context。
   - 基於 `getBoundingClientRect()` 計算 `position: fixed` 螢幕座標，並實作視窗邊界碰撞偵測（自動向左/向上翻轉），一次性根治全站 15 張卡片與 Header Tooltip 的遮擋與溢出問題。
4. **Card 04 繪圖區高度垂直填滿 (Stretch Fill)**：
   - 移除 `VolumeProfileCard.tsx` 中寫死的 190px，容器改為 `flex: 1` 且 `alignItems: 'stretch'`，價格刻度、熱力柱方塊與右側圖例垂直填滿卡片空間，徹底消除上下各 90px 的無效留白。
5. **Card 05 風險雷達圖面積與字級擴張**：
   - 五角蛛網圖半徑擴大至 `maxRadius = 96`（提升約 26% 半徑），標籤字級提升至 `13px`（fontWeight: 700），數值提升至 `12px`（fontWeight: 800），顯著提昇易讀性。

## 後果與影響 (Consequences)
- **正面效益**：
  - Windows 定時排程不論由何種執行目錄觸發，均能穩定讀寫專案快取，打通 快取 ➔ IndexedDB 自動沉澱閉環。
  - 全站 Tooltip 徹底免疫層疊遮蔽與視窗截斷。
  - AI 戰情室各卡片視覺比例大器飽滿、字體清晰易讀。
- **維護保證**：
  - 全量單元測試 1,180 項測試 100% 通過。
  - TypeScript 0 錯誤打包通過。
