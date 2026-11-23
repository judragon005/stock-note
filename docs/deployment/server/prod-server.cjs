/**
 * prod-server.cjs (Deprecated Compatibility Wrapper - Spec 0243 SSOT)
 * 已全面收斂至專案唯一權威生產伺服器：scripts/nas-server.cjs
 * 保留本薄轉發入口以確保舊腳本相容性，啟動時直接委派至 createNasServer 並註冊優雅關機。
 */

const { createNasServer } = require('../../../scripts/nas-server.cjs');
const { getDbPath } = require('../../../scripts/market-sync/sqlite-db-core.cjs');

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';
  const { server, gracefulShutdown } = createNasServer();

  const handleExit = (sig) => {
    const forceTimer = setTimeout(() => process.exit(1), 9000);
    if (typeof forceTimer.unref === 'function') forceTimer.unref();
    gracefulShutdown(sig, { timeoutMs: 8000 })
      .then(() => {
        clearTimeout(forceTimer);
        process.exit(0);
      })
      .catch(() => {
        clearTimeout(forceTimer);
        process.exit(1);
      });
  };

  process.on('SIGTERM', () => handleExit('SIGTERM'));
  process.on('SIGINT', () => handleExit('SIGINT'));

  server.listen(port, host, () => {
    console.log(`🚀 [NAS Server via compat wrapper] 已啟動於 http://${host}:${port} (DB: ${getDbPath()})`);
  });
}

module.exports = { createNasServer };
