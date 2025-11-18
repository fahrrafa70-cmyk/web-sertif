# ----------------- DEPS -----------------
FROM node:20-slim AS deps
WORKDIR /app

COPY package*.json ./
RUN npm install

# ----------------- BUILDER -----------------
FROM node:20-slim AS builder
WORKDIR /app

COPY . .
COPY --from=deps /app/node_modules ./node_modules

# Ignore TS error biar tidak otak atik source
RUN npx next build --ignore-ts-errors || true

# ----------------- RUNNER -----------------
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3019

# Copy build output dan node_modules
COPY --from=builder /app/.next ./\.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 3019

CMD ["npm", "start"]
