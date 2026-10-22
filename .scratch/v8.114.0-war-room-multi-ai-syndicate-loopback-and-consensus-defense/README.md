# v8.114.0 任務規劃：戰情室外部 AI 多智囊團並行回流、模型去重覆蓋與法人風控共識防線 (Spec 0201)

- **版本目標**：v8.114.0
- **關聯規格**：[Spec 0201](../../docs/specs/0201-war-room-multi-ai-syndicate-loopback-and-consensus-defense-spec.md)
- **GitHub 關聯 Issue**：[#318](https://github.com/judragon005/stock-note/issues/318)
- **分流標籤**：`enhancement`、`ready-for-agent`

## 任務清單與狀態

| 票券編號 | 標題 | 狀態 | 阻塞條件 | 負責模組與檔案 |
| :--- | :--- | :---: | :---: | :--- |
| **Ticket 01** | 儲存架構向下相容、模型正規化與批次代碼塊抽取 | `completed` | None | `src/engine/strategyPinEngine.ts`<br>`src/types/strategyPin.ts`<br>`src/engine/strategyPinEngine.test.ts` |
| **Ticket 02** | 多模型並存儲存、同名覆蓋與單卡獨立結案回報 | `completed` | Ticket 01 | `src/engine/strategyPinEngine.ts`<br>`src/engine/strategyPinEngine.test.ts` |
| **Ticket 03** | 最嚴格保命停損優先警報與共識/分歧指標評估 | `completed` | Ticket 02 | `src/engine/strategyPinEngine.ts`<br>`src/engine/strategyPinEngine.test.ts` |
| **Ticket 04** | 戰情室緊湊型條列 UI、全員結案與 E2E 整合驗收 | `completed` | Ticket 03 | `src/components/aiForceDashboard/WarRoomPromptCard.tsx`<br>`src/components/aiForceDashboard/WarRoomPromptCard.test.tsx` |
