# PRD-0086: 象限顏色動態連動使用者燈號習慣與籌碼資料本地化增量補足規範 (Color Theme Mode Quadrant Sync & Local Incremental Chips Pipeline Spec)

- **狀態**: 已核准 (Approved)
- **版本**: v8.6.0
- **日期**: 2026-09-07
- **優先級**: P0
- **對應 ADR**: [docs/adr/0086-color-theme-mode-quadrant-sync-and-local-incremental-chips-pipeline.md](../adr/0086-color-theme-mode-quadrant-sync-and-local-incremental-chips-pipeline.md)

---

## 1. 背景與核心痛點 (Background & Problem Statement)

1. **象限視覺標籤色彩硬編碼 (Hardcoded Colors)**：
   - 既有 `SmartMoneyBubbleChart.tsx` 畫布右上角「🔥 主力抬轎飆股區」與右下角「⚠️ 割韭菜警戒區」，其 SVG 文字與 `ChipsWorkspace.tsx` 頂部統計指標卡片均固定採用紅底/綠底。
   - 當使用者設定習慣為「🟢 綠漲 🔴 紅跌」（美股/國際慣例）時，主力抬轎飆股區（多頭勝勢）仍顯示為紅色，割韭菜警戒區（空頭倒貨）仍顯示為綠色，與使用者的色彩心智模型直接衝突。
2. **籌碼歷史日報缺失與單日模擬問題 (Lack of Incremental Local Storage)**：
   - 目前上市/上櫃法人日報僅拉取當日單一快照，時序回放（T-4 ~ T）僅以單日數據乘上比例係數折算，無法呈現真實歷史五日外資、投信、自營商籌碼動能變化。
   - 使用者明確要求：**「相關的籌碼資料本地化儲存用時間換空間，慢慢補足」**。

---

## 2. 解決方案設計 (Solution Design)

### 2.1 依據使用者燈號習慣動態映射象限色彩 (`ColorThemeMode`)
- 統一提取色彩映射邏輯：
  - **台灣慣例 (`taiwan`, 🔴 紅漲 🟢 綠跌)**：
    - 主力抬轎飆股區 (多頭/買超)：紅色系 (`#ef4444` / `#f87171` / `rgba(239, 68, 68, 0.12)`)
    - 割韭菜警戒區 (高檔倒貨/危險)：綠色系 (`#10b981` / `#34d399` / `rgba(16, 185, 129, 0.12)`)
  - **國際慣例 (`international`, 🟢 綠漲 🔴 紅跌)**：
    - 主力抬轎飆股區 (多頭/買超)：綠色系 (`#10b981` / `#34d399` / `rgba(16, 185, 129, 0.12)`)
    - 割韭菜警戒區 (高檔倒貨/危險)：紅色系 (`#ef4444` / `#f87171` / `rgba(239, 68, 68, 0.12)`)
  - **逢低撿便宜區**：固定金黃/琥珀色系 (`#fbbf24` / `rgba(245, 158, 11, 0.12)`)
  - **冷凍提款區**：固定冷灰藍色系 (`#94a3b8` / `rgba(100, 116, 139, 0.12)`)
- 覆蓋範圍：
  1. `SmartMoneyBubbleChart.tsx`：四象限浮水印 SVG 文字顏色。
  2. `ChipsWorkspace.tsx`：頂部四象限統計卡片的背景、邊框、文字與圖示顏色。

### 2.2 籌碼資料本地化儲存：時間換空間、背景增量補足 (`Background Incremental Hydration`)
- **架構原則**：KISS 原則、防 429 節流、零 UI 阻塞。
- **快取架構**：
  - 繼續使用 IndexedDB `settings` 表中的 `TWSE_TPEX_CHIPS_V4_${date}` 鍵值。
- **背景補齊機制**：
  - 頁面加載時，以最新交易日日報（若有快取則 0 延遲命中）立即完成首屏渲染。
  - 首屏渲染完成後，背景非同步啟動最近 5 個交易日的歷史日報增量檢查：
    - 若本地已快取該日日報且包含上市櫃覆蓋（`isMarketCoverageValid`），則直接讀取。
    - 若未快取，以受控節流方式發送雙軌請求（TWSE + TPEx）並非同步寫入 IndexedDB。
- **時序播放器無縫對齊真實數據**：
  - 若各影格日期已在本地 IndexedDB 補齊真實日報，時序播放器直接讀取該日真實的外資、投信、自營商買賣超張數。
  - 若歷史日報尚未補齊，採用平滑折算進行優雅降級 (Graceful Degradation)。

---

## 3. 驗收標準 (Acceptance Criteria)

- [ ] **AC-1**: 當 `colorTheme === 'international'` 時，`SmartMoneyBubbleChart` 之「🔥 主力抬轎飆股區」文字為綠色，「⚠️ 割韭菜警戒區」文字為紅色。
- [ ] **AC-2**: 當 `colorTheme === 'taiwan'` 時，「🔥 主力抬轎飆股區」文字為紅色，「⚠️ 割韭菜警戒區」文字為綠色。
- [ ] **AC-3**: `ChipsWorkspace` 頂部四張卡片邊框、背景與文字依據 `colorTheme` 正確切換紅/綠色彩。
- [ ] **AC-4**: 頁面掛載時觸發背景歷史籌碼增量回補，歷史日報成功持久化存入 IndexedDB。
- [ ] **AC-5**: 時序播放器在本地已沉澱歷史日報時，各影格精準對齊真實歷史日報張數。
- [ ] **AC-6**: 現有單元測試 100% 通過，TypeScript 編譯 0 錯誤。
