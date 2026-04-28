# syntax=docker/dockerfile:1

ARG NODE_VERSION=22-alpine

########## deps ##########
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

########## build ##########
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

########## runner ##########
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production

# Apply latest security patches + minimal init system
RUN apk update && apk upgrade --no-cache \
    && apk add --no-cache dumb-init

# Runtime does not need package-manager tooling.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
    && rm -f /usr/local/bin/yarn /usr/local/bin/yarnpkg /usr/local/bin/pnpm

# Copy only the standalone Next runtime output.
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Drop root privileges
USER node

EXPOSE 4001

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
