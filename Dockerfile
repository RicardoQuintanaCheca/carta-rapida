# Imagen oficial de Playwright: trae Chromium y todas sus librerías
FROM mcr.microsoft.com/playwright:v1.56.0-noble

WORKDIR /app
ENV NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY . .

EXPOSE 3000
CMD ["node", "index.js"]
