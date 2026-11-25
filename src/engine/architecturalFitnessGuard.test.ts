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

  it('不變量 3 (Spec 0247 T10 強化): 主力戰情室前端元件不得裸寫漲跌極性三元色票 (含亮紅/亮綠變體，須統一引用 resolveDirectionalPalette)', () => {
    const tsxFiles = collectFiles(path.join(ROOT, 'src/components/aiForceDashboard'), '.tsx');
    const offenders: string[] = [];

    for (const file of tsxFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (
        /(?:colorTheme\s*===\s*['"]international['"]|\bisTaiwan\b|\bisInternational\b)\s*\?\s*['"]#(10b981|ef4444|f87171|34d399)['"]\s*:\s*['"]#(10b981|ef4444|f87171|34d399|38bdf8)['"]/.test(
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

  it('不變量 7 (Spec 0246 T09 / Spec 0247 T09 強化): 全前端原始碼(含引擎/掛鉤/元件)不得讀取靜態 /market-cache/*.json，public/market-cache 無殘檔且 nas-server 禁對 .json 回傳 immutable', () => {
    const allSrcFiles = [
      ...collectFiles(path.join(ROOT, 'src'), '.ts'),
      ...collectFiles(path.join(ROOT, 'src'), '.tsx'),
    ].filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'));
    const offenders: string[] = [];

    for (const file of allSrcFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const isUiFile = file.endsWith('.tsx');
      if (
        /\/market-cache\/[a-z0-9_.-]+\.json/i.test(content) ||
        (isUiFile && (/\bloadMarketCacheSummary\b/.test(content) || /\bsyncMarketCacheToIndexedDB\b/.test(content)))
      ) {
        offenders.push(path.relative(ROOT, file));
      }
    }
    expect(offenders).toEqual([]);

    const retiredStaticMarketCaches = new Set([
      'tw_market_ohlcv_compact.json',
      'tw_market_summary.json',
      'us_market_summary.json',
    ]);
    const publicCacheDir = path.join(ROOT, 'public/market-cache');
    const remainingStaticJson = fs.existsSync(publicCacheDir)
      ? fs.readdirSync(publicCacheDir).filter((f: string) => retiredStaticMarketCaches.has(f))
      : [];
    expect(remainingStaticJson).toEqual([]);

    const nasServerSrc = fs.readFileSync(path.join(ROOT, 'scripts/nas-server.cjs'), 'utf8');
    expect(nasServerSrc).toMatch(/ext\s*===\s*['"]\.json['"]\s*\?\s*['"]no-cache['"]/);

    const syncUsSrc = fs.readFileSync(path.join(ROOT, 'scripts/market-sync/sync-us-market.cjs'), 'utf8');
    expect(syncUsSrc).not.toContain('readFileSync(summaryPath');
    expect(syncUsSrc).not.toMatch(/detectLocalUsHoldingsAndWatchlist[\s\S]{0,400}us_market_summary\.json/);
  });

  it('不變量 8 (Spec 0247 T01–T08): SSRF 統一守衛必接入 probe-key 與 nas-server，且鎖內 8 條後端採集管線全面使用 fetchWithTimeout', () => {
    const middlewareSrc = fs.readFileSync(path.join(ROOT, 'scripts/market-sync/vite-market-middleware.cjs'), 'utf8');
    const nasServerSrc = fs.readFileSync(path.join(ROOT, 'scripts/nas-server.cjs'), 'utf8');
    expect(middlewareSrc).toContain("require('./ssrf-origin-guard.cjs')");
    expect(middlewareSrc).toContain('validateOutboundTargetUrl');
    expect(nasServerSrc).toContain("require('./market-sync/ssrf-origin-guard.cjs')");
    expect(nasServerSrc).toContain('validateOutboundTargetUrl');

    const lockScopedIngestionFiles = [
      'scripts/market-sync/ingest-tw-tdcc.cjs',
      'scripts/market-sync/ingest-tw-monthly-revenue.cjs',
      'scripts/market-sync/ingest-tw-corporate-actions.cjs',
      'scripts/market-sync/ingest-macro-sentiment.cjs',
      'scripts/market-sync/ingest-tw-pledge.cjs',
      'scripts/market-sync/tag-tw-stock-status.cjs',
      'scripts/market-sync/us-fundamentals-ingestion.cjs',
      'scripts/market-sync/sec-edgar-proxy.cjs',
    ];
    for (const relPath of lockScopedIngestionFiles) {
      const src = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
      expect(src, `${relPath} 必須使用 fetchWithTimeout 防止鎖內死鎖`).toContain('fetchWithTimeout');
    }

    const usFundSrc = fs.readFileSync(path.join(ROOT, 'scripts/market-sync/us-fundamentals-ingestion.cjs'), 'utf8');
    expect(usFundSrc).toContain('options.fetchImpl || options.fetchFn');
  });

  it('不變量 9 (Spec 0247 T09/T12/T13): 雙 Dockerfile 必對齊休市日曆、禁止 dangerouslyIgnoreUnhandledErrors 且 CI 必覆蓋後端測試與文檔守門', () => {
    const rootDockerfile = fs.readFileSync(path.join(ROOT, 'Dockerfile'), 'utf8');
    const mirrorDockerfile = fs.readFileSync(path.join(ROOT, 'docs/deployment/docker/Dockerfile'), 'utf8');
    expect(rootDockerfile).toContain('market-holidays.json');
    expect(mirrorDockerfile).toContain('market-holidays.json');

    const viteConfigSrc = fs.readFileSync(path.join(ROOT, 'vite.config.ts'), 'utf8');
    expect(viteConfigSrc).not.toContain('dangerouslyIgnoreUnhandledErrors: true');

    const ciWorkflowSrc = fs.readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8');
    expect(ciWorkflowSrc).toContain('npm run test:backend');
    expect(ciWorkflowSrc).toContain('npm run build');
    expect(ciWorkflowSrc).toContain('npm run lint:docs');

    const prePushSrc = fs.readFileSync(path.join(ROOT, 'scripts/pre-push-guard.cjs'), 'utf8');
    expect(prePushSrc).toContain('npm run test:backend');
  });

  it('不變量 10 (Spec 0247 T04/T05): 雙軌脫敏必涵蓋歷史快照金鑰，且前端儲存層不得殘留硬編碼個人交易校正邏輯', () => {
    const dbSrc = fs.readFileSync(path.join(ROOT, 'src/utils/db.ts'), 'utf8');
    expect(dbSrc).toContain('redactSnapshotsForExport');
    expect(dbSrc).toMatch(/snapshots\s*=\s*redactSnapshotsForExport\(snapshots\)/);

    const sanitizerSrc = fs.readFileSync(path.join(ROOT, 'src/engine/csvSanitizer.ts'), 'utf8');
    expect(sanitizerSrc).toContain('scrubSnapshotsApiKeysInPlace');

    const storageSrc = fs.readFileSync(path.join(ROOT, 'src/utils/storage.ts'), 'utf8');
    expect(storageSrc).not.toContain('autoReconcileSchwabRecords');
  });
});
