# 01 — 儲存架構向下相容、模型正規化與批次代碼塊抽取

## Parent
- 關聯母 Issue: #318
- 關聯規格: [Spec 0201](../../../docs/specs/0201-war-room-multi-ai-syndicate-loopback-and-consensus-defense-spec.md)

## What to build
作為基礎資料與讀取層，本切片提供：
1. **模型名稱語意正規化 (`normalizeAiModelName`)**：自動將使用者貼入的不同模型字串（如 `Claude 3.5 Sonnet`、`claude-3-5`、`ChatGPT 4o`、`Perplexity` 等）轉換為規範的標準名稱，避免因為字串變體導致模型槽位碎片化。
2. **批次代碼塊抽取 (`parseLoopbackContentBatch`)**：支援從長篇分析文章中一次性以全域正則抽取多個 ````json ... ```` 代碼區塊，支援單次貼上即可匯入多家 AI 模型裁決。
3. **雙軌向下相容讀取 (`getPinnedStrategies`)**：升級 LocalStorage 讀取邏輯，若取出的舊版資料為單一物件，自動無損包裹為陣列回傳，杜絕現有使用者升級時拋出 `TypeError` 導致白屏崩潰。

## Acceptance criteria
- [ ] `normalizeAiModelName` 支援 Claude、ChatGPT、Perplexity、Gemini 名稱變體匹配，其餘未知模型保留原始去除首尾空白字串。
- [ ] `parseLoopbackContentBatch` 能夠在單段文字中識別並抽取多個合法 JSON 區塊，若其中有非 JSON 區塊則安全忽略。
- [ ] `getPinnedStrategies` 在面對 Legacy 單一物件格式時，能安全回傳包含該筆資料的長度為 1 陣列，無例外拋出。
- [ ] 新增完整純邏輯單元測試，達成 100% 覆蓋。

## Blocked by
- None — can start immediately.
