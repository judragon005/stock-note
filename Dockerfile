# Stage 1: Build Frontend SPA
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Lightweight NAS Production Runtime (Node 22 native node:sqlite, zero devDeps)
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV TZ=Asia/Taipei
ENV PORT=3000
ENV HOST=0.0.0.0

# 僅複製靜態產物、後端湖倉腳本與台美法定休市日曆 (Spec 0246)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src/data/market-holidays.json ./src/data/market-holidays.json
COPY --from=builder /app/package.json ./package.json

# 預設資料庫目錄對齊 /app/.scratch/market-cache，100% 向後相容 QNAP 既定掛載
# 如需自訂路徑，可在執行時透過環境變數 LAKEHOUSE_DB_PATH 覆寫
RUN mkdir -p /app/.scratch/market-cache

VOLUME ["/app/.scratch/market-cache"]
EXPOSE 3000
STOPSIGNAL SIGTERM

HEALTHCHECK --interval=60s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1

CMD ["node", "scripts/nas-server.cjs"]
