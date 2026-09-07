const fs = require('fs');
const path = require('path');

const taiexCsvPath = 'D:\\APP\\諮詢\\私人\\股市\\台股加權指數_歷史數據\\TAIEX_history_all.csv';
const tw0050CsvPath = 'D:\\APP\\諮詢\\私人\\股市\\台股加權指數_歷史數據\\上市櫃股票與債券_歷史數據\\全市場股票與債券歷史數據庫\\0050_元大台灣50_全歷史數據.csv';

function parseCsvPrices(filePath, dateColIdx = 0, closeColIdx = 4, startYear = 2020) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const result = {};
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length <= Math.max(dateColIdx, closeColIdx)) continue;
    
    const date = parts[dateColIdx].trim();
    const close = parseFloat(parts[closeColIdx]);
    
    if (date && !isNaN(close) && close > 0) {
      const year = parseInt(date.substring(0, 4), 10);
      if (year >= startYear) {
        result[date] = Math.round(close * 100) / 100;
      }
    }
  }
  return result;
}

const taiexPrices = parseCsvPrices(taiexCsvPath, 0, 4, 2020);
const tw0050Prices = parseCsvPrices(tw0050CsvPath, 0, 4, 2020);

console.log(`Extracted TAIEX: ${Object.keys(taiexPrices).length} days (Latest: ${Object.keys(taiexPrices).sort().pop()} -> ${taiexPrices[Object.keys(taiexPrices).sort().pop()]})`);
console.log(`Extracted 0050: ${Object.keys(tw0050Prices).length} days (Latest: ${Object.keys(tw0050Prices).sort().pop()} -> ${tw0050Prices[Object.keys(tw0050Prices).sort().pop()]})`);

fs.writeFileSync(
  path.join(__dirname, 'extracted_benchmarks.json'),
  JSON.stringify({ taiex: taiexPrices, tw0050: tw0050Prices }, null, 2),
  'utf-8'
);
