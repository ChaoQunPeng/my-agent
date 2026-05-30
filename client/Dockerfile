FROM node:20-alpine AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.17.1 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Force production builds to call the backend through nginx.
ENV VITE_APP_BASE_URL_DEV=/api
ENV VITE_APP_BASE_API_DEV=/api

RUN pnpm run build

FROM nginx:1.29-alpine

COPY default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
