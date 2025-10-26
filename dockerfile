# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Zależności (cache-friendly)
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Kod źródłowy
COPY . .

# Build produkcyjny (Vite)
RUN npm run build

# ---- runtime stage ----
FROM nginx:1.27-alpine AS runtime
WORKDIR /usr/share/nginx/html

# Konfiguracja Nginx z fallbackiem SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Wrzucamy statyczny build
COPY --from=build /app/dist ./

EXPOSE 80

# Opcjonalny healthcheck (wymaga curl)
RUN apk add --no-cache curl
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
