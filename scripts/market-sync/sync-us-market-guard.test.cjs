const assert = require('assert');
const {
  runUsMarketSync,
  getUsMarketDate,
} = require('./sync-us-market.cjs');

console.log('[Test] Ticket 10: 美股每日排程休市守衛測試 (sync-us-market-guard)...');

// 1. 驗證 getUsMarketDate 在台北早晨 08:00 時能精準對應至美東前一日
// 台北時間 2026-01-20 08:00:00 = 2026-01-20T00:00:00.000Z
const simulatedTaipeiMorning = new Date('2026-01-20T00:00:00.000Z');
const usDate = getUsMarketDate(simulatedTaipeiMorning);
assert.strictEqual(usDate, '2026-01-19', '台北週二上午 8 點對應美東應為週一 2026-01-19');

async function testGuard() {
  // 2. 模擬 2026-01-19 (馬丁路德金紀念日) 美股休市
  const result = await runUsMarketSync({
    currentDate: simulatedTaipeiMorning,
    mode: 'daily',
  });

  assert.strictEqual(result.skipped, true, '休市日應標記為 skipped');
  assert.strictEqual(result.total, 0, '休市日不應採集任何標的');
  assert.ok(result.reason.includes('馬丁路德金紀念日'), '日誌原因應包含馬丁路德金紀念日');

  console.log('✔ Ticket 10 守衛邏輯測試通過！');
}

testGuard().catch((err) => {
  console.error('❌ Ticket 10 測試失敗:', err);
  process.exit(1);
});
