FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

USER node

EXPOSE 3003

CMD ["node", "--import", "./src/telemetry/instrumentation.js", "src/server.js"]
