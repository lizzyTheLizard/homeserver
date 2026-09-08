# Mock OIDC provider for the smoke-test stack, built on the maintained
# oidc-provider library (MIT). Serves HTTPS with a startup-generated
# self-signed certificate (node:alpine ships openssl).
FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.mjs ./
EXPOSE 8080
CMD ["node", "server.mjs"]
