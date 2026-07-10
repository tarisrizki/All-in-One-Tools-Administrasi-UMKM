# ============================================
# Backend Dockerfile — All-in-One Tools Administrasi UMKM
# ============================================

# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies first (leverage Docker cache)
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Production stage
FROM node:24-alpine AS runner

WORKDIR /app

# Copy production dependencies (or just do npm ci --omit=dev)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built code
COPY --from=builder /app/dist ./dist

# Copy migrations (if needed by entrypoint, but usually handled by a separate step or tool)
COPY db/ ./db/

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "start"]
