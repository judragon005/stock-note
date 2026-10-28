# 02 — 單位淨值法 (Unit NAV / TWR) 逐日狀態機與出入金解耦

**What to build:**
重構 `src/engine/historicalNav.ts` 中的逐日狀態機，全面推行華爾街 GIPS 會計標準之「單位淨值法 (Unit NAV / Time-Weighted Return)」。首日設定單位淨值為 100.00，每日報酬率 $R_t$ 僅反映持股市值與現金在當日投資活動中的真實漲跌（未計入當日外部出入金前）。外部大額出入金時，僅以當日單位淨值增減份額（Units），單位淨值本身保持連續不跳變。徹底消滅外部入金被算成當日暴賺、外部出金被算成斷頭暴跌之虛假 MDD。

**Blocked by:** None — can start immediately.

**Status:** DONE

- [x] 擴充 `src/types/stock.ts` 中 `PortfolioDailySnapshot` 新增 `unitNAV: number` 欄位
- [x] 在 `historicalNav.ts` 中實作 Units 與 UnitNAV 逐日狀態機推演
- [x] 每日報酬率計算與外部出入金隔離：`UnitNAV_t = UnitNAV_{t-1} * (1 + R_t)`
- [x] 外部出入金等比折算增減份額：`Units_t = Units_{t-1} + NetExternalFlow / UnitNAV_t`
- [x] 在 `src/engine/historicalNav.test.ts` 驗證外部大額入金（如 100 萬加碼至 400 萬）時，當日 `unitNAV` 維持不變，報酬率為 0%
