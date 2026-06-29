#!/bin/sh
# Start Express API server in background
node /app/server/index.js &

# Brief pause to let Express bind before nginx starts proxying
sleep 1

# Start nginx in foreground
nginx -g "daemon off;"
