/**
 * Node.js 執行環境專用市場同步共用核心
 * (CommonJS 規範，支援排程腳本無依賴執行)
 */

const fs = require('fs');
const path = require('path');

function formatDateYMD(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseCleanNumber(val) {
  if (val === null || val === undefined) return 0;
  const str = String(val).replace(/,/g, '').trim();
  if (str === '--' || str === '' || str === '---') return 0;
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function parseTwseT86BulkData(rawData) {
  const result = {};
  if (!rawData || (rawData.stat !== 'OK' && rawData.stat !== 'ok') || !Array.isArray(rawData.data)) {
    return result;
  }

  for (const row of rawData.data) {
    if (!Array.isArray(row) || row.length < 12) continue;
    const symbol = String(row[0]).trim();
    const name = String(row[1]).trim();
    const foreignNetShares = Math.round(parseCleanNumber(row[4]) / 1000);
    const trustNetShares = Math.round(parseCleanNumber(row[10]) / 1000);
    const dealerNetShares = Math.round(parseCleanNumber(row[11]) / 1000);
    const totalNetShares = foreignNetShares + trustNetShares + dealerNetShares;

    result[symbol] = {
      symbol,
      name,
      foreignNetShares,
      trustNetShares,
      dealerNetShares,
      totalNetShares,
    };
  }
  return result;
}

function parseTpexT86BulkData(rawData) {
  const result = {};
  if (!rawData) return result;
  const tables = Array.isArray(rawData.tables) ? rawData.tables : [rawData];

  for (const table of tables) {
    const dataRows = Array.isArray(table?.data) ? table.data : Array.isArray(table?.aaData) ? table.aaData : null;
    if (!dataRows) continue;

    for (const row of dataRows) {
      if (!Array.isArray(row) || row.length < 9) continue;
      const symbol = String(row[0]).trim();
      const name = String(row[1]).trim();
      let foreignNetShares = 0;
      let trustNetShares = 0;
      let dealerNetShares = 0;
      let totalNetShares = 0;

      if (row.length >= 24) {
        // 官方標準 24 欄格式
        // 外資及陸資買賣超：row[10]
        foreignNetShares = Math.round(parseCleanNumber(row[10]) / 1000);
        // 投信買賣超：row[13]
        trustNetShares = Math.round(parseCleanNumber(row[13]) / 1000);
        // 自營商買賣超：row[22]
        dealerNetShares = Math.round(parseCleanNumber(row[22]) / 1000);
        // 三大法人合計買賣超：row[23]
        totalNetShares = row[23] !== undefined ? Math.round(parseCleanNumber(row[23]) / 1000) : (foreignNetShares + trustNetShares + dealerNetShares);
      } else {
        // 簡化或舊版相容格式
        foreignNetShares = Math.round(parseCleanNumber(row[4]) / 1000);
        trustNetShares = Math.round(parseCleanNumber(row[7]) / 1000);
        dealerNetShares = Math.round(parseCleanNumber(row[8]) / 1000);
        totalNetShares = foreignNetShares + trustNetShares + dealerNetShares;
      }

      result[symbol] = {
        symbol,
        name,
        foreignNetShares,
        trustNetShares,
        dealerNetShares,
        totalNetShares,
      };
    }
  }
  return result;
}

function parseTwseDailyQuotesBulk(rawData, dateStr) {
  const result = {};
  if (!rawData || !Array.isArray(rawData.tables)) return result;

  for (const table of rawData.tables) {
    if (!Array.isArray(table.data)) continue;
    for (const row of table.data) {
      if (!Array.isArray(row) || row.length < 9) continue;
      const symbol = String(row[0]).trim();
      if (symbol.length > 6) continue;

      const volume = parseCleanNumber(row[2]);
      const open = parseCleanNumber(row[5]);
      const high = parseCleanNumber(row[6]);
      const low = parseCleanNumber(row[7]);
      const close = parseCleanNumber(row[8]);

      if (close > 0) {
        result[symbol] = {
          date: dateStr,
          open: open > 0 ? open : close,
          high: high > 0 ? high : close,
          low: low > 0 ? low : close,
          close,
          volume,
        };
      }
    }
  }
  return result;
}

function parseTpexDailyQuotesBulk(rawData, dateStr) {
  const result = {};
  if (!rawData) return result;
  const tables = Array.isArray(rawData.tables) ? rawData.tables : [rawData];

  for (const table of tables) {
    const dataRows = Array.isArray(table?.data) ? table.data : Array.isArray(table?.aaData) ? table.aaData : null;
    if (!dataRows) continue;

    for (const row of dataRows) {
      if (!Array.isArray(row) || row.length < 7) continue;
      const symbol = String(row[0]).trim();
      if (symbol.length > 6) continue;

      const close = parseCleanNumber(row[2]);
      const open = parseCleanNumber(row[4]);
      const high = parseCleanNumber(row[5]);
      const low = parseCleanNumber(row[6]);
      const volume = parseCleanNumber(row[7]);

      if (close > 0) {
        result[symbol] = {
          date: dateStr,
          open: open > 0 ? open : close,
          high: high > 0 ? high : close,
          low: low > 0 ? low : close,
          close,
          volume,
        };
      }
    }
  }
  return result;
}

function computeIncrementalIndicators(candles) {
  if (!candles || candles.length === 0) return [];
  const points = [];

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    
    // MA5
    let ma5 = c.close;
    if (i >= 4) {
      let sum = 0;
      for (let j = i - 4; j <= i; j++) sum += candles[j].close;
      ma5 = sum / 5;
    }

    // MA20
    let ma20 = c.close;
    if (i >= 19) {
      let sum = 0;
      for (let j = i - 19; j <= i; j++) sum += candles[j].close;
      ma20 = sum / 20;
    }

    // MA60
    let ma60 = c.close;
    if (i >= 59) {
      let sum = 0;
      for (let j = i - 59; j <= i; j++) sum += candles[j].close;
      ma60 = sum / 60;
    }

    // Darvas 箱體 (過去 20 日最高/最低)
    const windowStart = Math.max(0, i - 19);
    let darvasHigh = c.high;
    let darvasLow = c.low;
    for (let w = windowStart; w <= i; w++) {
      if (candles[w].high > darvasHigh) darvasHigh = candles[w].high;
      if (candles[w].low < darvasLow) darvasLow = candles[w].low;
    }

    points.push({
      date: c.date,
      close: c.close,
      volume: c.volume,
      ma5,
      ma20,
      ma60,
      darvasHigh,
      darvasLow,
      darvasState: c.close >= darvasHigh ? 'UPPER_BREAKOUT' : c.close <= darvasLow ? 'LOWER_BREAKOUT' : 'IN_BOX',
      biasMa20: ma20 > 0 ? ((c.close - ma20) / ma20) * 100 : 0,
    });
  }
  return points;
}

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function saveJsonAtomic(targetPath, data) {
  const dir = path.dirname(targetPath);
  ensureDirSync(dir);
  const tempPath = `${targetPath}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, targetPath);
}

module.exports = {
  formatDateYMD,
  parseCleanNumber,
  parseTwseT86BulkData,
  parseTpexT86BulkData,
  parseTwseDailyQuotesBulk,
  parseTpexDailyQuotesBulk,
  computeIncrementalIndicators,
  ensureDirSync,
  saveJsonAtomic,
};
