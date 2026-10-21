# 06 — 提示詞注入【2026 時空對齊錨點】防退化指令

**What to build:**
在提示詞 XML 結構頂部注入 `<temporal_grounding_anchor>`，明訂世界當前時間為 2026 年，鎖定所有 2026 年之營收、財報與籌碼均為當前真實客觀事實，禁止外部大模型倒退推論為 2024/2025 年。

**Blocked by:** 05 — 盤中即時量價一致性回退防禦

**Status:** ready-for-agent

- [ ] 在 `src/engine/strategicPromptEngine.ts` 新增 `buildTemporalAnchorXml(digest)`。
- [ ] 輸出 XML 標籤包含 `<temporal_grounding_anchor>`，包含防時空退化硬指令。
- [ ] 在 `src/engine/strategicPromptEngine.test.ts` 驗證生成之提示詞包含完整的 2026 錨點與防幻覺文字。
