# 05 — 頂部操作列去重與全頁 GLOBAL / TW / US 視角貫通

**Parent:** #584 (Spec 0235)

**What to build:** 移除 `WarRoomWorkspace` 頂部 L0 與 L1 重複的 `GLOBAL / TW / US` 視角切換按鈕組（統一保留於 `MacroDualThermometerBar` 且與 App Header 雙向連動）；升級四聯卡使 `US` 視角動態呈現 `^SOX`、`S&P 500 (^GSPC)`、`Nasdaq (^IXIC)`、`TSM ADR`；卡 4 補齊外資現貨買賣超顯示；並讓 `HoldingTacticalSignalsCard` 隨 `marketView` (`TW` / `US`) 自動過濾對應市場持股。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 頂部僅存在單一組 `GLOBAL / TW / US` 視角切換器
- [ ] `US` 視角下四聯卡正確顯示 `S&P 500` 與 `Nasdaq` 點位、漲跌幅與 20MA 乖離
- [ ] `GLOBAL / TW` 卡 4 同時呈現三大法人合計、外資現貨買賣超與投信買賣超
- [ ] `HoldingTacticalSignalsCard` 依 `marketView` 過濾對應市場持股並提供切回全市場提示
- [ ] `WarRoomWorkspace.test.tsx` 驗證視角聯動正常
