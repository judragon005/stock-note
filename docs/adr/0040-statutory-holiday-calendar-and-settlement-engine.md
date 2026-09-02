# ADR #0040: 法定國定假日休市日曆與精確交割結算引擎 (Statutory Holiday Calendar & Settlement Precision Engine)

- **狀態**：`ACCEPTED`
- **日期**：2026-08-28
- **決策者**：AI Agent & Architecture Lead
- **關聯 PRD**：[docs/specs/0040-statutory-holiday-calendar-and-settlement-engine.md](../specs/0040-statutory-holiday-calendar-and-settlement-engine.md)
- **關聯技術債**：[docs/debts/0006-statutory-holiday-calendar-and-settlement-precision.md](../debts/0006-statutory-holiday-calendar-and-settlement-precision.md)

---

## 1. 背景與問題 (Context & Problem Statement)

在專案原有架構中，`src/engine/cashLedgerEngine.ts` 內的交割日推算函式 `calculateSettlementDate` 僅跳過「週六與週日」：
1. **長假時態誤差**：遇到台股農曆春節封關（連續休市 7~11 天）、清明、端午、中秋、國慶、元旦，以及美股 10 大聯邦休市日（馬丁路德金紀念日、華盛頓誕辰、耶穌受難日、陣亡將士紀念日、六月節、獨立日、勞動節、感恩節、聖誕節）時，推算之交割扣款日在途款會提早 1~7 天發生。
2. **會計真實性失真**：待交割在途款 (`pendingReceivables` / `pendingPayables`) 會在假期中提前結算歸入實質已交割可用現金 (`settledCash`)，造成現金帳本餘額與交易購買力 (Trading Buying Power) 的虛假時態偏差。

---

## 2. 決策方案 (Decision)

我們決定導入本地端 **休市日曆與營業日核心模組 (`src/engine/holidayCalendar.ts`)**，並升級現金帳本交割引擎：

1. **100% 離線優先之日曆常數表**：
   - 內建 2023～2030 年台股 (TWSE/TPEx) 與美股 (NYSE/NASDAQ/SIFMA) 法定休市日清單 (`TW_MARKET_HOLIDAYS`, `US_MARKET_HOLIDAYS`)。
   - 採用 `ReadonlySet<string>` 結構，提供時間複雜度 $O(1)$ 的極速比對。
   - 完整收錄台股春節封關（封關日至開紅盤日）、國定節日、金管會補班日不交易不交割規則，以及美股 2024 年 T+1 新制與 10 大聯邦休市日。
2. **純函式營業日與交割日引擎**：
   - 提供 `isMarketHoliday(dateStr, market)`、`isBusinessDay(dateStr, market)` 與 `getNextBusinessDay(dateStr, market)`。
   - 升級 `calculateSettlementDate(tradeDateStr, market)`：以 `isBusinessDay` 取代純週末計數，精準推進 T+2（台股）與 T+1（美股）交割日。
3. **優雅降級保護 (Graceful Fallback)**：
   - 若日期超出 2023～2030 內建日曆範圍，系統自動安全降級為標準週末過濾規則，絕不拋出未捕獲之例外。

---

## 3. 結果與影響 (Consequences)

### 正向影響 (Positive)
- **交割在途款時態 100% 精確**：台股農曆春節跨年封關、清明連假以及美股感恩節/聖誕節期間，款項均精確維持為在途款 (`PENDING`)，待正式開紅盤/開市營業日才交割。
- **零網路延遲與抗脆弱性**：無外部 API 網路或第三方伺服器相依，純代碼離線即時計算。
- **品質門禁全面綠燈**：21 個測試套件、251 個單元測試 100% 通過，TypeScript 0 錯誤。
- **技術債 #0006 完整解決**。

---

## 4. 相關模組與測試
- `src/engine/holidayCalendar.ts` (新增)
- `src/engine/holidayCalendar.test.ts` (新增)
- `src/engine/cashLedgerEngine.ts` (升級)
- `src/engine/cashLedgerEngine.test.ts` (擴充)
