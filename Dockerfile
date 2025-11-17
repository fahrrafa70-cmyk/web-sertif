# ---------- BUILDER ----------
FROM node:20-alpine AS builder

# Required for sharp
RUN apk add --no-cache \
    python3 make g++ \
    libc6-compat vips-dev

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build


# ---------- RUNNER ----------
FROM node:20-alpine

# Required for sharp runtime
RUN apk add --no-cache vips-dev libc6-compat

WORKDIR /app

COPY --from=builder /app ./

# Set PORT
ENV PORT=3019

EXPOSE 3019

CMD ["npm", "run", "start"]
