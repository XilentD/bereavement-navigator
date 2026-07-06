FROM node:22-alpine AS builder

WORKDIR /app
COPY api/package.json api/package-lock.json ./
RUN npm ci

COPY api/tsconfig.json ./
COPY api/src/ ./src/
RUN npm run build 2>/dev/null || npx tsc

# Pre-compile all YAML into a single JSON for fast cold start
COPY data/ /tmp/data/
RUN node -e "
const fs = require('fs'), path = require('path'), yaml = require('yaml');
const dir = '/tmp/data/procedures';
const config = {};
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.yaml')) continue;
  const slug = path.basename(f, '.yaml');
  config[slug] = yaml.parse(fs.readFileSync(path.join(dir,f),'utf-8'));
}
fs.writeFileSync('/tmp/config.json', JSON.stringify(config));
console.log('Pre-compiled ' + Object.keys(config).length + ' configs');
"

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
ENV PORT=80

COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /tmp/config.json ./config.json
COPY web/ ./web/

EXPOSE 80

CMD ["node", "dist/server.js"]
