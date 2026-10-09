# 採用 Node.js 22 輕量 Alpine 映像檔 (支援原生 node:sqlite)
FROM node:22-alpine

WORKDIR /app

# 設定環境變數：生產模式與台北時區
ENV NODE_ENV=production
ENV TZ=Asia/Taipei

# 複製生產環境執行所需檔案
COPY dist ./dist
COPY scripts ./scripts
COPY docs/deployment/server/prod-server.cjs ./prod-server.cjs
COPY package.json ./package.json

# 建立 SQLite 資料庫預設持久化目錄
RUN mkdir -p .scratch/market-cache

# 暴露服務連接埠
EXPOSE 3000

# 啟動輕量整合伺服器
CMD ["node", "prod-server.cjs"]
