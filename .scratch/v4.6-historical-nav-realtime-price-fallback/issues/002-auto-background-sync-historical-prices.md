# Issue #2: 進入資產成長 (NAV) 分頁時背景平滑自動補抓歷史日 K

- **狀態**：`READY_FOR_AGENT`
- **標籤**：`feature`, `nav`, `auto-sync`
- **關聯規格**：`docs/specs/0029-historical-nav-realtime-price-fallback-and-auto-sync.md` (AC-2)

## 任務描述 (Description)
在 `src/App.tsx` 監聽 `activeTab === 'growth'`。當使用者切換至資產成長折線圖分頁且檢測到有活躍持倉標的缺少歷史日 K 時，在背景非阻塞自動觸發 `handleSyncHistoricalPrices`。

## 驗收標準 (Acceptance Criteria)
1. 監聽分頁切換至 `growth` 狀態。
2. 自動發起日 K 補齊請求，無需手動點擊。
3. 同步過程平滑不阻塞 UI 操作。
