# ADR #0100: 肌肉書僮量化運算解耦至 Engine、Fast Refresh 規範化與開發代理異常防護

## 狀態
- 狀態：`ACCEPTED`
- 日期：2026-09-09
- 決策者：系統架構師、前端工程師

---

## 背景與問題脈絡 (Context)
在多個工作區（WarRoom、MuscleBooker）相互調用量化指標運算時，出現了下列架構違規：
1. **React Fast Refresh 違規**：在 React 元件檔案 `MuscleBookerWorkspace.tsx` 中同時包含了大量的純業務常數與純運算函式並進行 `export`，導致 Vite 在開發模式下無法執行元件熱替換 (HMR)，頻繁觸發頁面整頁刷新。
2. **代理伺服器未捕捉異常**：`vite.config.ts` 中的 proxy 缺乏錯誤處理監聽器，在外部 Yahoo Finance 發生連線超時或 DNS 異常時拋出未捕獲錯誤。
3. **文檔格式技術債**：Markdownlint 標題與清單周圍空行不符合標準規範。

---

## 決策 (Decision)

1. **實施 UI 與量化運算徹底解耦**：
   - 將所有指標演算法 (`scanMuscleBookerItem`, `generateSyntheticCandles`)、資產池標的清單 (`TW50_BLUE_CHIP_SYMBOLS`, `US_MEGA_50_CORE_SYMBOLS`, `TW_TOP_30_FOCUS_SYMBOLS`, `US_TOP_30_FOCUS_SYMBOLS`)、小白百科字典 (`BEGINNER_TOOLTIPS`) 及相關介面型別集中收攏至 `src/engine/muscleBookerEngine.ts`。
   - `MuscleBookerWorkspace.tsx` 純粹作為展示與交互層，只匯出 React 元件。
2. **開發代理錯誤熔斷隔離**：
   - 於 `vite.config.ts` 中的各 proxy 路由配置 `configure: (proxy) => { proxy.on('error', ...)}`，攔截網路失敗並回應 502，由前端現有的三層降級機制平滑處理。
3. **全量修復 Markdownlint 規範**：
   - 全面清理與修復 `MD012`、`MD022`、`MD032` 警告。

---

## 後續影響 (Consequences)

### 正面影響 (Pros)
- **開發效率倍增**：儲存程式碼時 Vite 實現毫秒級局部熱替換，不再整頁重新加載。
- **架構邊界清晰**：量化演算法歸屬於 Engine 領域層，可獨立進行單元測試與跨工作區調用，不再依賴 UI 元件。
- **終端機輸出純淨**：外部網路故障時不再污染開發終端機。

### 妥協與考量 (Trade-offs)
- 呼叫 `scanMuscleBookerItem` 的元件（如 `WarRoomWorkspace.tsx`）需微調 import 路徑，已全數完成修正與驗證。
