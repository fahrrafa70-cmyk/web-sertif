# ----------------- DEPS -----------------
FROM node:20-slim AS deps
WORKDIR /app

COPY package*.json ./
RUN npm install

# ----------------- BUILDER -----------------
FROM node:20-slim AS builder
WORKDIR /app

COPY . .
COPY --from=deps /app/node_modules ./

# Ignore TypeScript/ESLint errors saat build
RUN npx next build --ignore-ts-errors || true


# ----------------- RUNNER -----------------
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3019

COPY --from=builder /app ./

EXPOSE 3019

CMD ["npm", "start"]
