# Issue #86-2: 籌碼資料本地化儲存背景增量補足 (Local Incremental Chips Pipeline)

- **標籤**: `ready-for-agent`
- **所屬版本**: v8.6.0
- **依賴任務**: 無

## 任務描述
實現「用時間換空間」的本地化籌碼儲存管線：
1. 在 `ChipsWorkspace.tsx` 掛載時，除加載當前最新日報外，在背景調用 `fetchRecentTwseReports(5)` 漸進沉澱最近 5 個交易日之 TWSE + TPEx 歷史日報至 IndexedDB。
2. 管理背景補齊的 `historyChipsReports` 狀態，當歷史日報補齊或快取命中時，提供給時序軌跡生成器。
3. 在生成 `histFlows` 時，優先對齊真實歷史日報中之外資、投信、自營商張數；若尚未補齊則以增量折算作為平滑降級。
4. 編寫單元測試驗證背景增量補齊與歷史籌碼對齊邏輯。

## 驗收標準
- [ ] 背景自動以低優先級觸發歷史日報沉澱。
- [ ] IndexedDB 快取命中時 0 秒回填歷史日報。
- [ ] 時序播放器優先使用真實歷史法人數據。
