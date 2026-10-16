const assert = require('assert');
const { isTradingDay, getHolidayReason } = require('./trading-calendar-engine.cjs');

console.log('[Test] Ticket 09: 台股每日排程守衛測試 (sync-tw-market-guard)...');

// 1. 2026-09-28 (教師節) 必須判定為休市並給出原因
const date1 = '2026-09-28';
assert.strictEqual(isTradingDay(date1, 'TW'), false);
assert.strictEqual(getHolidayReason(date1, 'TW'), '教師節');

// 2. 2026-07-10 (巴威颱風) 必須判定為休市
const date2 = '2026-07-10';
assert.strictEqual(isTradingDay(date2, 'TW'), false);
assert.strictEqual(getHolidayReason(date2, 'TW'), '巴威颱風停市');

// 3. 正常交易日 (2026-10-07) 必須為 true
const date3 = '2026-10-07';
assert.strictEqual(isTradingDay(date3, 'TW'), true);
assert.strictEqual(getHolidayReason(date3, 'TW'), null);

console.log('✔ Ticket 09 守衛邏輯驗證 100% 通過！');
