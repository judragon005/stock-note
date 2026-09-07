# 0086. 象限顏色動態連動使用者燈號習慣與籌碼資料本地化增量補足 (Color Theme Mode Quadrant Sync & Local Incremental Chips Pipeline)

- **狀態**: 已核准 (Approved)
- **日期**: 2026-09-07
- **決策者**: AI 架構師與使用者
- **對應 PRD**: [docs/specs/0086-color-theme-mode-quadrant-sync-and-local-incremental-chips-pipeline-spec.md](../specs/0086-color-theme-mode-quadrant-sync-and-local-incremental-chips-pipeline-spec.md)

---

## 1. 背景與脈絡 (Context)

在聰明錢籌碼流向象限圖中：
1. 既有象限浮水印標籤及頂部象限統計指標卡片使用靜態硬編碼的色彩值，未能連動使用者所選擇的 `colorTheme`（紅漲綠跌 vs 綠漲紅跌），造成國際慣例模式下多頭飆股顯示為紅、高檔倒貨顯示為綠的反直覺體驗。
2. 時序回放（T-4 ~ T）依賴單日折算，使用者提議採用「本地化儲存用時間換空間，慢慢補足」策略，讓應用程式在背景非同步逐步沉澱過去多個交易日的真實日報。

---

## 2. 決策考量 (Decision Drivers)

1. **使用者習慣一致性**：無論使用者習慣台股習慣或美股習慣，全站所有視覺元素（包含圖表浮水印、統計卡片）必須 100% 保持色彩定義一致。
2. **KISS 與漸進增強**：避免引入複雜的後端代理排程或龐大的批次下載，利用前端 IndexedDB 與背景非同步增量抓取，實現開箱即用、無伺服器負擔的「時間換空間」歷史沉澱。
3. **無阻塞與防風控**：背景抓取必須受控節流，首屏渲染零延遲（優先使用快取），抓取失敗時平滑降級為係數模擬，杜絕畫面卡死或白屏。

---

## 3. 決策內容 (Decisions)

1. **象限主題色彩對照表**：
   - 抽出 `getQuadrantThemeColors(colorTheme: ColorThemeMode)` 輔助函式，動態回傳四象限之 `textColor`, `bgColor`, `borderColor`。
   - `BREAKOUT`（主力抬轎）：`taiwan` 時為紅，`international` 時為綠。
   - `DISTRIBUTION`（割韭菜警戒）：`taiwan` 時為綠，`international` 時為紅。
   - `ACCUMULATION`（逢低撿便宜）：維持金黃色琥珀光。
   - `LIQUIDATION`（冷凍提款）：維持冷灰藍色光。
2. **本地籌碼增量回補管線 (`Background Incremental Hydration`)**：
   - 在 `ChipsWorkspace` 掛載後，非同步調用 `fetchRecentTwseReports(5)`。
   - 依賴 `TWSE_TPEX_CHIPS_V4_${date}` 之 IndexedDB 快取結構，每日抓取成功後即時沉澱。
   - 時序播放器在生成各影格時，若存在該日歷史快取，優先注入真實法人張數。

---

## 4. 後續影響與優點 (Consequences)

- **優點**：
  - 完美符合美股/國際用戶與台股用戶的色彩心智直覺。
  - 隨著日常使用，本地籌碼歷史資料庫自動擴充且離線可用，時序播放越用越精確。
- **風險與防禦**：
  - 若遇長假或假日，歷史交易日推算可能遇到空資料；已實裝跳過週末與上限重試機制予以防禦。
