FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npx expo export --platform web --output-dir dist
# Inject GA4 into the Metro-generated dist/index.html (Metro ignores web/index.html)
RUN node scripts/inject-ga.js

# Final image: nginx:alpine + nodejs for Express API
FROM nginx:alpine
RUN apk add --no-cache nodejs npm

WORKDIR /app

# Install only express (no Expo/RN native modules)
COPY server ./server
RUN npm install express

# Copy built frontend assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config and validate at build time
COPY nginx.conf /etc/nginx/nginx.conf
RUN nginx -t

# Startup script: Express in background, nginx in foreground
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80
CMD ["/start.sh"]
