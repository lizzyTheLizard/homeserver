# Mock OIDC provider for the smoke-test stack, built on the maintained
# oidc-provider library (MIT). Serves HTTPS with a startup-generated
# self-signed certificate
FROM node:24-alpine
WORKDIR /app
RUN apk add --no-cache ca-certificates openssl
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.mjs ./
EXPOSE 8080
CMD ["node", "server.mjs"]
