#!/bin/sh
# Production deploys apply pending migrations before building. Preview deploys
# never touch the production schema; point them at their own database instead.
set -e
if [ "$VERCEL_ENV" = "production" ]; then
  prisma migrate deploy
fi
next build
