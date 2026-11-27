# Build the API from the repository root, because the npm workspace lockfile lives there.
#
#   docker compose up --build
#
# The image runs the migrations before it starts the server, so a fresh database is ready
# to use on the first request.

FROM node:22-alpine AS deps

WORKDIR /app

# The lockfile belongs to the whole workspace, so every workspace manifest has to be present
# before `npm ci` can run.
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm ci --omit=dev --workspace sweety-server

FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server ./server
COPY server/src ./server/src

WORKDIR /app/server

EXPOSE 4000

USER node

CMD ["node", "src/index.js"]
