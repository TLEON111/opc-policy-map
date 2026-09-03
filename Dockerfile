# OPC Policy Map —— 生产镜像（多阶段，Next.js standalone）
# 用法：
#   docker build -t opc-policy-map .
#   docker run --rm -p 3000:3000 opc-policy-map
# Node PaaS（Railway/Render/Fly.io）也能直接识别本 Dockerfile；
# 无 Docker 的 Render 原生 Web Service 请改用 render.yaml。

# 1) 依赖
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2) 构建（构建期会读取已提交的 data/ 数据做预渲染）
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3) 运行（最小编制：standalone + 静态资源 + 运行时数据）
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# standalone 运行文件（含 server.js）
COPY --from=builder /app/.next/standalone ./
# 静态资源
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# 运行时 fs 读取的数据（pool/last-report），随镜像打包（CI 每天更新仓库后重建镜像即自动带上）
COPY --from=builder /app/data ./data

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
