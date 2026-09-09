/**
 * pre-push-guard.cjs
 * GitHub ToS & Anti-Abuse 本地 Pre-push 攔截護欄
 * 
 * 檢查項目：
 * 1. 大檔案防護：阻擋單一檔案超過 50MB，避免違反 GitHub 容量與雲端硬碟濫用條款
 * 2. 機敏資訊防護：阻擋 .env、私鑰、常見 API Token (ghp_, sk-等) 洩漏
 * 3. 本地綠燈驗證：執行 TypeScript 型別檢查與 Vitest 自動化測試，確保 Actions CI 不被當作除錯工具濫用
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const SENSITIVE_EXTENSIONS = ['.pem', '.key', '.pfx', '.p12'];
const SENSITIVE_PATTERNS = [
  /ghp_[0-9a-zA-Z]{36}/,
  /github_pat_[0-9a-zA-Z_]{82}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /AIzaSy[0-9A-Za-z\\-_]{33}/
];

console.log('\n🛡️  [Pre-push Guard] 正在執行 GitHub ToS & 防封號合規檢驗...');

try {
  // 1. 檢查 Git 追蹤檔案之大小與機敏副檔名
  console.log('🔍 [1/3] 掃描儲存庫大檔案 (>50MB) 與機敏檔案...');
  const lsFilesOutput = execSync('git ls-files', { encoding: 'utf-8' });
  const trackedFiles = lsFilesOutput.split(/\r?\n/).filter(Boolean);

  let hasLargeFileError = false;
  for (const file of trackedFiles) {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      if (stats.size > MAX_FILE_SIZE_BYTES) {
        console.error(`❌ [大檔案違規] 檔案 "${file}" 容量 (${(stats.size / 1024 / 1024).toFixed(2)} MB) 超過 GitHub 建議上限 50MB！`);
        console.error(`   👉 請將該檔案移出 Git 追蹤或加入 .gitignore。`);
        hasLargeFileError = true;
      }

      const ext = path.extname(file).toLowerCase();
      if (SENSITIVE_EXTENSIONS.includes(ext) || path.basename(file) === '.env') {
        console.error(`❌ [機敏檔案違規] 檔案 "${file}" 屬於私鑰或環境變數機敏檔案，嚴禁推送到遠端！`);
        hasLargeFileError = true;
      }
    }
  }

  if (hasLargeFileError) {
    process.exit(1);
  }
  console.log('  ✅ 大檔案與機敏檔案檢查通過。');

  // 2. 檢查最近 Commit 是否包含明文 Token
  console.log('🔍 [2/3] 掃描最近提交之 Diff 是否含有明文 API Token...');
  try {
    const diffOutput = execSync('git diff HEAD~1..HEAD', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(diffOutput)) {
        console.error('❌ [金鑰外洩違規] 偵測到即將推送的提交中含有高疑似 API Token 或密鑰字串！');
        console.error('   👉 請使用 git reset 撤銷該提交，將 Token 移入環境變數或 LocalStorage 後再提交。');
        process.exit(1);
      }
    }
  } catch (e) {
    // 若為首次 commit 或無 HEAD~1 則跳過 diff 掃描
  }
  console.log('  ✅ 明文金鑰掃描通過。');

  // 3. 執行 TypeScript 與 Vitest 測試驗證
  console.log('🔍 [3/3] 執行本地型別與單元測試校驗 (確保 CI 不被濫用)...');
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  execSync('npm test', { stdio: 'inherit' });
  console.log('  ✅ 本地型別與單元測試 100% 綠燈通過！');

  console.log('🎉 [Pre-push Guard] 所有防禦檢查通過，核准 Push！\n');
  process.exit(0);

} catch (error) {
  console.error('\n🚨 [Pre-push Guard] 攔截失敗：不符合 GitHub ToS / Anti-Abuse 規範，已終止推送！');
  process.exit(1);
}
