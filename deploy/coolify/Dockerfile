FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev && npm rebuild better-sqlite3
COPY --from=builder /app/dist ./dist
COPY server ./server
USER node
VOLUME ["/app/data"]
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/index.js"]