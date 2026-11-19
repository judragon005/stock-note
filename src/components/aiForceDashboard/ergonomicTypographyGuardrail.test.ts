import { describe, it, expect } from 'vitest';

declare const require: any;
declare const __dirname: string;
const fs = require('node:fs');
const path = require('node:path');

function collectTsxFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsxFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) {
      results.push(full);
    }
  }
  return results;
}

describe('Spec 0238 Ticket 12: 主力戰情室零微字人體工學、SVG 等比與 WCAG AA 對比度守門員', () => {
  const rootDir = path.resolve(__dirname);
  const tsxFiles = collectTsxFiles(rootDir);

  it('1. 全戰情室所有非測試 .tsx 元件不得包含任何 < 12px (< 0.75rem) 之微字級或 scale(0.9) 縮小樣式', () => {
    const microFontRegex = /fontSize\s*[:=]\s*['"`]?(?:0\.[0-6]\d*rem|0\.7[0-4]\d*rem|[1-9](?:\.\d+)?px|1[01](?:\.\d+)?px|[1-9](?:\.\d+)?(?=['"`\s>])|1[01](?:\.\d+)?(?=['"`\s>]))|scale\(0\.[0-8]\d*\)|scale\(0\.9\)/;
    const violations: string[] = [];

    for (const file of tsxFiles) {
      const rel = path.relative(rootDir, file);
      const lines: string[] = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line: string, idx: number) => {
        if (microFontRegex.test(line)) {
          violations.push(`${rel}:${idx + 1}: ${line.trim()}`);
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it('2. 全戰情室所有非測試 .tsx 元件不得包含低對比度暗灰字色 #64748b', () => {
    const violations: string[] = [];
    for (const file of tsxFiles) {
      const rel = path.relative(rootDir, file);
      const lines: string[] = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line: string, idx: number) => {
        if (/#64748b/i.test(line)) {
          violations.push(`${rel}:${idx + 1}: ${line.trim()}`);
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it('3. 含 <text> 元素之 SVG 圖表不得使用 preserveAspectRatio="none" 造成字體拉伸變形', () => {
    const violations: string[] = [];
    for (const file of tsxFiles) {
      const rel = path.relative(rootDir, file);
      const content: string = fs.readFileSync(file, 'utf8');
      const svgBlocks: string[] = content.match(/<svg[\s\S]*?<\/svg>/g) || [];
      svgBlocks.forEach((block: string) => {
        if (block.includes('preserveAspectRatio="none"') && /<text[\s>]/.test(block)) {
          violations.push(`${rel}: SVG containing <text> uses preserveAspectRatio="none"`);
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it('4. AiForceDashboardView Layer 6 應採用雙欄大視野矩陣 minmax(440px, 1fr)', () => {
    const viewSource: string = fs.readFileSync(path.join(rootDir, 'AiForceDashboardView.tsx'), 'utf8');
    expect(viewSource).toContain('data-layer="6-energy-sentiment"');
    expect(viewSource).not.toContain('minmax(260px, 1fr)');
    expect(viewSource).toContain('minmax(440px, 1fr)');
  });
});
