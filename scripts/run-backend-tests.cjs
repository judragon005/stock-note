#!/usr/bin/env node
/**
 * scripts/run-backend-tests.cjs
 * 後端市場同步測試套件統一執行器 (Spec 0247 T11)
 *
 * 自動探索並於獨立行程依序執行 scripts/market-sync/ 下全部 *.test.cjs，
 * 消滅孤兒測試並確保 CI 與本地 Pre-push Guard 100% 覆蓋後端核心模組。
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const TARGET_DIR = path.resolve(__dirname, 'market-sync');

function discoverBackendTests(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...discoverBackendTests(full));
    } else if (entry.isFile() && entry.name.endsWith('.test.cjs')) {
      results.push(full);
    }
  }
  return results.sort();
}

function run() {
  const testFiles = discoverBackendTests(TARGET_DIR);
  if (testFiles.length === 0) {
    console.error('❌ [Backend Tests] 未找到任何 scripts/market-sync/**/*.test.cjs 測試檔！');
    process.exit(1);
  }

  console.log(`🧪 [Backend Tests] 開始執行 ${testFiles.length} 支後端同步測試套件...`);
  const start = Date.now();
  let passed = 0;

  for (const file of testFiles) {
    const rel = path.relative(path.resolve(__dirname, '..'), file).replace(/\\/g, '/');
    console.log(`\n▶ [${passed + 1}/${testFiles.length}] ${rel}`);
    execFileSync(process.execPath, [file], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' },
    });
    passed++;
  }

  const elapsedMs = Date.now() - start;
  console.log(`\n✅ [Backend Tests] ${passed}/${testFiles.length} 支後端測試套件全部通過！(${elapsedMs}ms)`);
}

run();
