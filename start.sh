#!/bin/sh
set -e

# Start Express API server in background
node /app/server/index.js &

# Give Express a moment to bind port 3001
sleep 1

# Start nginx in foreground (keeps container alive)
exec nginx -g "daemon off;"
