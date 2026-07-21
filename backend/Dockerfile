FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm ci --production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/uploads ./uploads
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/server.js"]
