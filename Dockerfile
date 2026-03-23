FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including dev for ts compilation at build)
RUN npm ci

# Copy source
COPY src/ ./src/
COPY tsconfig.json ./
COPY mcp-bridge.js ./
COPY .env.example ./.env

# Build TypeScript
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --omit=dev

# HuggingFace Spaces uses port 7860
ENV PORT=7860

EXPOSE 7860

CMD ["node", "dist/server.js"]
