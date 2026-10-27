import { describe, it, expect } from 'vitest';

declare const require: (id: string) => any;
declare const process: any;

describe('Pre-push Guard 整合驗證 (Spec 0205 / Ticket 01)', () => {
  it('pre-push-guard.cjs 應包含 verify-docs.cjs 文檔守門步驟', () => {
    const fs = require('fs');
    const path = require('path');
    const guardPath = path.resolve(process.cwd(), 'scripts/pre-push-guard.cjs');
    const content = fs.readFileSync(guardPath, 'utf-8');
    expect(content).toContain('verify-docs.cjs');
    expect(content).toContain('lint:docs');
    expect(content).toContain('[3/4] 執行文檔完整性與死鏈守門驗證');
  });
});
