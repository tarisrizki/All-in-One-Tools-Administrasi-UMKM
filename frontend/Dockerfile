# ============================================
# Frontend Dockerfile — All-in-One Tools Administrasi UMKM
# ============================================

# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Production stage
FROM node:24-alpine AS runner

WORKDIR /app

# Copy package info
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built code from SvelteKit Node adapter
COPY --from=builder /app/build ./build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "build/index.js"]
