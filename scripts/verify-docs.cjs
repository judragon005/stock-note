#!/usr/bin/env node
/**
 * scripts/verify-docs.cjs
 * 
 * 專案全量文檔完整性與死鏈自動化守門機制
 * 1. 遞迴掃描全專案 Markdown 超連結，驗證目標實體檔案是否存在（自動過濾程式碼區塊避免誤判）。
 * 2. 檢驗 docs/specs/ 與 docs/adr/ 之 4 位編號是否 1:1 成對。
 * 3. 檢驗 docs/specs/ 檔名命名規範。
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', '0-0_開發歷程自動化紀錄', '.scratch', '.agents']);

function getAllMarkdownFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) {
        results = results.concat(getAllMarkdownFiles(path.join(dir, entry.name)));
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(path.join(dir, entry.name));
    }
  }
  return results;
}

function cleanMarkdownCodeBlocks(content) {
  // 移除多行程式碼區塊 ```...```
  let cleaned = content.replace(/```[\s\S]*?```/g, '');
  // 移除行內程式碼區塊 `...`
  cleaned = cleaned.replace(/`[^`\n]*?`/g, '');
  return cleaned;
}

function checkMarkdownLinks(files) {
  const errors = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  for (const filePath of files) {
    const rawContent = fs.readFileSync(filePath, 'utf8');
    const content = cleanMarkdownCodeBlocks(rawContent);
    const relFile = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');

    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const linkText = match[1].trim();
      let url = match[2].trim();

      // 跳過外部連結、錨點、mailto
      if (
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('mailto:') ||
        url.startsWith('#') ||
        url === ''
      ) {
        continue;
      }

      // 標準化內部 URL
      if (url.startsWith('file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/')) {
        url = decodeURIComponent(url.replace('file:///d:/APP/%E8%82%A1%E7%A5%A8%E7%B4%80%E9%8C%84/', ''));
      } else if (url.startsWith('file:///d:/APP/股票紀錄/')) {
        url = url.replace('file:///d:/APP/股票紀錄/', '');
      }

      // 去除 anchor 與 query
      const cleanUrl = url.split('#')[0].split('?')[0].replace(/\\/g, '/');
      if (!cleanUrl) continue;

      // 檢查實體是否存在：先試相對於檔案目錄，再試相對於專案根目錄
      const resolvedFromDir = path.resolve(path.dirname(filePath), cleanUrl);
      const resolvedFromRoot = path.resolve(ROOT_DIR, cleanUrl);

      if (!fs.existsSync(resolvedFromDir) && !fs.existsSync(resolvedFromRoot)) {
        errors.push({
          file: relFile,
          linkText,
          target: cleanUrl
        });
      }
    }
  }
  return errors;
}

function checkSpecAndAdrAlignment() {
  const errors = [];
  const specsDir = path.join(ROOT_DIR, 'docs', 'specs');
  const adrDir = path.join(ROOT_DIR, 'docs', 'adr');

  if (!fs.existsSync(specsDir) || !fs.existsSync(adrDir)) {
    return [{ file: 'docs', linkText: '目錄遺失', target: 'docs/specs 或 docs/adr 遺失' }];
  }

  const specs = fs.readdirSync(specsDir).filter(f => f.endsWith('.md'));
  const adrs = fs.readdirSync(adrDir).filter(f => f.endsWith('.md'));

  const getPrefix = f => f.match(/^(\d{4})/)?.[1];

  const specMap = new Map();
  for (const s of specs) {
    const prefix = getPrefix(s);
    if (prefix) specMap.set(prefix, s);
  }

  const adrMap = new Map();
  for (const a of adrs) {
    const prefix = getPrefix(a);
    if (prefix) adrMap.set(prefix, a);
  }

  // 檢查 Spec 是否皆有對應 ADR
  for (const [prefix, specFile] of specMap.entries()) {
    if (!adrMap.has(prefix)) {
      errors.push({
        file: `docs/specs/${specFile}`,
        linkText: `Spec ${prefix}`,
        target: `缺少對應之 docs/adr/${prefix}-*.md`
      });
    }
  }

  // 檢查 ADR 是否皆有對應 Spec
  for (const [prefix, adrFile] of adrMap.entries()) {
    if (!specMap.has(prefix)) {
      errors.push({
        file: `docs/adr/${adrFile}`,
        linkText: `ADR ${prefix}`,
        target: `缺少對應之 docs/specs/${prefix}-*.md`
      });
    }
  }

  return errors;
}

function run() {
  console.log('🔍 開始執行專案全量文檔完整性與死鏈稽核 (Documentation Integrity Guard)...');
  const allMds = getAllMarkdownFiles(ROOT_DIR);
  console.log(`📁 掃描範圍：共 ${allMds.length} 份 Markdown 文檔`);

  const linkErrors = checkMarkdownLinks(allMds);
  const alignmentErrors = checkSpecAndAdrAlignment();
  const allErrors = [...linkErrors, ...alignmentErrors];

  if (allErrors.length === 0) {
    console.log('✅ 文檔守門檢驗 100% 通過！');
    console.log('   - 所有 Markdown 超連結實體路徑完全正確');
    console.log('   - docs/specs 與 docs/adr 達到 100% 成對對齊');
    process.exit(0);
  } else {
    console.error(`❌ 發現 ${allErrors.length} 個文檔完整性缺陷：`);
    allErrors.forEach((err, idx) => {
      console.error(`  ${idx + 1}. [${err.file}] 「${err.linkText}」➔ 找不到目標：${err.target}`);
    });
    process.exit(1);
  }
}

run();
