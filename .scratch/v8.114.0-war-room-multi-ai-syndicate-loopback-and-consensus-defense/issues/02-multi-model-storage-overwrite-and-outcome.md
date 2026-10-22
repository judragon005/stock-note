# 02 — 多模型並存儲存、同名覆蓋與單卡獨立結案回報

## Parent
- 關聯母 Issue: #318
- 關聯規格: [Spec 0201](../../../docs/specs/0201-war-room-multi-ai-syndicate-loopback-and-consensus-defense-spec.md)

## What to build
作為多模型資料維護層，本切片提供：
1. **多模型並存與同名覆蓋儲存 (`savePinnedStrategy`)**：
   - 同一標的下支援多個不同模型（如 Claude 與 ChatGPT）同時儲存。
   - 儲存時以 `symbol + normalizedModel` 為唯一識別。若標的下已存在相同模型名稱，自動用最新裁決與點位覆蓋替換；若為新模型則追加至清單。
2. **單一模型刪除 (`clearPinnedStrategy(symbol, aiModel)`)**：支援僅移除指定模型，或在未指定模型時清空該標的所有策略。
3. **單卡獨立結案 (`recordStrategyOutcome`)**：各模型支援獨立回報結案（WIN / LOSS / EXPIRED），結案後將該筆戰績正確記錄至 `STRATEGY_OUTCOMES_STORAGE_KEY` 並從目前釘選中移除該特定模型，確保智囊團勝率榜各模型數據完全客觀可信。

## Acceptance criteria
- [ ] 儲存不同模型時，陣列長度增加，各模型獨立並存。
- [ ] 儲存相同模型時，覆蓋對應元素，陣列長度不變，數據更新為最新。
- [ ] 支援單模型刪除與單模型獨立結案回報，其餘模型不受任何影響。
- [ ] 既有智囊團勝率統計能正確計算各模型的勝率百分比。

## Blocked by
- Ticket 01 (儲存架構向下相容、模型正規化與批次代碼塊抽取)
