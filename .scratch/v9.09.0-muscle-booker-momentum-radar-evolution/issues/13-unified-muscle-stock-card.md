# 13 — 抽取單一職責共用卡片 MuscleStockCard (Unified Stock Card)

**What to build:**
消滅前端代碼 7 處重複拷貝貼上的反模式：
1. 建立 `src/components/muscleBooker/subcomponents/MuscleStockCard.tsx`。
2. 統一管理股票代碼、名稱、現價、防守價 Tooltip、風益比 Tooltip、操盤小抄展開等視覺邏輯。
3. 支援局部受控/非受控展開狀態，消滅主組件內 1,000+ 行重複的卡片 JSX。
4. 撰寫組件單元測試覆蓋卡片樣式、點擊展開與 Tooltip 渲染。

**Blocked by:** Ticket 12

**Status:** open

- [x] 建立 `src/components/muscleBooker/subcomponents/MuscleStockCard.tsx`
- [x] 抽取統一的股票資訊卡片 Props 定義
- [x] 支援買進/觀望/賣出等不同色彩語意標籤
- [x] 編寫組件測試驗證基本渲染與展開切換

