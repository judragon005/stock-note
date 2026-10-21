# Ticket 04: 戰情室一鍵貼入解析器、策略釘選卡片與歷史勝率榜

- **狀態**：`ready-for-agent`
- **關聯 Spec**：[Spec 0200](../../../docs/specs/0200-war-room-prompt-semantic-grounding-macro-pipeline-and-defense-loopback-spec.md)
- **關聯 Issue**：#312

## 任務目標
1. 在 `src/components/aiForceDashboard/WarRoomPromptCard.tsx` 底部擴充操作介面：
   - 提供「📋 一鍵貼入外部 AI 裁決」按鈕（優先調用 `navigator.clipboard.readText()`，權限阻擋時自動秒開小輸入框降級支援 `Ctrl+V`）。
   - 貼入後微反饋顯示「✓ 已成功錨定 [模型名稱] 策略防線」。
2. 渲染已釘選之作戰策略卡片：
   - 顯示：模型標籤（如 `Claude 3.5 Sonnet`）、停損點、目標價、翻多點、一句話裁決與時態標籤。
   - 盤中即時狀態檢測：若現價跌破停損或突破翻多，卡片即時高亮警報，並提供「我知道了 (已確認)」按鈕防疲勞。
3. 渲染極簡折疊式「AI 智囊團勝率覆盤榜」：
   - 顯示最近 20 筆歷史釘選策略之結果（達標／停損），計算並列出各 AI 模型的勝率統計。
4. 撰寫組件單元測試，確保各種狀態渲染無誤。
