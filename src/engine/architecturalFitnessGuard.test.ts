import { describe, it, expect } from 'vitest';

declare const require: (id: string) => any;
declare const process: { cwd: () => string };

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function collectFiles(dir: string, ext: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, ext));
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

describe('Spec 0240 T11: Architectural Fitness Guard (防技術債復發靜態守門)', () => {
  it('不變量 1: 湖倉 7 維健康度門檻必須統一引用 sync-thresholds.cjs，不得於回補與新鮮度服務重複硬編碼', () => {
    const backfillSrc = fs.readFileSync(
      path.join(ROOT, 'scripts/market-sync/backfill-tw-history-web.cjs'),
      'utf8'
    );
    const freshnessSrc = fs.readFileSync(
      path.join(ROOT, 'scripts/market-sync/market-freshness-service.cjs'),
      'utf8'
    );

    expect(backfillSrc).toContain("require('./sync-thresholds.cjs')");
    expect(freshnessSrc).toContain("require('./sync-thresholds.cjs')");
    expect(backfillSrc).not.toMatch(/stockCount\s*>=\s*1800\s*&&\s*chipCount\s*>=\s*2000/);
    expect(freshnessSrc).not.toMatch(/marginCount\s*<\s*1500/);
    expect(freshnessSrc).not.toMatch(/sblCount\s*<\s*500/);
  });

  it('不變量 2: corporate_action_calendar 建表 DDL 全專案僅允許出現 1 次且歸屬 sqlite-db-core.cjs', () => {
    const cjsFiles = collectFiles(path.join(ROOT, 'scripts/market-sync'), '.cjs');
    const ddlOwners: string[] = [];

    for (const file of cjsFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const matches = content.match(/CREATE TABLE IF NOT EXISTS corporate_action_calendar/g);
      if (matches && matches.length > 0) {
        for (let i = 0; i < matches.length; i++) {
          ddlOwners.push(path.basename(file));
        }
      }
    }

    expect(ddlOwners).toEqual(['sqlite-db-core.cjs']);
  });

  it('不變量 3: 主力戰情室前端元件不得裸寫漲跌極性三元色票 (須統一引用 resolveDirectionalPalette)', () => {
    const tsxFiles = collectFiles(path.join(ROOT, 'src/components/aiForceDashboard'), '.tsx');
    const offenders: string[] = [];

    for (const file of tsxFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (
        /(?:colorTheme\s*===\s*['"]international['"]|\bisTaiwan\b|\bisInternational\b)\s*\?\s*['"]#(10b981|ef4444)['"]\s*:\s*['"]#(10b981|ef4444)['"]/.test(
          content
        )
      ) {
        offenders.push(path.relative(ROOT, file));
      }
    }

    expect(offenders).toEqual([]);
  });

  it('不變量 4: 智策提示詞轉接器 (aiForcePromptAdapter.ts) 不得包含 as unknown as 雙重型別斷言', () => {
    const adapterSrc = fs.readFileSync(
      path.join(ROOT, 'src/engine/aiForcePromptAdapter.ts'),
      'utf8'
    );
    expect(adapterSrc).not.toContain('as unknown as');
  });

  it('不變量 5 (Spec 0241 T09): DynamicSignalsCard 與 AnalysisMetricView 主檔行數不得回脹，且 etf_meta DDL 僅歸屬 sqlite-db-core.cjs', () => {
    const dynamicLines = fs
      .readFileSync(path.join(ROOT, 'src/components/aiForceDashboard/cards/DynamicSignalsCard.tsx'), 'utf8')
      .split(/\r?\n/).length;
    const analysisLines = fs
      .readFileSync(path.join(ROOT, 'src/components/analysis/AnalysisMetricView.tsx'), 'utf8')
      .split(/\r?\n/).length;

    expect(dynamicLines).toBeLessThanOrEqual(160);
    expect(analysisLines).toBeLessThanOrEqual(220);

    const cjsFiles = collectFiles(path.join(ROOT, 'scripts/market-sync'), '.cjs');
    const etfMetaOwners: string[] = [];
    for (const file of cjsFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const matches = content.match(/CREATE TABLE IF NOT EXISTS etf_meta/g);
      if (matches) {
        for (let i = 0; i < matches.length; i++) {
          etfMetaOwners.push(path.basename(file));
        }
      }
    }
    expect(etfMetaOwners).toEqual(['sqlite-db-core.cjs']);
  });

  it('不變量 6 (Spec 0245 T02): 全前端元件不得使用未定義之幽靈遮罩類別 modal-backdrop（須統一使用 ModalShell / .modal-overlay）', () => {
    const tsxFiles = collectFiles(path.join(ROOT, 'src'), '.tsx').filter(
      (f) => !f.endsWith('.test.tsx')
    );
    const offenders: string[] = [];

    for (const file of tsxFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (/className\s*=\s*["'`][^"'`]*\bmodal-backdrop\b/.test(content)) {
        offenders.push(path.relative(ROOT, file));
      }
    }

    expect(offenders).toEqual([]);
  });

  it('不變量 7 (Spec 0246 T09): 前端入口與元件不得讀取靜態 /market-cache/*.json 或呼叫 syncMarketCacheToIndexedDB，且 nas-server 不得對 .json 回傳 immutable', () => {
    const uiFiles = [
      path.join(ROOT, 'src/App.tsx'),
      ...collectFiles(path.join(ROOT, 'src/components'), '.tsx').filter((f) => !f.endsWith('.test.tsx')),
    ];
    const offenders: string[] = [];

    for (const file of uiFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (
        /\bloadMarketCacheSummary\b/.test(content) ||
        /\bsyncMarketCacheToIndexedDB\b/.test(content) ||
        /\/market-cache\/[a-z0-9_.-]+\.json/i.test(content)
      ) {
        offenders.push(path.relative(ROOT, file));
      }
    }
    expect(offenders).toEqual([]);

    const nasServerSrc = fs.readFileSync(path.join(ROOT, 'scripts/nas-server.cjs'), 'utf8');
    expect(nasServerSrc).toMatch(/ext\s*===\s*['"]\.json['"]\s*\?\s*['"]no-cache['"]/);

    const syncUsSrc = fs.readFileSync(path.join(ROOT, 'scripts/market-sync/sync-us-market.cjs'), 'utf8');
    expect(syncUsSrc).not.toContain('readFileSync(summaryPath');
    expect(syncUsSrc).not.toMatch(/detectLocalUsHoldingsAndWatchlist[\s\S]{0,400}us_market_summary\.json/);
  });
});
