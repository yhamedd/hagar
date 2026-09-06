#!/usr/bin/env bash
# Vercel build entrypoint.
#
# Runs the Drizzle migrations before building, but ONLY for Production
# deployments -- Preview builds share the build pipeline and must never touch
# the production database (and usually have no DATABASE_URL of their own).
set -euo pipefail

if [ "${VERCEL_ENV:-}" = "production" ]; then
  echo "▶ Production deploy: applying database migrations"
  npm run db:migrate
else
  echo "▶ ${VERCEL_ENV:-local} build: skipping migrations"
fi

npm run build
