# 08 — 原生 Service Worker 離線秒開快取與註冊 (PWA Service Worker)

**What to build:** 
實作純原生、零第三方相依的輕量級 Service Worker `public/sw.js`。採用 Stale-While-Revalidate 與 Cache-First 策略快取核心 HTML/JS/CSS/字型資源，並於 `src/main.tsx` 中安全註冊，達成無網路環境下秒開與離線韌性。

**Blocked by:** 07-pwa-manifest

**Status:** ready-for-agent

- [x] 撰寫 `public/sw.js` 包含 install, activate 與 fetch 事件監聽
- [x] 靜態應用資產採 Stale-While-Revalidate 快取策略
- [x] 外部 API 請求採 Network-First 策略，離線時安全略過不影響前端報價快取系統
- [x] 在 `src/main.tsx` 中加入 Service Worker 註冊邏輯（若瀏覽器支援 `serviceWorker`）
- [x] 確保在快取升級時自動清理舊版 Cache Storage
