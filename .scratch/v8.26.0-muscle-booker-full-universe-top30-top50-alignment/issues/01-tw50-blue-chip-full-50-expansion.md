# Issue 01: 臺灣 50 權值核心滿編 50 檔擴充 (TW50 Blue Chip Full 50 Expansion)

## 狀態與分流

- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`ready-for-agent`, `constants`, `tw-stock`

## 任務說明

1. 在 `src/engine/muscleBookerEngine.ts` 中將 `TW50_BLUE_CHIP_SYMBOLS` 完整擴充至 50 檔。
2. 納入 0050 官方成分股完整 50 檔標的（含聯電、緯創、華碩、長榮、統一超、世芯-KY、奇鋐、聯詠、欣興、研華、國巨、緯穎、彰銀等）。
3. 確保 `TW50_BLUE_CHIP_SYMBOLS.length === 50`。
