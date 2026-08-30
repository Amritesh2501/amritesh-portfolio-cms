# syntax=docker/dockerfile:1

# ponytail: one image, full node_modules, no standalone slicing. Migrations and
# seeding both need the Prisma CLI and tsx at runtime, and hand-picking those
# out of a standalone bundle is a pile of fragile COPY lines. Costs a few
# hundred MB. Switch to `output: "standalone"` if image size ever actually bites.

FROM node:22-alpine AS base
# openssl is required by the Prisma engines; libc6-compat by the Next binary.
RUN apk add --no-cache libc6-compat openssl su-exec
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# --- dependencies ------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- build -------------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `prisma generate` reads the schema only. It does NOT need a reachable
# database, so no DATABASE_URL is required at build time.
RUN npx prisma generate

# Neither does `next build`: every page is force-dynamic and the two places
# that read settings during prerender are wrapped in try/catch, so a build with
# no database still succeeds. Verified.
RUN npm run build

# --- runtime -----------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

COPY --from=build --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nextjs:nodejs /app/.next ./.next
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=build --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# STORAGE_DRIVER=local writes here. A container filesystem is ephemeral, so
# mount a volume on this path or set STORAGE_DRIVER=s3. See the README.
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads

# Deliberately NOT "USER nextjs": the entrypoint needs root to chown the
# volume mount, and drops to nextjs with su-exec before starting the server.
# The application process itself never runs as root.
EXPOSE 3000

# /api/health round-trips to Postgres. Pointing this at a page that renders
# without touching the database would report "healthy" while every public page
# returns 500, which is exactly backwards.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3   CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
