FROM node:20-slim
WORKDIR /app

# V7: No Python/GPU needed — MinerU runs via cloud API
COPY package*.json ./
RUN npm ci 2>/dev/null || npm install

COPY . .
RUN npm run build

ENV PORT=7860
ENV NODE_ENV=production

EXPOSE 7860
CMD ["node", "dist/server.js"]
