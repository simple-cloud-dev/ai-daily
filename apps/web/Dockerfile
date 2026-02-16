FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/types/package.json packages/types/package.json
RUN npm install

COPY . .
RUN npm run build --workspace @ai-daily/types && npm run build --workspace @ai-daily/web

FROM nginx:alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
