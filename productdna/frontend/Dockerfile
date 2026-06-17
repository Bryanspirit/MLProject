# syntax=docker/dockerfile:1

# --- Build stage: compile the React app -------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Dependency layer: cached unless package files change
COPY package*.json ./
RUN npm ci

COPY . .

# The app talks to the backend through a relative path; nginx proxies it.
# Keeping it relative means the bundle is port-agnostic (no rebuild to change ports).
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
# Build with Vite directly. The package.json "build" script prefixes `tsc`, but
# the project has no tsconfig.json (it has never typechecked), so `tsc` exits
# non-zero. Vite/esbuild transpiles the TS the same way the dev server does.
RUN npx vite build

# --- Serve stage: static files via nginx ------------------------------------
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
