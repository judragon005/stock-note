/**
 * on-demand-backfill-orchestrator.cjs
 * 單一標的按需補齊與 AbortController 逾時調度子模組 (Spec 0240 T04 & T06)
 * 自 vite-market-middleware.cjs 抽離，專責：
 * 1. 按需拉取台股歷史除權息、TDCC、月營收與美股基本面
 * 2. 失敗短冷卻 / 成功長冷卻與防重入鎖 (In-Flight Guard)
 * 3. 原生 AbortController 逾時中斷控制，避免放棄的 HTTP 請求洩漏連線
 */

const { initSqliteLakehouseDb } = require('./sqlite-db-core.cjs');
const { getOrFetchUsFundamentals } = require('./us-fundamentals-ingestion.cjs');

const ON_DEMAND_COOLDOWN_MS = 5 * 60 * 1000;
const ON_DEMAND_FAILURE_COOLDOWN_MS = 15 * 1000;
const ON_DEMAND_TIMEOUT_MS = 300;

const onDemandBackfillInFlight = new Set();
const onDemandBackfillCooldown = new Map();

function isOnDemandBackfillInFlight(symbol) {
  return onDemandBackfillInFlight.has(symbol);
}

function clearOnDemandBackfillState() {
  onDemandBackfillInFlight.clear();
  onDemandBackfillCooldown.clear();
}

/**
 * 具備原生 AbortController 主動取消機制的逾時競速封裝 (Spec 0240 T04)
 * 逾時觸發時立即呼叫 controller.abort()，通知底層 fetch 與子任務中止 I/O。
 *
 * @template T
 * @param {(signal: AbortSignal) => Promise<T>} taskFn
 * @param {number} [timeoutMs=ON_DEMAND_TIMEOUT_MS]
 * @returns {Promise<{ timedOut: boolean; result?: T }>}
 */
