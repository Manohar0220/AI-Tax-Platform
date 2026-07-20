# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────
# Stage 1 — build the static site with Vite
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies from the lockfile for reproducible builds.
COPY package.json package-lock.json ./
RUN npm ci

# Build the production bundle into /app/dist.
COPY . .
RUN npm run build

# ─────────────────────────────────────────────────────────────
# Stage 2 — serve the static files with nginx
# ─────────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

# SPA-aware nginx config (client-side routing fallback to index.html).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built assets from the build stage.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
