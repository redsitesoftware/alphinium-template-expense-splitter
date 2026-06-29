#!/bin/sh
# Start Express API server on port 3001 (explicit to avoid PORT env override from platform)
PORT=3001 node /app/server/index.js &

# Brief pause to let Express bind before nginx starts proxying
sleep 1

# Start nginx in foreground
nginx -g "daemon off;"
