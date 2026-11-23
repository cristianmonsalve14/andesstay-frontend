# C-01 — build de producción + nginx (SPA) para EC2 :80
# Compatible con andesstay-infra PR #18 (servicio frontend).
# Override:
#   docker build --build-arg ANDESSTAY_API_URL=https://....execute-api....amazonaws.com/prod/api \
#                --build-arg ANDESSTAY_REDIRECT_URI=http://54.211.241.28 \
#                -t andesstay/frontend:latest .

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG ANDESSTAY_API_URL=https://lmv59t05gg.execute-api.us-east-1.amazonaws.com/prod/api
ARG ANDESSTAY_REDIRECT_URI=http://54.211.241.28
RUN sed -i "s|apiUrl: '.*'|apiUrl: '${ANDESSTAY_API_URL}'|" src/environments/environment.prod.ts \
 && sed -i "s|redirectUri: '.*'|redirectUri: '${ANDESSTAY_REDIRECT_URI}'|" src/environments/environment.prod.ts \
 && npm run build -- --configuration=production

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/andesstay-frontend/browser /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1
