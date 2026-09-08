# Issue 03: 多因子真實帳戶事件驅動 AI 晨報引擎

## 狀態
- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`advisor`, `engine`

## 需求
1. 在 `macroAdvisorEngine.ts` 擴展 `MacroAdvisorInput`，支援傳入：
   - `holdingSignals?: { symbol: string; name?: string; action: 'BUY' | 'AVOID' | 'SELL' | 'HOLD'; stopLossPrice?: number }[]`
   - `upcomingDividends?: { symbol: string; amount: number; payDate: string; daysLeft: number }[]`
2. 動態生成實戰作戰指令：
   - 具體點名個人在倉標的（如台積電突破買點、中信金破線停損）。
   - 結合重大催化劑（如 3 天後 CPI）給出資金防守或加碼具體策略。
   - 結合待收股息進度提示現金活水注入。
3. 杜絕空泛雞湯，單元測試覆蓋多因子動態情境。
