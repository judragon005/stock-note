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
ENV LAKEHOUSE_DB_PATH=/data/market_history.db

# 僅複製靜態產物與後端湖倉腳本，大幅縮減映像體積與執行記憶體
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json

RUN mkdir -p /data

VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=60s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1

CMD ["node", "scripts/nas-server.cjs"]
