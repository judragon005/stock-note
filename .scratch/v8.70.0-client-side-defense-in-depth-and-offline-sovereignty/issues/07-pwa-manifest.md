# 07 — PWA Web App Manifest 配置與圖示定義 (PWA Web App Manifest)

**What to build:** 
在 `public/manifest.json` 中配置符合 W3C 標準之 Progressive Web App (PWA) Manifest 檔案，並在 `index.html` 引入。使瀏覽器具備「安裝至桌面/主畫面」能力，並以獨立視窗模式運行。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] 建立 `public/manifest.json`
- [x] 定義應用程式名稱與簡稱（`股票分析儀`）
- [x] 設定 `display: "standalone"`（獨立應用程式視窗，無瀏覽器網址列）
- [x] 設定主題色 `theme_color: "#0f172a"` 與背景色 `background_color: "#0f172a"`
- [x] 配置高解析度向量/多尺寸圖示宣告
- [x] 在 `index.html` 中引入 `<link rel="manifest" href="/manifest.json">`
