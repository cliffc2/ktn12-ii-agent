# KTN12 Agent — Production Dockerfile
# Includes Prisma + SQLite for persistent agent state

ARG BASE_IMAGE=node:20-slim
FROM ${BASE_IMAGE} AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

RUN if ! grep -q "output.*standalone" next.config.js 2>/dev/null && \
       ! grep -q "output.*standalone" next.config.mjs 2>/dev/null; then \
      if [ -f next.config.js ]; then \
        sed -i "s/const nextConfig = {/const nextConfig = {\n  output: 'standalone',/" next.config.js || true; \
      fi; \
    fi

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

RUN mkdir -p public

FROM ${BASE_IMAGE} AS runner

WORKDIR /app

RUN apt-get update -qq && apt-get install -y --no-install-recommends openssl curl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next-build/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next-build/static ./.next-build/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

RUN mkdir -p /app/prisma && chown -R nextjs:nodejs /app/prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/agent/status || exit 1

CMD ["node", "server.js"]
