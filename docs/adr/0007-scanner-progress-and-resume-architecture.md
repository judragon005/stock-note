# ADR 0007: 智慧掃描公司行動進度可視化、受控並行與斷點接續架構

- **狀態**: Accepted
- **日期**: 2026-08-21
- **決策者**: 核心開發團隊
- **相關 PRD**: [0007-corporate-action-scanner-progress-and-resume.md](../specs/0007-corporate-action-scanner-progress-and-resume.md)

---

## 1. 上下文與問題陳述 (Context & Problem)

當使用者匯入大量歷史交易紀錄或持股多檔標的時，原本的「智慧掃描公司行動」功能為單線循序執行且無進度展示，使用者無從得知當前進度或是否有卡死。同時若中途取消或失敗，無法保留已取得的數據，亦無法從斷點處接續掃描。

## 2. 決策方案 (Decision)

1. **受控並行池 (Concurrency = 3) 與微延遲 (Jitter)**：
   - 採用 Promise Worker Pool 同時執行 3 檔股票查詢，在多檔標的下將掃描時間自 30 秒縮減至 5~10 秒內。
   - 請求間加入 60~100ms 輕量延遲，避免短時間內對 TWSE 與 CORS 代理觸發 Rate Limit。
2. **原生 AbortSignal 中斷機制**：
   - 全面串接 `AbortController`，使用者點擊「中止掃描」或關閉彈窗時立即終止 pending 網路請求，保護使用者頻寬與記憶體。
3. **斷點記錄與接續掃描 (Resume Mechanism)**：
   - 彈窗與引擎支援 `symbolsToScan` 參數與完成代碼記錄 (`completedSymbolsRef`)。
   - 中止或部分失敗時保留已掃描事件，並提供「接續掃描剩餘 (X 檔)」按鈕精準續掃。
4. **Session 級個股記憶體快取 (Session In-Memory Cache)**：
   - 實作 `CorporateActionSessionCache`，已掃描的個股在同一次頁面生命週期內免重複請求，提供「強制全量重掃」按鈕支援手動清除快取。
5. **進度條與狀態徽章可視化**：
   - 即時計算進度百分比並展示漸變發光動畫，動態顯示 `正在比對：2330 台積電 (3/15)` 與 `已找到 N 筆事件`。

## 3. 效益與影響 (Consequences)

- **優點**：
  - 使用者體驗極度透明流暢，徹底消除當機黑盒子疑慮。
  - 掃描速度大幅提升 3~5 倍，且具備 API 限流防護。
  - 斷點接續與 Session 快取避免重複消耗 API 流量與等待時間。
- **缺點 / 權衡**：
  - 需妥善管理 `AbortController` 生命週期，避免 unmount 後殘留狀態。