async function runWithAbortTimeout(taskFn, timeoutMs = ON_DEMAND_TIMEOUT_MS) {
  const controller = new AbortController();
  let timer = null;
  let settled = false;

  const taskPromise = Promise.resolve()
    .then(() => taskFn(controller.signal))
    .then((result) => {
      settled = true;
      return { timedOut: false, result };
    })
    .catch((err) => {
      settled = true;
      if (err && err.name === 'AbortError') {
        return { timedOut: true };
      }
      return { timedOut: false, result: undefined };
    });

  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => {
      if (!settled) {
        controller.abort();
      }
      resolve({ timedOut: true });
    }, timeoutMs);
  });

  try {
    return await Promise.race([taskPromise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * 按需拉取台股歷史除權息紀錄 (FinMind TaiwanStockDividend -> fallback Yahoo Chart events)
 */
async function backfillSymbolDividendsFromRemote(
  symbol,
  customDbPath,
  fetcher = globalThis.fetch,
  signal = undefined
) {
  if (!symbol || typeof fetcher !== 'function') return 0;
  if (signal?.aborted) return 0;

  const cleanSymbol = String(symbol).trim().toUpperCase();
  const querySym = cleanSymbol.endsWith('O') ? cleanSymbol.slice(0, -1) : cleanSymbol;
  const startDate = new Date(Date.now() - 5 * 365 * 86400000).toISOString().slice(0, 10);

  const actions = [];
  try {
    const fmUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockDividend&data_id=${encodeURIComponent(querySym)}&start_date=${startDate}`;
    const res = await fetcher(fmUrl, {
      headers: { Accept: 'application/json', 'User-Agent': 'StockTracker/1.0 (local-sync)' },
      ...(signal ? { signal } : {}),
    });
    if (res && res.ok) {
      const json = await res.json();
      const rows = Array.isArray(json?.data) ? json.data : [];
      for (const r of rows) {
        const exDate = r.CashExDividendTradingDate || r.StockExDividendTradingDate;
        if (!exDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(exDate).slice(0, 10))) continue;
        const cashDiv = Number(r.CashEarningsDistribution || 0) + Number(r.CashStatutorySurplus || 0);
        const stockDiv = Number(r.StockEarningsDistribution || 0) + Number(r.StockStatutorySurplus || 0);
        actions.push({
          symbol: cleanSymbol,
          market: 'TW',
          action_type: 'DIVIDEND',
          ex_date: String(exDate).slice(0, 10),
          payment_date: r.CashDividendPaymentDate ? String(r.CashDividendPaymentDate).slice(0, 10) : null,
          cash_dividend_per_share: Number.isFinite(cashDiv) ? Number(cashDiv.toFixed(4)) : 0,
          stock_dividend_ratio: Number.isFinite(stockDiv) ? Number(stockDiv.toFixed(4)) : 0,
        });
      }
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return 0;
  }

  if (actions.length === 0 && !signal?.aborted) {
    // 支援上市 (.TW) 與上櫃 (.TWO) 雙試探 (Spec 0239 T03)
    for (const suffix of ['.TW', '.TWO']) {
      if (signal?.aborted) break;
      try {
        const yhUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(querySym)}${suffix}?range=5y&interval=1d&events=div%2Csplit`;
        const res = await fetcher(yhUrl, {
          headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
          ...(signal ? { signal } : {}),
        });
        if (res && res.ok) {
          const json = await res.json();
          const divs = json?.chart?.result?.[0]?.events?.dividends || {};
          for (const item of Object.values(divs)) {
            if (!item || !item.date) continue;
            const exDate = new Date(item.date * 1000).toISOString().slice(0, 10);
            const cashDiv = Number(item.amount) || 0;
            if (cashDiv > 0) {
              actions.push({
                symbol: cleanSymbol,
                market: 'TW',
                action_type: 'DIVIDEND',
                ex_date: exDate,
                payment_date: null,
                cash_dividend_per_share: Number(cashDiv.toFixed(4)),
                stock_dividend_ratio: 0,
              });
            }
          }
        }
        if (actions.length > 0) break;
      } catch (err) {
        if (err && err.name === 'AbortError') break;
      }
    }
  }

  if (actions.length === 0) return 0;

  try {
    const db = initSqliteLakehouseDb(customDbPath);
    const stmt = db.prepare(`
      INSERT INTO corporate_action_calendar (
        symbol, market, action_type, ex_date, payment_date, cash_dividend_per_share, stock_dividend_ratio, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(symbol, action_type, ex_date) DO UPDATE SET
        payment_date = COALESCE(excluded.payment_date, corporate_action_calendar.payment_date),
        cash_dividend_per_share = COALESCE(excluded.cash_dividend_per_share, corporate_action_calendar.cash_dividend_per_share),
        stock_dividend_ratio = COALESCE(excluded.stock_dividend_ratio, corporate_action_calendar.stock_dividend_ratio),
        updated_at = excluded.updated_at
    `);
    const now = Date.now();
    db.exec('BEGIN TRANSACTION;');
    try {
      for (const a of actions) {
        stmt.run(a.symbol, a.market, a.action_type, a.ex_date, a.payment_date, a.cash_dividend_per_share, a.stock_dividend_ratio, now);
      }
      db.exec('COMMIT;');
    } catch (e) {
      db.exec('ROLLBACK;');
      throw e;
    }
    return actions.length;
  } catch {
    return 0;
  }
}

/**
 * 觸發單一標的 TDCC / 月營收 / 歷史除權息 / 美股基本面按需補齊 (Spec 0239 T05 & Spec 0240 T04/T06)
 * - 成功入庫採 5 分鐘冷卻；全失敗或無新增僅採 15 秒短退避，絕不鎖死 5 分鐘。
 */
async function runOnDemandSymbolBackfill(
  symbol,
  { needTdcc, needRevenue, needDividend, needUsFundamentals, customDbPath, signal }
) {
  const now = Date.now();
  const prevState = onDemandBackfillCooldown.get(symbol);
  const lastAt = typeof prevState === 'number' ? prevState : prevState?.at || 0;
  const cooldownMs =
    typeof prevState === 'object' && prevState?.succeeded === false
      ? ON_DEMAND_FAILURE_COOLDOWN_MS
      : ON_DEMAND_COOLDOWN_MS;
  if (onDemandBackfillInFlight.has(symbol) || now - lastAt < cooldownMs) {
    return { skipped: true, succeeded: false };
  }

  onDemandBackfillInFlight.add(symbol);

  let anyFulfilledWithData = false;
  try {
    const tasks = [];
    if (needTdcc && !signal?.aborted) {
      const { backfillSymbolTdccHistory } = require('./ingest-tw-tdcc.cjs');
      tasks.push(backfillSymbolTdccHistory(symbol, 10, customDbPath));
    }
    if (needRevenue && !signal?.aborted) {
      const { backfillSymbolMonthlyRevenue } = require('./ingest-tw-monthly-revenue.cjs');
      tasks.push(backfillSymbolMonthlyRevenue(symbol, 12, customDbPath));
    }
    if (needDividend && !signal?.aborted) {
      tasks.push(backfillSymbolDividendsFromRemote(symbol, customDbPath, globalThis.fetch, signal));
    }
    if (needUsFundamentals && !signal?.aborted) {
      const db = initSqliteLakehouseDb(customDbPath);
      tasks.push(getOrFetchUsFundamentals(db, symbol, { includeDividends: true }));
    }
    const results = await Promise.allSettled(tasks);
    anyFulfilledWithData = results.some(
      (r) => r.status === 'fulfilled' && r.value !== null && r.value !== 0 && r.value !== false
    );
    onDemandBackfillCooldown.set(symbol, { at: Date.now(), succeeded: anyFulfilledWithData });
    return { skipped: false, succeeded: anyFulfilledWithData };
  } catch {
    onDemandBackfillCooldown.set(symbol, { at: Date.now(), succeeded: false });
    return { skipped: false, succeeded: false };
  } finally {
    onDemandBackfillInFlight.delete(symbol);
  }
}

module.exports = {
  ON_DEMAND_COOLDOWN_MS,
  ON_DEMAND_FAILURE_COOLDOWN_MS,
  ON_DEMAND_TIMEOUT_MS,
  isOnDemandBackfillInFlight,
  clearOnDemandBackfillState,
  runWithAbortTimeout,
  backfillSymbolDividendsFromRemote,
  runOnDemandSymbolBackfill,
};
