# 03 — 最嚴格保命停損優先警報與共識/分歧指標評估

## Parent
- 關聯母 Issue: #318
- 關聯規格: [Spec 0201](../../../docs/specs/0201-war-room-multi-ai-syndicate-loopback-and-consensus-defense-spec.md)

## What to build
作為法人量化風控評估層，本切片提供：
1. **多模型盤中觸價評估 (`evaluateMultiStrategyTriggers`)**：
   - **最嚴格保命停損優先 (Strict Lowest Risk Line)**：自動比較當前所有有效模型之停損價，取最高停損門檻（`Math.max(...stopLosses)`）。當最新市價跌破該最高門檻時，立刻判定為跌破停損，並生成警報訊息（指名是哪一家模型發起嚴格防守），防止使用者因其他寬鬆停損而產生主觀凹單。
   - 評估是否有任一模型達到停利目標或突破翻多點。
2. **共識與分歧極簡動態指標**：
   - 計算各模型停損點的落差比率（$\text{Spread} = (\max - \min) / \text{Price}$）。
   - 當差幅 $< 2\%$ 時標註為「高度共識（Consensus）」；當差幅 $> 5\%$ 時標註為「分歧警告（Divergence Warning，建議降低部位槓桿）」。

## Acceptance criteria
- [ ] 當多模型停損不同時，跌破最高停損價即立刻回傳 `isStopLossTriggered = true`，且警報訊息包含觸發模型名稱。
- [ ] 停損點位差幅計算準確，能產生對應的共識或分歧狀態標籤。
- [ ] 單一模型時退化為基準評估，無分歧誤判。
- [ ] 單元測試覆蓋多種價格情境（共識跌破、單一模型跌破、共識看多停利達標）。

## Blocked by
- Ticket 02 (多模型並存儲存、同名覆蓋與單卡獨立結案回報)
