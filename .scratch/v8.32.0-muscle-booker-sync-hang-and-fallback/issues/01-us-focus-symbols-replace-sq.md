# Issue 01: 替換美股焦點池成分股 SQ 為 PYPL

## 狀態與分流
- 狀態：`CLOSED`
- 負責人：Agent
- 標籤：`ready-for-agent`, `engine`, `muscle-booker`
- 關聯 Issue：#3

## 任務說明
1. 修改 `src/engine/muscleBookerEngine.ts`：
   - 在 `US_TOP_30_FOCUS_SYMBOLS` 中將 `{ symbol: 'SQ', name: 'Block', market: 'US' as const, basePrice: 65 }` 替換為 `{ symbol: 'PYPL', name: 'PayPal', market: 'US' as const, basePrice: 65 }`。
2. 同步更新 `src/engine/muscleBookerEngine.test.ts` 與 `src/components/MuscleBookerWorkspace.test.ts` 中對美股焦點池長度與成分股的驗證。
