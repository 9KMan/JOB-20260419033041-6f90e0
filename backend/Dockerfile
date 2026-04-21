FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY . .

EXPOSE 5000

USER node

ENV NODE_ENV=production

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "src/index.js"]