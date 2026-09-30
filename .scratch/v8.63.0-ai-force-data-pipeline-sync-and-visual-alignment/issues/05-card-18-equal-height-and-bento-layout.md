# 05 — 18 主力追蹤總評判等高與三層專業佈局重構 (Card 18 Equal Height & Bento Layout)

**What to build:**
Card 18 根容器設定 `height: 100%`，與左側 Card 16、17 底部嚴格等高齊平，消除底部凹陷。
內部版面重構為三層清晰結構：頂部標題/狀態膠囊 ➔ 中部「主力語意：調節減碼」20px 發光大看板 ➔ 底層結構化關鍵數據指標膠囊（法人近5日、VWAP偏離、RSI）與完整研判論述。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [x] 設定 `MainForceVerdictCard` 根容器與外層 Grid 子項目 `height: 100%`，垂直方向 Flex 均勻延展
- [x] 內部重構為三層式 Bento 排版：
  - 頂層：🔮 標題與「法人動作」狀態膠囊徽章
  - 中層：主力語意核心看板（20px 發光字體與多空語意色彩）
  - 底層：結構化關鍵數據膠囊（5日法人累計、VWAP 偏離、RSI）+ 完整 AI 論述
- [x] 單元測試：驗證 Card 18 容器等高樣式與三層排版渲染正確性
