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

  it('不變量 3: 主力戰情室前端元件不得裸寫 colorTheme === international 漲跌色票三元式', () => {
    const tsxFiles = collectFiles(path.join(ROOT, 'src/components/aiForceDashboard'), '.tsx');
    const offenders: string[] = [];

    for (const file of tsxFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (
        /colorTheme\s*===\s*['"]international['"]\s*\?\s*['"]#(10b981|ef4444)['"]\s*:\s*['"]#(10b981|ef4444)['"]/.test(
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
});
