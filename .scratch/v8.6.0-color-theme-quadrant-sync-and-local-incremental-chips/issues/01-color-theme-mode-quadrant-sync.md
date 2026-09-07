# Issue #86-1: 象限顏色動態連動使用者燈號習慣 (Color Theme Mode Quadrant Sync)

- **標籤**: `ready-for-agent`
- **所屬版本**: v8.6.0
- **依賴任務**: 無

## 任務描述
在 `SmartMoneyBubbleChart.tsx` 與 `ChipsWorkspace.tsx` 中，將「主力抬轎飆股區」與「割韭菜警戒區」的文字、背景、邊框色彩，從靜態硬編碼改為依據 `colorTheme` 動態連動：
1. `colorTheme === 'international'` 時：
   - 主力抬轎區 (多頭強推) 為綠色 (`#10b981` / `#34d399` / `rgba(16, 185, 129, 0.12)`)
   - 割韭菜警戒區 (空頭警示) 為紅色 (`#ef4444` / `#f87171` / `rgba(239, 68, 68, 0.12)`)
2. `colorTheme === 'taiwan'` 時：
   - 主力抬轎區為紅色
   - 割韭菜警戒區為綠色
3. 編寫對應單元測試以驗證主題切換時色彩輸出符合預期。

## 驗收標準
- [ ] `SmartMoneyBubbleChart` 水印標籤色彩依 `colorTheme` 切換。
- [ ] `ChipsWorkspace` 頂部四張卡片邊框與文字依 `colorTheme` 切換。
- [ ] 單元測試通過。
