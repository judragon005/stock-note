# 06 — 掛載 Row 4 卡片 (16 ~ 18) 與任務視圖

**What to build:**
將 `TermTooltip` 掛載至 Row 4 卡片與任務視圖切換列：
1. **16 買賣力分布圖 (`ForceDistributionCard.tsx`)**：
   - 卡片標題 `ⓘ` 圖示。
   - 大戶買盤、散戶買盤、散戶賣盤 3 大環型進度。
2. **17 多空強度分布 (`BullBearStrengthCard.tsx`)**：
   - 卡片標題 `ⓘ` 圖示。
   - 多方強度、空方強度、量能強度與信號等級。
3. **18 主力追蹤總評判 (MLP-AI) (`MainForceVerdictCard.tsx`)**：
   - 卡片標題 `ⓘ` 圖示。
   - 主力語意核心（調節減碼、逢低吸籌、洗盤整理、鎖碼推升等）與買賣指引。
4. **底部任務視圖切換列 (`TaskViewsSwitcher.tsx`)**：
   - 綜合分析報告、技術警示報告、KD+MA 圖表、MACD 圖表、原始數據明細。

**Blocked by:** 05-mount-row3-cards

**Status:** completed

- [x] Card 16 買賣力三環掛載 Tooltip
- [x] Card 17 多空強度三環掛載 Tooltip
- [x] Card 18 主力總評判語意掛載 Tooltip
- [x] 底部視圖切換列掛載 Tooltip
- [x] 既有單元測試綠燈驗證
