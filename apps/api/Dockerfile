FROM node:22-alpine AS base
WORKDIR /app

COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/types/package.json packages/types/package.json
RUN npm install

COPY . .
RUN npm run prisma:generate --workspace @ai-daily/api
RUN npm run build --workspace @ai-daily/types && npm run build --workspace @ai-daily/api

EXPOSE 4000
CMD ["npm", "run", "start", "--workspace", "@ai-daily/api"]
