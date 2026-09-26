# 05 — 04 AI 籌碼熱區圖邊界與溢出微調 (Card 04 Boundary Guard)

**What to build:**
修改 `VolumeProfileCard.tsx`：
- 優化 Y 軸價格階梯與右側 5 大成交量帶（壓力區、大量成交區、密集成交區、價平區、支撐區）之文字行高與 padding。
- 防止在不同解析度下的文字換行變形與邊界裁切。

**Blocked by:** None — can start immediately

**Status:** completed

- [x] 價格刻度與 5 大成交量帶文字邊界清晰，無截斷或換行破圖
- [x] 相關單元測試 `VolumeProfileCard.test.ts` 100% 綠燈
