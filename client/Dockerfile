# Build the React client and serve it with nginx.
#
#   docker compose up --build
#
# nginx also proxies /api to the api container, so the browser talks to a single origin and
# no CORS configuration is needed in the container setup.

FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json ./
COPY client/package.json ./client/
RUN npm ci

COPY client ./client

WORKDIR /app/client

RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
