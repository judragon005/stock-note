# [SSOT 鏡像檔] 本檔已對齊專案根目錄之權威 Multi-Stage Dockerfile (Spec 0243)
# 建置請優先直接於專案根目錄執行：docker build --platform linux/amd64 -t judragon003/stock-tracker:latest .

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

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json

RUN mkdir -p /app/.scratch/market-cache

VOLUME ["/app/.scratch/market-cache"]
EXPOSE 3000
STOPSIGNAL SIGTERM

HEALTHCHECK --interval=60s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1

CMD ["node", "scripts/nas-server.cjs"]
