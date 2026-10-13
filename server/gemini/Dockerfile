FROM node:22.23.2-alpine
WORKDIR /app
COPY src/services/contracts.ts src/services/apiProtocol.ts src/services/coachSafety.ts src/services/coach.ts ./src/services/
COPY server/gemini ./server/gemini/
WORKDIR /app/server/gemini
RUN node build.mjs
ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
