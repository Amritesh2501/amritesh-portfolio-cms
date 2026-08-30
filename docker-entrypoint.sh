#!/bin/sh
# Container start: check the environment, migrate, then hand off to the server.
#
# The point of the checks is that a missing variable should say what is missing
# and where to set it, instead of surfacing a Prisma wasm validation dump.
set -e

fail() {
  echo ""
  echo "=============================================================="
  echo " STARTUP FAILED"
  echo "=============================================================="
  echo " $1"
  echo ""
  echo " Set it in your host's environment variables (not in .env,"
  echo " which is gitignored and never reaches the image), then redeploy."
  echo "=============================================================="
  echo ""
  exit 1
}

if [ -z "$DATABASE_URL" ]; then
  fail "DATABASE_URL is not set.

 It must point at a Postgres the CONTAINER can reach. 'localhost' refers
 to the container itself, so a database on your laptop or in a separate
 compose service will not resolve.

   same compose file : postgresql://user:pass@db:5432/portfolio
   managed provider  : the connection string from Neon / Supabase / RDS

 Managed providers usually also want ?sslmode=require on the end."
fi

# A mounted volume arrives owned by root, so the non-root runtime user cannot
# write to it and every upload fails with EACCES. The image cannot fix this at
# build time: the mount replaces whatever the build chowned. So take ownership
# here, while still root, then drop privileges before the server starts.
UPLOAD_DIR="${UPLOAD_DIR:-/app/public/uploads}"
if [ "$(id -u)" = "0" ]; then
  mkdir -p "$UPLOAD_DIR"
  chown -R nextjs:nodejs "$UPLOAD_DIR" 2>/dev/null ||
    echo "> could not chown $UPLOAD_DIR, uploads may fail"
fi

# Migrations read DIRECT_URL. Without a connection pooler it is simply the same
# value, so default it rather than making every deploy set two identical vars.
if [ -z "$DIRECT_URL" ]; then
  export DIRECT_URL="$DATABASE_URL"
  echo "> DIRECT_URL not set, defaulting it to DATABASE_URL"
fi

if [ -z "$AUTH_SECRET" ]; then
  fail "AUTH_SECRET is not set.

 It signs the admin session cookie. Generate one with:
   node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
fi

# The database container often accepts connections a moment after the app
# starts, so a first failure is normal rather than fatal.
echo "> applying migrations"
attempt=0
until npx prisma migrate deploy; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 10 ]; then
    fail "Could not reach the database after 10 attempts.

 DATABASE_URL is set, so the value is probably wrong or the database is
 not reachable from this container. Check the host, the port, the
 credentials, and whether the provider requires ?sslmode=require."
  fi
  echo "  database not ready, retry ${attempt}/10"
  sleep 3
done

# Off by default. Seeding is a one-time action, and running it on every boot
# would quietly resurrect content that was deliberately deleted.
if [ "$SEED_ON_START" = "true" ]; then
  echo "> seeding"
  npx prisma db seed || echo "  seed failed, continuing anyway"
fi

echo "> starting server"

# The application never runs as root. Root was only ever needed to chown the
# volume above; su-exec replaces this shell so signals still reach the server.
if [ "$(id -u)" = "0" ]; then
  exec su-exec nextjs:nodejs "$@"
fi
exec "$@"
