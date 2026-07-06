FROM node:22-alpine AS builder

WORKDIR /app
COPY api/package.json api/package-lock.json ./
RUN npm ci

COPY api/tsconfig.json ./
COPY api/src/ ./src/
RUN npm run build 2>/dev/null || npx tsc

FROM node:22-alpine

WORKDIR /app

# Install Puppeteer deps for PDF generation
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV DATA_DIR=/app/data

COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/node_modules/ ./node_modules/
COPY data/ ./data/
COPY web/ ./web/

EXPOSE 3000

CMD ["node", "dist/server.js"]
