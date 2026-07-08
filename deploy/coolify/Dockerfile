FROM node:22-alpine AS builder
RUN npm install -g pnpm
WORKDIR /app
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init python3 make g++
RUN npm install -g pnpm
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile --omit=dev && pnpm rebuild better-sqlite3
COPY --from=builder /app/dist ./dist
COPY server ./server
USER node
VOLUME ["/app/data"]
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/index.js"]